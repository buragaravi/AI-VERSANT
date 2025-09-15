"""
Unified Test Management API Routes
Handles creation, management, and administration of unified tests
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
import pytz
import logging
from functools import wraps

from config.database import DatabaseConfig
from models_unified_test import (
    UnifiedTest, UnifiedTestSection, UnifiedQuestionSource,
    UNIFIED_TESTS_COLLECTION, UNIFIED_TEST_SECTIONS_COLLECTION,
    UNIFIED_QUESTION_SOURCES_COLLECTION
)
from routes.test_management import require_superadmin

# Initialize blueprint
unified_test_management_bp = Blueprint('unified_test_management', __name__)

# Get database connection
mongo_db = DatabaseConfig.get_database()

# Configure logging
logger = logging.getLogger(__name__)

def require_permission(module, action):
    """Decorator to check user permissions"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # For now, allow all authenticated users
            # TODO: Implement proper permission checking
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@unified_test_management_bp.route('/unified-tests', methods=['GET'])
@jwt_required()
@require_superadmin
def get_all_unified_tests():
    """Get all unified tests with optional filtering"""
    try:
        # Get query parameters
        status = request.args.get('status')
        created_by = request.args.get('created_by')
        campus_id = request.args.get('campus_id')
        course_id = request.args.get('course_id')
        batch_id = request.args.get('batch_id')
        
        # Build query
        query = {}
        if status:
            query['status'] = status
        if created_by:
            query['created_by'] = ObjectId(created_by)
        if campus_id:
            query['campus_ids'] = ObjectId(campus_id)
        if course_id:
            query['course_ids'] = ObjectId(course_id)
        if batch_id:
            query['batch_ids'] = ObjectId(batch_id)
        
        # Fetch tests
        tests = list(mongo_db[UNIFIED_TESTS_COLLECTION].find(query).sort('created_at', -1))
        
        # Convert ObjectIds to strings
        for test in tests:
            test['_id'] = str(test['_id'])
            test['created_by'] = str(test['created_by']) if test.get('created_by') else None
            test['campus_ids'] = [str(cid) for cid in test.get('campus_ids', [])]
            test['course_ids'] = [str(cid) for cid in test.get('course_ids', [])]
            test['batch_ids'] = [str(bid) for bid in test.get('batch_ids', [])]
            
            # Convert section ObjectIds
            for section in test.get('sections', []):
                if 'section_id' in section:
                    section['section_id'] = str(section['section_id'])
        
        return jsonify({
            'success': True,
            'tests': tests,
            'total': len(tests)
        })
        
    except Exception as e:
        logger.error(f"Error fetching unified tests: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch unified tests'
        }), 500

@unified_test_management_bp.route('/unified-tests/<test_id>', methods=['GET'])
@jwt_required()
@require_superadmin
def get_unified_test(test_id):
    """Get a specific unified test by ID"""
    try:
        test = mongo_db[UNIFIED_TESTS_COLLECTION].find_one({'_id': ObjectId(test_id)})
        
        if not test:
            return jsonify({
                'success': False,
                'message': 'Unified test not found'
            }), 404
        
        # Convert ObjectIds to strings
        test['_id'] = str(test['_id'])
        test['created_by'] = str(test['created_by']) if test.get('created_by') else None
        test['campus_ids'] = [str(cid) for cid in test.get('campus_ids', [])]
        test['course_ids'] = [str(cid) for cid in test.get('course_ids', [])]
        test['batch_ids'] = [str(bid) for bid in test.get('batch_ids', [])]
        
        # Convert section ObjectIds
        for section in test.get('sections', []):
            if 'section_id' in section:
                section['section_id'] = str(section['section_id'])
        
        return jsonify({
            'success': True,
            'test': test
        })
        
    except Exception as e:
        logger.error(f"Error fetching unified test {test_id}: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch unified test'
        }), 500

@unified_test_management_bp.route('/unified-tests', methods=['POST'])
@jwt_required()
@require_superadmin
def create_unified_test():
    """Create a new unified test"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['test_name', 'sections']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Create unified test
        test_data = UnifiedTest.create_test(
            test_name=data['test_name'],
            test_description=data.get('test_description', ''),
            total_time_minutes=data.get('total_time_minutes', 120),
            sections=data['sections'],
            campus_ids=data.get('campus_ids', []),
            course_ids=data.get('course_ids', []),
            batch_ids=data.get('batch_ids', []),
            created_by=data.get('created_by'),
            status=data.get('status', 'draft')
        )
        
        # Insert into database
        result = mongo_db[UNIFIED_TESTS_COLLECTION].insert_one(test_data)
        
        if result.inserted_id:
            return jsonify({
                'success': True,
                'message': 'Unified test created successfully',
                'test_id': str(result.inserted_id)
            }), 201
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to create unified test'
            }), 500
            
    except Exception as e:
        logger.error(f"Error creating unified test: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to create unified test'
        }), 500

@unified_test_management_bp.route('/unified-tests/<test_id>', methods=['PUT'])
@jwt_required()
@require_superadmin
def update_unified_test(test_id):
    """Update an existing unified test"""
    try:
        data = request.get_json()
        
        # Check if test exists
        existing_test = mongo_db[UNIFIED_TESTS_COLLECTION].find_one({'_id': ObjectId(test_id)})
        if not existing_test:
            return jsonify({
                'success': False,
                'message': 'Unified test not found'
            }), 404
        
        # Prepare update data
        update_data = {
            'updated_at': datetime.now(pytz.utc)
        }
        
        # Update allowed fields
        allowed_fields = [
            'test_name', 'test_description', 'total_time_minutes',
            'sections', 'campus_ids', 'course_ids', 'batch_ids', 'status'
        ]
        
        for field in allowed_fields:
            if field in data:
                if field in ['campus_ids', 'course_ids', 'batch_ids']:
                    update_data[field] = [ObjectId(id) for id in data[field]]
                else:
                    update_data[field] = data[field]
        
        # Recalculate totals
        if 'sections' in data:
            update_data['total_questions'] = sum(section.get('question_count', 0) for section in data['sections'])
            update_data['total_sections'] = len(data['sections'])
        
        # Update the test
        result = mongo_db[UNIFIED_TESTS_COLLECTION].update_one(
            {'_id': ObjectId(test_id)},
            {'$set': update_data}
        )
        
        if result.modified_count > 0:
            return jsonify({
                'success': True,
                'message': 'Unified test updated successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'No changes made to unified test'
            })
            
    except Exception as e:
        logger.error(f"Error updating unified test {test_id}: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to update unified test'
        }), 500

@unified_test_management_bp.route('/unified-tests/<test_id>', methods=['DELETE'])
@jwt_required()
@require_superadmin
def delete_unified_test(test_id):
    """Delete a unified test"""
    try:
        # Check if test exists
        existing_test = mongo_db[UNIFIED_TESTS_COLLECTION].find_one({'_id': ObjectId(test_id)})
        if not existing_test:
            return jsonify({
                'success': False,
                'message': 'Unified test not found'
            }), 404
        
        # Check if test has attempts
        attempts_count = mongo_db[UNIFIED_TEST_ATTEMPTS_COLLECTION].count_documents({
            'unified_test_id': ObjectId(test_id)
        })
        
        if attempts_count > 0:
            return jsonify({
                'success': False,
                'message': f'Cannot delete test with {attempts_count} attempts. Archive instead.'
            }), 400
        
        # Delete the test
        result = mongo_db[UNIFIED_TESTS_COLLECTION].delete_one({'_id': ObjectId(test_id)})
        
        if result.deleted_count > 0:
            return jsonify({
                'success': True,
                'message': 'Unified test deleted successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to delete unified test'
            })
            
    except Exception as e:
        logger.error(f"Error deleting unified test {test_id}: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to delete unified test'
        }), 500

@unified_test_management_bp.route('/unified-tests/<test_id>/sections', methods=['POST'])
@require_permission('unified_test_management', 'edit_tests')
def add_section_to_test(test_id):
    """Add a new section to a unified test"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['section_name', 'question_count']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Check if test exists
        test = mongo_db[UNIFIED_TESTS_COLLECTION].find_one({'_id': ObjectId(test_id)})
        if not test:
            return jsonify({
                'success': False,
                'message': 'Unified test not found'
            }), 404
        
        # Create new section
        section_data = UnifiedTestSection.create_section(
            section_name=data['section_name'],
            section_description=data.get('section_description', ''),
            time_limit_minutes=data.get('time_limit_minutes', 30),
            question_sources=data.get('question_sources', []),
            question_count=data['question_count'],
            section_order=len(test.get('sections', [])) + 1
        )
        
        # Add section to test
        result = mongo_db[UNIFIED_TESTS_COLLECTION].update_one(
            {'_id': ObjectId(test_id)},
            {
                '$push': {'sections': section_data},
                '$inc': {
                    'total_questions': data['question_count'],
                    'total_sections': 1
                },
                '$set': {'updated_at': datetime.now(pytz.utc)}
            }
        )
        
        if result.modified_count > 0:
            return jsonify({
                'success': True,
                'message': 'Section added successfully',
                'section_id': section_data['section_id']
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to add section'
            })
            
    except Exception as e:
        logger.error(f"Error adding section to test {test_id}: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to add section'
        }), 500

@unified_test_management_bp.route('/question-sources/question-bank', methods=['GET'])
@require_permission('unified_test_management', 'view_questions')
def get_question_bank_questions():
    """Get questions from question bank for unified tests"""
    try:
        # Get query parameters
        module_ids = request.args.getlist('module_ids')
        level_ids = request.args.getlist('level_ids')
        question_types = request.args.getlist('question_types')
        limit = int(request.args.get('limit', 50))
        randomize = request.args.get('randomize', 'false').lower() == 'true'
        
        # Build query
        query = {}
        if module_ids:
            query['module_id'] = {'$in': [ObjectId(mid) for mid in module_ids]}
        if level_ids:
            query['level_id'] = {'$in': [ObjectId(lid) for lid in level_ids]}
        if question_types:
            query['question_type'] = {'$in': question_types}
        
        # Fetch questions
        if randomize:
            # Use aggregation pipeline for random sampling
            pipeline = [{'$match': query}]
            if limit > 0:
                pipeline.append({'$sample': {'size': limit}})
            questions = list(mongo_db.question_bank.aggregate(pipeline))
        else:
            questions = list(mongo_db.question_bank.find(query).limit(limit))
        
        # Convert ObjectIds to strings and format for unified tests
        formatted_questions = []
        for question in questions:
            formatted_question = {
                'id': str(question['_id']),
                'question_text': question.get('question_text', ''),
                'question_type': question.get('question_type', 'MCQ'),
                'options': question.get('options', []),
                'correct_answer': question.get('correct_answer', ''),
                'explanation': question.get('explanation', ''),
                'marks': question.get('marks', 1),
                'module_id': str(question.get('module_id', '')),
                'level_id': str(question.get('level_id', '')),
                'difficulty': question.get('difficulty', 'medium'),
                'source_type': 'question_bank',
                'created_at': question.get('created_at', datetime.now(pytz.utc))
            }
            formatted_questions.append(formatted_question)
        
        return jsonify({
            'success': True,
            'questions': formatted_questions,
            'total': len(formatted_questions)
        })
        
    except Exception as e:
        logger.error(f"Error fetching question bank questions: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch questions'
        }), 500

@unified_test_management_bp.route('/modules', methods=['GET'])
@jwt_required()
@require_superadmin
def get_unified_test_modules():
    """Get available modules for unified test creation"""
    try:
        modules = []
        
        # Define module configurations for Versant and CRT (using correct IDs from existing system)
        module_configs = {
            # Versant modules
            'GRAMMAR': {'name': 'Grammar', 'type': 'mcq', 'category': 'versant'},
            'VOCABULARY': {'name': 'Vocabulary', 'type': 'mcq', 'category': 'versant'},
            'READING': {'name': 'Reading', 'type': 'mcq', 'category': 'versant'},
            'LISTENING': {'name': 'Listening', 'type': 'sentence', 'category': 'versant'},
            'SPEAKING': {'name': 'Speaking', 'type': 'sentence', 'category': 'versant'},
            'WRITING': {'name': 'Writing', 'type': 'paragraph', 'category': 'versant'},
            
            # CRT modules (using correct IDs from existing system)
            'CRT_APTITUDE': {'name': 'Aptitude', 'type': 'mcq', 'category': 'crt'},
            'CRT_TECHNICAL': {'name': 'Technical', 'type': 'technical', 'category': 'crt'},
            'CRT_REASONING': {'name': 'Reasoning', 'type': 'mcq', 'category': 'crt'}
        }
        
        for module_id, config in module_configs.items():
            # Get question count for this module
            count = mongo_db.question_bank.count_documents({'module_id': module_id})
            
            modules.append({
                '_id': module_id,
                'id': module_id,
                'name': config['name'],
                'type': config['type'],
                'category': config['category'],
                'question_count': count
            })
        
        return jsonify({
            'success': True,
            'modules': modules
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching modules: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch modules: {str(e)}'
        }), 500

@unified_test_management_bp.route('/levels', methods=['GET'])
@jwt_required()
@require_superadmin
def get_unified_test_levels():
    """Get available levels for unified test creation"""
    try:
        module_id = request.args.get('module_id')
        
        if not module_id:
            return jsonify({'success': False, 'message': 'module_id is required'}), 400
        
        levels = []
        
        if module_id == 'GRAMMAR':
            # Grammar has specific categories
            grammar_categories = [
                {'id': 'NOUN', 'name': 'Noun'},
                {'id': 'PRONOUN', 'name': 'Pronoun'},
                {'id': 'ADJECTIVE', 'name': 'Adjective'},
                {'id': 'VERB', 'name': 'Verb'},
                {'id': 'ADVERB', 'name': 'Adverb'},
                {'id': 'CONJUNCTION', 'name': 'Conjunction'},
                {'id': 'PREPOSITION', 'name': 'Preposition'},
                {'id': 'INTERJECTION', 'name': 'Interjection'}
            ]
            
            for category in grammar_categories:
                count = mongo_db.question_bank.count_documents({
                    'module_id': module_id,
                    'level_id': category['id']
                })
                levels.append({
                    '_id': category['id'],
                    'id': category['id'],
                    'name': category['name'],
                    'question_count': count
                })
        elif module_id in ['CRT_APTITUDE', 'CRT_TECHNICAL', 'CRT_REASONING']:
            # CRT modules - no levels, return empty array (CRT uses topics instead)
            levels = []
        else:
            # Other modules have standard levels
            standard_levels = [
                {'id': f'{module_id}_BEGINNER', 'name': 'Beginner'},
                {'id': f'{module_id}_INTERMEDIATE', 'name': 'Intermediate'},
                {'id': f'{module_id}_ADVANCED', 'name': 'Advanced'}
            ]
            
            for level in standard_levels:
                count = mongo_db.question_bank.count_documents({
                    'module_id': module_id,
                    'level_id': level['id']
                })
                levels.append({
                    '_id': level['id'],
                    'id': level['id'],
                    'name': level['name'],
                    'question_count': count
                })
        
        return jsonify({
            'success': True,
            'levels': levels
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching levels: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch levels: {str(e)}'
        }), 500

@unified_test_management_bp.route('/crt-topics', methods=['GET'])
@jwt_required()
@require_superadmin
def get_crt_topics():
    """Get CRT topics for unified test creation - reuse existing test management logic"""
    try:
        # Import the existing test management function
        from routes.test_management import get_crt_topics as get_existing_crt_topics
        
        # Call the existing function
        response = get_existing_crt_topics()
        
        if response[1] == 200:  # Success
            data = response[0].get_json()
            topics = data.get('data', [])
            
            return jsonify({
                'success': True,
                'topics': topics
            }), 200
        else:
            return response
            
    except Exception as e:
        logger.error(f"Error fetching CRT topics: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch CRT topics: {str(e)}'
        }), 500

@unified_test_management_bp.route('/crt-topics/<topic_id>/questions', methods=['GET'])
@jwt_required()
@require_superadmin
def get_crt_topic_questions(topic_id):
    """Get questions for a specific CRT topic - reuse existing test management logic"""
    try:
        # Import the existing test management function
        from routes.test_management import get_topic_questions
        
        # Call the existing function
        response = get_topic_questions(topic_id)
        
        if response[1] == 200:  # Success
            data = response[0].get_json()
            questions = data.get('data', [])
            
            return jsonify({
                'success': True,
                'questions': questions,
                'total_count': len(questions)
            }), 200
        else:
            return response
            
    except Exception as e:
        logger.error(f"Error fetching CRT topic questions: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch CRT topic questions: {str(e)}'
        }), 500

@unified_test_management_bp.route('/question-sources/question-bank/stats', methods=['GET'])
@jwt_required()
@require_superadmin
def get_question_bank_stats():
    """Get question bank statistics for unified tests"""
    try:
        # Get module and level statistics
        module_stats = list(mongo_db.question_bank.aggregate([
            {'$group': {
                '_id': '$module_id',
                'count': {'$sum': 1},
                'question_types': {'$addToSet': '$question_type'}
            }},
            {'$lookup': {
                'from': 'modules',
                'localField': '_id',
                'foreignField': '_id',
                'as': 'module_info'
            }},
            {'$unwind': {'path': '$module_info', 'preserveNullAndEmptyArrays': True}},
            {'$project': {
                'module_id': '$_id',
                'module_name': '$module_info.name',
                'count': 1,
                'question_types': 1
            }}
        ]))
        
        level_stats = list(mongo_db.question_bank.aggregate([
            {'$group': {
                '_id': '$level_id',
                'count': {'$sum': 1},
                'question_types': {'$addToSet': '$question_type'}
            }},
            {'$lookup': {
                'from': 'levels',
                'localField': '_id',
                'foreignField': '_id',
                'as': 'level_info'
            }},
            {'$unwind': {'path': '$level_info', 'preserveNullAndEmptyArrays': True}},
            {'$project': {
                'level_id': '$_id',
                'level_name': '$level_info.name',
                'count': 1,
                'question_types': 1
            }}
        ]))
        
        # Convert ObjectIds to strings
        for stat in module_stats + level_stats:
            if '_id' in stat:
                stat['_id'] = str(stat['_id'])
        
        return jsonify({
            'success': True,
            'module_stats': module_stats,
            'level_stats': level_stats,
            'total_questions': mongo_db.question_bank.count_documents({})
        })
        
    except Exception as e:
        logger.error(f"Error fetching question bank stats: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch question bank statistics'
        }), 500

@unified_test_management_bp.route('/question-sources/manual', methods=['POST'])
@require_permission('unified_test_management', 'create_questions')
def create_manual_question():
    """Create a manually entered question"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['question_text', 'question_type']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Create manual question
        question_data = UnifiedQuestionSource.create_manual_question(
            question_text=data['question_text'],
            question_type=data['question_type'],
            options=data.get('options', []),
            correct_answer=data.get('correct_answer'),
            explanation=data.get('explanation'),
            marks=data.get('marks', 1),
            audio_file_url=data.get('audio_file_url'),
            image_url=data.get('image_url')
        )
        
        # Insert into database
        result = mongo_db[UNIFIED_QUESTION_SOURCES_COLLECTION].insert_one(question_data)
        
        if result.inserted_id:
            return jsonify({
                'success': True,
                'message': 'Manual question created successfully',
                'question_id': str(result.inserted_id)
            }), 201
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to create manual question'
            }), 500
            
    except Exception as e:
        logger.error(f"Error creating manual question: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to create manual question'
        }), 500

@unified_test_management_bp.route('/question-sources/upload', methods=['POST'])
@require_permission('unified_test_management', 'upload_questions')
def upload_question_file():
    """Upload and process a question file"""
    try:
        from flask import request
        from werkzeug.utils import secure_filename
        import os
        from utils.question_processor import question_processor
        
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No file provided'
            }), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
        
        # Check file type
        allowed_extensions = {'.txt', '.docx', '.pdf'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            return jsonify({
                'success': False,
                'message': f'File type {file_ext} not supported. Allowed: {", ".join(allowed_extensions)}'
            }), 400
        
        # Create upload directory if it doesn't exist
        upload_dir = 'uploads/question_files'
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        filename = secure_filename(file.filename)
        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)
        
        # Process the file
        result = question_processor.process_uploaded_file(file_path, file.content_type)
        
        if result['success']:
            # Save processed questions to database
            question_docs = []
            for question in result['questions']:
                question_doc = {
                    'source_type': 'uploaded',
                    'file_url': file_path,
                    'detected_question_type': question['question_type'],
                    'question_text': question['question_text'],
                    'options': question.get('options', []),
                    'correct_answer': question['correct_answer'],
                    'marks': question['marks'],
                    'question_number': question.get('question_number', 0),
                    'source_file': question['source_file'],
                    'processing_status': 'completed',
                    'needs_review': question.get('needs_review', False),
                    'created_at': datetime.now(pytz.utc)
                }
                question_docs.append(question_doc)
            
            # Insert questions into database
            if question_docs:
                mongo_db[UNIFIED_QUESTION_SOURCES_COLLECTION].insert_many(question_docs)
            
            # Clean up uploaded file
            try:
                os.remove(file_path)
            except:
                pass  # File cleanup is not critical
            
            return jsonify({
                'success': True,
                'message': 'File processed successfully',
                'total_questions': result['total_questions'],
                'question_types': result['question_types'],
                'questions': result['questions'][:5],  # Return first 5 questions as preview
                'processing_status': 'completed'
            })
        else:
            # Clean up uploaded file on failure
            try:
                os.remove(file_path)
            except:
                pass
            
            return jsonify({
                'success': False,
                'message': f'File processing failed: {result.get("error", "Unknown error")}'
            }), 500
        
    except Exception as e:
        logger.error(f"Error uploading question file: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to upload question file'
        }), 500

@unified_test_management_bp.route('/question-sources/random-questions', methods=['POST'])
@jwt_required()
@require_superadmin
def get_random_questions():
    """Get random questions for unified test creation"""
    try:
        data = request.get_json()
        module_id = data.get('module_id')
        level_id = data.get('level_id')
        topic_id = data.get('topic_id')
        question_count = data.get('question_count', 10)
        question_types = data.get('question_types', [])
        
        # Build query
        query = {}
        if module_id:
            query['module_id'] = module_id
        if level_id:
            query['level_id'] = level_id
        if topic_id:
            query['topic_id'] = ObjectId(topic_id)
        if question_types:
            query['question_type'] = {'$in': question_types}
        
        # Get random questions
        pipeline = [
            {'$match': query},
            {'$sample': {'size': question_count}}
        ]
        
        questions = list(mongo_db.question_bank.aggregate(pipeline))
        
        # Convert ObjectIds to strings
        for question in questions:
            question['_id'] = str(question['_id'])
            question['id'] = question['_id']
        
        return jsonify({
            'success': True,
            'questions': questions,
            'total_found': len(questions),
            'requested_count': question_count
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching random questions: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch random questions: {str(e)}'
        }), 500
