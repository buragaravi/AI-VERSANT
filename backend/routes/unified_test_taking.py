"""
Unified Test Taking API Routes
Handles student test taking, section navigation, and attempt tracking
"""

from flask import Blueprint, request, jsonify
from bson import ObjectId
from datetime import datetime, timedelta
import pytz
import logging
from functools import wraps

from config.database import DatabaseConfig
from models_unified_test import (
    UnifiedTestAttempt, UnifiedTestSectionAttempt,
    UNIFIED_TESTS_COLLECTION, UNIFIED_TEST_ATTEMPTS_COLLECTION,
    UNIFIED_TEST_SECTION_ATTEMPTS_COLLECTION
)

# Initialize blueprint
unified_test_taking_bp = Blueprint('unified_test_taking', __name__)

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

@unified_test_taking_bp.route('/unified-tests/available', methods=['GET'])
@require_permission('unified_test_taking', 'view_tests')
def get_available_unified_tests():
    """Get available unified tests for a student"""
    try:
        # Get query parameters
        student_id = request.args.get('student_id')
        campus_id = request.args.get('campus_id')
        course_id = request.args.get('course_id')
        batch_id = request.args.get('batch_id')
        
        if not student_id:
            return jsonify({
                'success': False,
                'message': 'Student ID is required'
            }), 400
        
        # Build query for available tests
        query = {
            'status': 'active',
            '$or': [
                {'campus_ids': ObjectId(campus_id)} if campus_id else {},
                {'course_ids': ObjectId(course_id)} if course_id else {},
                {'batch_ids': ObjectId(batch_id)} if batch_id else {}
            ]
        }
        
        # Remove empty conditions
        query['$or'] = [condition for condition in query['$or'] if condition]
        if not query['$or']:
            del query['$or']
        
        # Fetch available tests
        tests = list(mongo_db[UNIFIED_TESTS_COLLECTION].find(query).sort('created_at', -1))
        
        # Check for existing attempts
        test_ids = [test['_id'] for test in tests]
        existing_attempts = list(mongo_db[UNIFIED_TEST_ATTEMPTS_COLLECTION].find({
            'student_id': ObjectId(student_id),
            'unified_test_id': {'$in': test_ids}
        }))
        
        # Create attempt lookup
        attempt_lookup = {attempt['unified_test_id']: attempt for attempt in existing_attempts}
        
        # Process tests and add attempt status
        for test in tests:
            test['_id'] = str(test['_id'])
            test['created_by'] = str(test['created_by']) if test.get('created_by') else None
            test['campus_ids'] = [str(cid) for cid in test.get('campus_ids', [])]
            test['course_ids'] = [str(cid) for cid in test.get('course_ids', [])]
            test['batch_ids'] = [str(bid) for bid in test.get('batch_ids', [])]
            
            # Add attempt status
            attempt = attempt_lookup.get(test['_id'])
            if attempt:
                test['attempt_status'] = attempt['status']
                test['attempt_id'] = str(attempt['_id'])
                test['started_at'] = attempt.get('started_at')
                test['submitted_at'] = attempt.get('submitted_at')
            else:
                test['attempt_status'] = 'not_started'
                test['attempt_id'] = None
                test['started_at'] = None
                test['submitted_at'] = None
            
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
        logger.error(f"Error fetching available unified tests: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch available tests'
        }), 500

@unified_test_taking_bp.route('/unified-tests/<test_id>/start', methods=['POST'])
@require_permission('unified_test_taking', 'take_tests')
def start_unified_test(test_id):
    """Start a unified test attempt"""
    try:
        data = request.get_json()
        student_id = data.get('student_id')
        
        if not student_id:
            return jsonify({
                'success': False,
                'message': 'Student ID is required'
            }), 400
        
        # Check if test exists and is active
        test = mongo_db[UNIFIED_TESTS_COLLECTION].find_one({'_id': ObjectId(test_id)})
        if not test:
            return jsonify({
                'success': False,
                'message': 'Test not found'
            }), 404
        
        if test['status'] != 'active':
            return jsonify({
                'success': False,
                'message': 'Test is not available'
            }), 400
        
        # Check for existing attempt
        existing_attempt = mongo_db[UNIFIED_TEST_ATTEMPTS_COLLECTION].find_one({
            'student_id': ObjectId(student_id),
            'unified_test_id': ObjectId(test_id)
        })
        
        if existing_attempt:
            if existing_attempt['status'] == 'completed':
                return jsonify({
                    'success': False,
                    'message': 'Test already completed'
                }), 400
            elif existing_attempt['status'] == 'in_progress':
                return jsonify({
                    'success': True,
                    'message': 'Test already in progress',
                    'attempt_id': str(existing_attempt['_id']),
                    'test': test
                })
        
        # Create new attempt
        attempt_data = UnifiedTestAttempt.create_attempt(
            student_id=student_id,
            unified_test_id=test_id,
            status='in_progress'
        )
        
        # Insert attempt
        result = mongo_db[UNIFIED_TEST_ATTEMPTS_COLLECTION].insert_one(attempt_data)
        
        if result.inserted_id:
            # Convert test ObjectIds to strings
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
                'message': 'Test started successfully',
                'attempt_id': str(result.inserted_id),
                'test': test
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to start test'
            }), 500
            
    except Exception as e:
        logger.error(f"Error starting unified test {test_id}: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to start test'
        }), 500

@unified_test_taking_bp.route('/unified-tests/<test_id>/sections/<section_id>/questions', methods=['GET'])
@require_permission('unified_test_taking', 'take_tests')
def get_section_questions(test_id, section_id):
    """Get questions for a specific section"""
    try:
        # Get query parameters
        student_id = request.args.get('student_id')
        attempt_id = request.args.get('attempt_id')
        
        if not student_id or not attempt_id:
            return jsonify({
                'success': False,
                'message': 'Student ID and Attempt ID are required'
            }), 400
        
        # Verify attempt exists and belongs to student
        attempt = mongo_db[UNIFIED_TEST_ATTEMPTS_COLLECTION].find_one({
            '_id': ObjectId(attempt_id),
            'student_id': ObjectId(student_id),
            'unified_test_id': ObjectId(test_id)
        })
        
        if not attempt:
            return jsonify({
                'success': False,
                'message': 'Invalid attempt'
            }), 400
        
        # Get test and section details
        test = mongo_db[UNIFIED_TESTS_COLLECTION].find_one({'_id': ObjectId(test_id)})
        if not test:
            return jsonify({
                'success': False,
                'message': 'Test not found'
            }), 404
        
        # Find the specific section
        section = None
        for s in test.get('sections', []):
            if s.get('section_id') == section_id:
                section = s
                break
        
        if not section:
            return jsonify({
                'success': False,
                'message': 'Section not found'
            }), 404
        
        # Fetch questions based on section's question sources
        questions = []
        
        for question_source in section.get('question_sources', []):
            source_type = question_source.get('source_type')
            question_count = question_source.get('question_count', 0)
            
            if source_type == 'question_bank':
                # Fetch from question bank
                query = {}
                if question_source.get('module_ids'):
                    query['module_id'] = {'$in': [ObjectId(mid) for mid in question_source['module_ids']]}
                if question_source.get('level_ids'):
                    query['level_id'] = {'$in': [ObjectId(lid) for lid in question_source['level_ids']]}
                if question_source.get('question_types'):
                    query['question_type'] = {'$in': question_source['question_types']}
                
                # Fetch questions
                if question_source.get('randomize', False):
                    pipeline = [{'$match': query}, {'$sample': {'size': question_count}}]
                    bank_questions = list(mongo_db.question_bank.aggregate(pipeline))
                else:
                    bank_questions = list(mongo_db.question_bank.find(query).limit(question_count))
                
                # Format questions for unified test
                for q in bank_questions:
                    formatted_question = {
                        'id': str(q['_id']),
                        'question_text': q.get('question_text', ''),
                        'question_type': q.get('question_type', 'MCQ'),
                        'options': q.get('options', []),
                        'correct_answer': q.get('correct_answer', ''),
                        'explanation': q.get('explanation', ''),
                        'marks': q.get('marks', 1),
                        'source_type': 'question_bank',
                        'module_id': str(q.get('module_id', '')),
                        'level_id': str(q.get('level_id', ''))
                    }
                    questions.append(formatted_question)
            
            elif source_type == 'manual':
                # Fetch manual questions
                manual_questions = list(mongo_db[UNIFIED_QUESTION_SOURCES_COLLECTION].find({
                    'source_type': 'manual',
                    'section_id': section_id
                }).limit(question_count))
                
                for q in manual_questions:
                    formatted_question = {
                        'id': str(q['_id']),
                        'question_text': q.get('question_text', ''),
                        'question_type': q.get('question_type', 'MCQ'),
                        'options': q.get('options', []),
                        'correct_answer': q.get('correct_answer', ''),
                        'explanation': q.get('explanation', ''),
                        'marks': q.get('marks', 1),
                        'source_type': 'manual'
                    }
                    questions.append(formatted_question)
            
            elif source_type == 'uploaded':
                # Fetch uploaded questions
                uploaded_questions = list(mongo_db[UNIFIED_QUESTION_SOURCES_COLLECTION].find({
                    'source_type': 'uploaded',
                    'section_id': section_id
                }).limit(question_count))
                
                for q in uploaded_questions:
                    formatted_question = {
                        'id': str(q['_id']),
                        'question_text': q.get('question_text', ''),
                        'question_type': q.get('detected_question_type', 'MCQ'),
                        'options': q.get('options', []),
                        'correct_answer': q.get('correct_answer', ''),
                        'marks': q.get('marks', 1),
                        'source_type': 'uploaded',
                        'source_file': q.get('source_file', '')
                    }
                    questions.append(formatted_question)
        
        # Shuffle questions if needed
        if section.get('randomize_questions', False):
            import random
            random.shuffle(questions)
        
        return jsonify({
            'success': True,
            'section': section,
            'questions': questions,
            'total_questions': section.get('question_count', 0)
        })
        
    except Exception as e:
        logger.error(f"Error fetching section questions: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch section questions'
        }), 500

@unified_test_taking_bp.route('/unified-tests/<test_id>/sections/<section_id>/submit', methods=['POST'])
@require_permission('unified_test_taking', 'take_tests')
def submit_section(test_id, section_id):
    """Submit answers for a specific section"""
    try:
        data = request.get_json()
        student_id = data.get('student_id')
        attempt_id = data.get('attempt_id')
        answers = data.get('answers', [])
        
        if not student_id or not attempt_id:
            return jsonify({
                'success': False,
                'message': 'Student ID and Attempt ID are required'
            }), 400
        
        # Verify attempt exists
        attempt = mongo_db[UNIFIED_TEST_ATTEMPTS_COLLECTION].find_one({
            '_id': ObjectId(attempt_id),
            'student_id': ObjectId(student_id),
            'unified_test_id': ObjectId(test_id)
        })
        
        if not attempt:
            return jsonify({
                'success': False,
                'message': 'Invalid attempt'
            }), 400
        
        # Calculate section score
        section_score = 0
        total_marks = 0
        questions_attempted = []
        
        # Get the section details to fetch correct answers
        test = mongo_db[UNIFIED_TESTS_COLLECTION].find_one({'_id': ObjectId(test_id)})
        section = None
        for s in test.get('sections', []):
            if s.get('section_id') == section_id:
                section = s
                break
        
        if not section:
            return jsonify({
                'success': False,
                'message': 'Section not found'
            }), 404
        
        # Fetch questions to get correct answers
        questions = []
        for question_source in section.get('question_sources', []):
            source_type = question_source.get('source_type')
            question_count = question_source.get('question_count', 0)
            
            if source_type == 'question_bank':
                query = {}
                if question_source.get('module_ids'):
                    query['module_id'] = {'$in': [ObjectId(mid) for mid in question_source['module_ids']]}
                if question_source.get('level_ids'):
                    query['level_id'] = {'$in': [ObjectId(lid) for lid in question_source['level_ids']]}
                if question_source.get('question_types'):
                    query['question_type'] = {'$in': question_source['question_types']}
                
                bank_questions = list(mongo_db.question_bank.find(query).limit(question_count))
                for q in bank_questions:
                    questions.append({
                        'id': str(q['_id']),
                        'correct_answer': q.get('correct_answer', ''),
                        'marks': q.get('marks', 1)
                    })
        
        # Calculate scores
        for question_id, student_answer in answers.items():
            # Find the question to get correct answer and marks
            question = next((q for q in questions if q['id'] == question_id), None)
            if question:
                is_correct = str(student_answer).strip().lower() == str(question['correct_answer']).strip().lower()
                marks_earned = question['marks'] if is_correct else 0
                
                section_score += marks_earned
                total_marks += question['marks']
                
                questions_attempted.append({
                    'question_id': question_id,
                    'student_answer': student_answer,
                    'correct_answer': question['correct_answer'],
                    'is_correct': is_correct,
                    'marks_earned': marks_earned,
                    'total_marks': question['marks']
                })
        
        # Update section attempt
        section_attempt = {
            'section_id': section_id,
            'questions_attempted': questions_attempted,
            'section_score': section_score,
            'section_marks': total_marks,
            'time_spent_minutes': 0,  # TODO: Calculate actual time spent
            'status': 'completed',
            'started_at': datetime.now(pytz.utc),
            'completed_at': datetime.now(pytz.utc)
        }
        
        # Update the main attempt with section results
        mongo_db[UNIFIED_TEST_ATTEMPTS_COLLECTION].update_one(
            {'_id': ObjectId(attempt_id)},
            {
                '$push': {'section_attempts': section_attempt},
                '$inc': {
                    'total_score': section_score,
                    'total_marks': total_marks
                }
            }
        )
        
        return jsonify({
            'success': True,
            'message': 'Section submitted successfully',
            'section_score': section_score,
            'section_marks': total_marks,
            'questions_attempted': len(questions_attempted)
        })
        
    except Exception as e:
        logger.error(f"Error submitting section: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to submit section'
        }), 500

@unified_test_taking_bp.route('/unified-tests/<test_id>/submit', methods=['POST'])
@require_permission('unified_test_taking', 'take_tests')
def submit_unified_test(test_id):
    """Submit the entire unified test"""
    try:
        data = request.get_json()
        student_id = data.get('student_id')
        attempt_id = data.get('attempt_id')
        
        if not student_id or not attempt_id:
            return jsonify({
                'success': False,
                'message': 'Student ID and Attempt ID are required'
            }), 400
        
        # Verify attempt exists
        attempt = mongo_db[UNIFIED_TEST_ATTEMPTS_COLLECTION].find_one({
            '_id': ObjectId(attempt_id),
            'student_id': ObjectId(student_id),
            'unified_test_id': ObjectId(test_id)
        })
        
        if not attempt:
            return jsonify({
                'success': False,
                'message': 'Invalid attempt'
            }), 400
        
        # Update attempt status to completed
        result = mongo_db[UNIFIED_TEST_ATTEMPTS_COLLECTION].update_one(
            {'_id': ObjectId(attempt_id)},
            {
                '$set': {
                    'status': 'completed',
                    'submitted_at': datetime.now(pytz.utc)
                }
            }
        )
        
        if result.modified_count > 0:
            return jsonify({
                'success': True,
                'message': 'Test submitted successfully',
                'total_score': attempt.get('total_score', 0),
                'total_marks': attempt.get('total_marks', 0)
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to submit test'
            }), 500
            
    except Exception as e:
        logger.error(f"Error submitting unified test: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to submit test'
        }), 500

@unified_test_taking_bp.route('/unified-tests/<test_id>/attempts/<attempt_id>', methods=['GET'])
@require_permission('unified_test_taking', 'view_attempts')
def get_attempt_details(test_id, attempt_id):
    """Get details of a specific attempt"""
    try:
        # Get query parameters
        student_id = request.args.get('student_id')
        
        if not student_id:
            return jsonify({
                'success': False,
                'message': 'Student ID is required'
            }), 400
        
        # Get attempt details
        attempt = mongo_db[UNIFIED_TEST_ATTEMPTS_COLLECTION].find_one({
            '_id': ObjectId(attempt_id),
            'student_id': ObjectId(student_id),
            'unified_test_id': ObjectId(test_id)
        })
        
        if not attempt:
            return jsonify({
                'success': False,
                'message': 'Attempt not found'
            }), 404
        
        # Convert ObjectIds to strings
        attempt['_id'] = str(attempt['_id'])
        attempt['student_id'] = str(attempt['student_id'])
        attempt['unified_test_id'] = str(attempt['unified_test_id'])
        
        # Convert section attempt ObjectIds
        for section_attempt in attempt.get('section_attempts', []):
            if 'section_id' in section_attempt:
                section_attempt['section_id'] = str(section_attempt['section_id'])
        
        return jsonify({
            'success': True,
            'attempt': attempt
        })
        
    except Exception as e:
        logger.error(f"Error fetching attempt details: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch attempt details'
        }), 500
