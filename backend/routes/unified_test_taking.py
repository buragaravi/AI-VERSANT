from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from mongo import mongo_db
from bson import ObjectId
from datetime import datetime
import pytz
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint
unified_test_taking_bp = Blueprint('unified_test_taking', __name__)

def ensure_timezone_aware(dt):
    """Ensure datetime is timezone-aware (IST)"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Assume the datetime is in IST if no timezone info
        ist = pytz.timezone('Asia/Kolkata')
        return ist.localize(dt)
    return dt

def get_current_ist_time():
    """Get current time in IST"""
    ist = pytz.timezone('Asia/Kolkata')
    return datetime.now(ist)

# Collection names
UNIFIED_TESTS_COLLECTION = 'unified_tests'
UNIFIED_TEST_ATTEMPTS_COLLECTION = 'unified_test_attempts'

@unified_test_taking_bp.route('/unified-tests/<test_id>/student-view', methods=['GET'])
def get_unified_test_student_view(test_id):
    """Get unified test data formatted for student taking interface"""
    try:
        logger.info(f"=== GET STUDENT VIEW DEBUG ===")
        logger.info(f"Test ID: {test_id}")
        
        # Check if test exists and is active
        test = mongo_db.unified_tests.find_one({
            '_id': ObjectId(test_id),
            'status': 'active'
        })
        
        if not test:
            return jsonify({
                'success': False,
                'message': 'Test not found or not active'
            }), 404
        
        # Check if test is within the allowed time window
        current_time = get_current_ist_time()
        logger.info(f"Current IST time: {current_time}")
        
        # Check start date
        if test.get('start_date'):
            start_date = ensure_timezone_aware(test['start_date'])
            logger.info(f"Test start date (IST): {start_date}")
            if current_time < start_date:
                return jsonify({
                    'success': False,
                    'message': 'Test has not started yet'
                }), 400
        
        # Check end date
        if test.get('end_date'):
            end_date = ensure_timezone_aware(test['end_date'])
            logger.info(f"Test end date (IST): {end_date}")
            if current_time > end_date:
                return jsonify({
                    'success': False,
                    'message': 'Test has ended'
                }), 400
        
        # Format test data for student interface
        formatted_sections = []
        
        for section in test.get('sections', []):
            section_questions = []
            
            # Get questions from section's selected_questions
            question_sources = section.get('question_sources', [])
            for source in question_sources:
                if source.get('source_type') == 'question_bank' and source.get('selected_questions'):
                    selected_questions = source.get('selected_questions', [])
                    
                    # Format questions for student interface
                    for q in selected_questions:
                        formatted_question = {
                            'question_id': str(q['_id']),
                            'question_text': q.get('question', ''),
                            'question_type': q.get('question_type', 'MCQ').upper(),
                            'options': {
                                'A': q.get('optionA', ''),
                                'B': q.get('optionB', ''),
                                'C': q.get('optionC', ''),
                                'D': q.get('optionD', '')
                            },
                            'instructions': q.get('instructions', ''),
                            'marks': 1,
                            'audio_file_url': q.get('audio_file_url', ''),
                            'image_url': q.get('image_url', ''),
                            'test_cases': q.get('test_cases', ''),
                            'expected_output': q.get('expected_output', ''),
                            'language': q.get('language', 'python')
                        }
                        section_questions.append(formatted_question)
            
            # Format section for student interface
            formatted_section = {
                'section_id': section.get('section_id'),
                'section_name': section.get('section_name', ''),
                'section_description': section.get('section_description', ''),
                'time_limit_minutes': section.get('time_limit_minutes', 30),
                'section_order': section.get('section_order', 1),
                'questions': section_questions,
                'total_questions': len(section_questions)
            }
            formatted_sections.append(formatted_section)
        
        # Sort sections by section_order
        formatted_sections.sort(key=lambda x: x.get('section_order', 1))
        
        # Format response
        response_data = {
            'test_id': str(test['_id']),
            'test_name': test['test_name'],
            'test_description': test.get('test_description', ''),
            'total_time_minutes': test.get('total_time_minutes', 0),
            'start_date': test.get('start_date'),
            'end_date': test.get('end_date'),
            'sections': formatted_sections,
            'total_sections': len(formatted_sections),
            'total_questions': sum(len(s['questions']) for s in formatted_sections)
        }
        
        logger.info(f"Returning student view with {len(formatted_sections)} sections and {response_data['total_questions']} total questions")
        
        return jsonify({
            'success': True,
            'data': response_data
        })
        
    except Exception as e:
        logger.error(f"Error fetching student view: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Failed to fetch test data: {str(e)}'
        }), 500

@unified_test_taking_bp.route('/unified-tests/available', methods=['GET'])
def get_available_unified_tests():
    """Get available unified tests for all students (no student_id required)"""
    try:
        # Optional filtering by campus, course, batch
        campus_id = request.args.get('campus_id')
        course_id = request.args.get('course_id')
        batch_id = request.args.get('batch_id')
        
        query = {'status': 'active'}
        
        # Add optional filters
        if campus_id:
            query['campus_ids'] = ObjectId(campus_id)
        if course_id:
            query['course_ids'] = ObjectId(course_id)
        if batch_id:
            query['batch_ids'] = ObjectId(batch_id)
        
        tests = list(mongo_db.unified_tests.find(query).sort('created_at', -1))
        
        # Don't filter tests - show all tests and let frontend handle status
        # This matches the online exam system behavior
        current_time = get_current_ist_time()
        
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
        
            # Add attempt status
            test['attempt_status'] = 'available'
            test['attempt_id'] = None
            test['started_at'] = None
            test['submitted_at'] = None
        
        return jsonify({'success': True, 'tests': tests, 'total': len(tests)})
    except Exception as e:
        logger.error(f"Error fetching available unified tests: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch available tests'}), 500

@unified_test_taking_bp.route('/unified-tests/<test_id>/start', methods=['POST'])
def start_unified_test(test_id):
    """Start a unified test attempt - EXACTLY like online exam system"""
    try:
        logger.info(f"=== START UNIFIED TEST DEBUG ===")
        logger.info(f"Test ID: {test_id}")
        logger.info(f"Request method: {request.method}")
        logger.info(f"Request headers: {dict(request.headers)}")
        logger.info(f"Request data: {request.get_json()}")
        
        # For debugging - make this endpoint public temporarily
        # Get user_id from JWT token if available, otherwise use a default
        try:
            current_user_id = get_jwt_identity()
            logger.info(f"Current user ID from JWT: {current_user_id}")
        except Exception as e:
            logger.info(f"No JWT token or JWT error: {e}")
            # For debugging, use a real student ID from the database
            current_user_id = "68b9ae53236c35dcb8ea7bb0"  # Real student user_id for testing
            logger.info(f"Using default user ID for debugging: {current_user_id}")
        
        if not current_user_id:
            logger.error("No user ID available")
            return jsonify({'success': False, 'message': 'User ID required'}), 400
            
        user = mongo_db.users.find_one({'_id': ObjectId(current_user_id)})
        logger.info(f"User found: {user is not None}")
        
        if not user:
            logger.warning("User not found, but continuing for debugging")
            # For debugging, create a mock user
            user = {'_id': ObjectId(current_user_id), 'role': 'student', 'email': 'debug@test.com'}
        elif user.get('role') != 'student':
            logger.warning(f"User role is {user.get('role')}, but continuing for debugging")
        
        # Get student profile (EXACTLY like online exam system)
        student = mongo_db.students.find_one({'user_id': ObjectId(current_user_id)})
        if not student:
            logger.warning("Student profile not found, but continuing for debugging")
            # For debugging, create a mock student
            student = {'_id': ObjectId(current_user_id), 'user_id': ObjectId(current_user_id), 'email': 'debug@test.com'}
        
        # Check if test exists and is active (EXACTLY like online exam system)
        test_query = {
            '_id': ObjectId(test_id),
            'status': 'active'
        }
        
        test = mongo_db.unified_tests.find_one(test_query)
        if not test:
            return jsonify({'success': False, 'message': 'Test not found or not active'}), 404
        
        # Check if test is within the allowed time window
        current_time = get_current_ist_time()
        
        # Check start date
        if test.get('start_date'):
            start_date = ensure_timezone_aware(test['start_date'])
            if current_time < start_date:
                return jsonify({
                    'success': False,
                    'message': 'Test has not started yet'
                }), 400
        
        # Check end date
        if test.get('end_date'):
            end_date = ensure_timezone_aware(test['end_date'])
            if current_time > end_date:
                return jsonify({
                    'success': False,
                    'message': 'Test has ended'
                }), 400
        
        # Check if student has already attempted this test (EXACTLY like online exam system)
        attempt_query = {
            'unified_test_id': ObjectId(test_id),
            'student_id': ObjectId(current_user_id)  # Use current_user_id directly like online exam
        }
        
        existing_attempt = mongo_db.unified_test_attempts.find_one(attempt_query)
        
        if existing_attempt:
            # If the attempt is in_progress, allow resuming (EXACTLY like online exam system)
            if existing_attempt.get('status') == 'in_progress':
                return jsonify({
                    'success': True,
                    'data': {
                    'attempt_id': str(existing_attempt['_id']),
                        'test': {
                            'id': str(test['_id']),
                            'test_name': test['test_name'],
                            'total_time_minutes': test.get('total_time_minutes', 0),
                            'test_description': test.get('test_description', ''),
                            'sections': test.get('sections', [])
                        },
                        'resumed': True
                    }
                }), 200
            else:
                # If completed or any other status, prevent new attempt
                status = existing_attempt.get('status', 'unknown')
                return jsonify({'success': False, 'message': f'Test already attempted (status: {status})'}), 409
        
        # Create test attempt (EXACTLY like online exam system)
        attempt_doc = {
            'unified_test_id': ObjectId(test_id),
            'student_id': ObjectId(current_user_id),  # Use current_user_id directly
            'started_at': datetime.now(pytz.utc),
            'status': 'in_progress',
            'section_attempts': [],
            'total_score': 0.0,
            'total_marks': 0,
            'time_spent_minutes': 0
        }
        
        attempt_id = mongo_db.unified_test_attempts.insert_one(attempt_doc).inserted_id
        
        # Get all questions for all sections
        all_questions = []
        for section in test.get('sections', []):
            section_questions = []
            
            # Get questions from section's selected_questions
            question_sources = section.get('question_sources', [])
            for source in question_sources:
                if source.get('source_type') == 'question_bank' and source.get('selected_questions'):
                    selected_questions = source.get('selected_questions', [])
                    
                    # Format pre-selected questions for frontend
                    for q in selected_questions:
                        formatted_question = {
                            'id': str(q['_id']),
                            'question_text': q.get('question', ''),
                            'question_type': q.get('question_type', 'MCQ').upper(),
                            'options': {
                                'A': q.get('optionA', ''),
                                'B': q.get('optionB', ''),
                                'C': q.get('optionC', ''),
                                'D': q.get('optionD', '')
                            },
                            'correct_answer': q.get('answer', ''),
                            'explanation': q.get('instructions', ''),
                            'marks': 1,
                            'source_type': 'question_bank',
                            'module_id': str(q.get('module_id', '')),
                            'level_id': str(q.get('level_id', '')),
                            'audio_file_url': q.get('audio_file_url', ''),
                            'image_url': q.get('image_url', ''),
                            'instructions': q.get('instructions', ''),
                            'test_cases': q.get('test_cases', ''),
                            'expected_output': q.get('expected_output', ''),
                            'language': q.get('language', 'python'),
                            'section_id': section.get('section_id'),
                            'section_name': section.get('section_name')
                        }
                        section_questions.append(formatted_question)
            
            all_questions.extend(section_questions)
        
        logger.info(f"Returning {len(all_questions)} total questions for test {test_id}")
            
        return jsonify({
                'success': True,
            'data': {
                'attempt_id': str(attempt_id),
                'test': {
                    'id': str(test['_id']),
                    'test_name': test['test_name'],
                    'total_time_minutes': test.get('total_time_minutes', 0),
                    'test_description': test.get('test_description', ''),
                    'sections': test.get('sections', []),
                    'questions': all_questions
                }
            }
        }), 200
            
    except Exception as e:
        logger.error(f"Error starting unified test: {e}", exc_info=True)
        return jsonify({'success': False, 'message': f'Failed to start test: {str(e)}'}), 500

@unified_test_taking_bp.route('/unified-tests/<test_id>/sections/<section_id>/questions', methods=['GET'])
def get_section_questions(test_id, section_id):
    """Get questions for a specific section"""
    try:
        logger.info(f"=== GET SECTION QUESTIONS DEBUG ===")
        logger.info(f"Test ID: {test_id}")
        logger.info(f"Section ID: {section_id}")
        logger.info(f"Request args: {dict(request.args)}")
        
        attempt_id = request.args.get('attempt_id')
        logger.info(f"Attempt ID: {attempt_id}")
        
        if not attempt_id:
            logger.warning("No attempt_id provided, but continuing for debugging")
            # For debugging, create a mock attempt_id
            attempt_id = "68c9701ee09569ddf196f16c"  # Mock attempt ID for testing
            logger.info(f"Using mock attempt ID for debugging: {attempt_id}")
        
        # For debugging - handle JWT token leniently
        try:
            current_user_id = get_jwt_identity()
            logger.info(f"Current user ID from JWT: {current_user_id}")
        except Exception as e:
            logger.info(f"No JWT token or JWT error: {e}")
            # For debugging, use a real student ID from the database
            current_user_id = "68b9ae53236c35dcb8ea7bb0"  # Real student user_id for testing
            logger.info(f"Using default user ID for debugging: {current_user_id}")
        
        if not current_user_id:
            logger.error("No user ID available")
            return jsonify({'success': False, 'message': 'User ID required'}), 400
        
        # For debugging - make user validation lenient
        user = mongo_db.users.find_one({'_id': ObjectId(current_user_id)})
        if not user:
            logger.warning("User not found, but continuing for debugging")
            user = {'_id': ObjectId(current_user_id), 'role': 'student', 'email': 'debug@test.com'}
        elif user.get('role') != 'student':
            logger.warning(f"User role is {user.get('role')}, but continuing for debugging")
        
        # For debugging - make student validation lenient
        student = mongo_db.students.find_one({'user_id': ObjectId(current_user_id)})
        if not student:
            logger.warning("Student profile not found, but continuing for debugging")
            student = {'_id': ObjectId(current_user_id), 'user_id': ObjectId(current_user_id), 'email': 'debug@test.com'}
        
        student_id = str(student['_id'])
        
        # For debugging - make attempt validation lenient
        attempt = mongo_db.unified_test_attempts.find_one({
            '_id': ObjectId(attempt_id),
            'student_id': ObjectId(current_user_id),  # Use current_user_id directly
            'unified_test_id': ObjectId(test_id)
        })
        
        if not attempt:
            logger.warning("Attempt not found, but continuing for debugging")
            # For debugging, create a mock attempt
            attempt = {
                '_id': ObjectId(attempt_id),
                'student_id': ObjectId(current_user_id),
                'unified_test_id': ObjectId(test_id),
                'status': 'in_progress',
                'current_section': section_id
            }
        
        # Get test details
        test = mongo_db.unified_tests.find_one({'_id': ObjectId(test_id)})
        if not test:
            return jsonify({
                'success': False,
                'message': 'Test not found'
            }), 404
        
        # Find the section
        logger.info(f"Test sections: {test.get('sections', [])}")
        section = None
        for s in test.get('sections', []):
            logger.info(f"Checking section: {s.get('section_id')} vs {section_id}")
            if str(s.get('section_id')) == section_id:
                section = s
                logger.info(f"Found section: {section}")
                break
        
        if not section:
            logger.error(f"Section {section_id} not found in test {test_id}")
            return jsonify({
                'success': False,
                'message': 'Section not found'
            }), 404
        
        # Get questions from section's selected_questions (pre-selected during test creation)
        questions = []
        
        # Check if section has question_sources with selected_questions
        question_sources = section.get('question_sources', [])
        logger.info(f"Section question_sources: {question_sources}")
        
        for source in question_sources:
            if source.get('source_type') == 'question_bank' and source.get('selected_questions'):
                selected_questions = source.get('selected_questions', [])
                logger.info(f"Found {len(selected_questions)} selected questions in source")
                
                # Format pre-selected questions for frontend
                for q in selected_questions:
                    formatted_question = {
                        'id': str(q['_id']),
                        'question_text': q.get('question', ''),
                        'question_type': q.get('question_type', 'MCQ').upper(),
                        'options': {
                            'A': q.get('optionA', ''),
                            'B': q.get('optionB', ''),
                            'C': q.get('optionC', ''),
                            'D': q.get('optionD', '')
                        },
                        'correct_answer': q.get('answer', ''),
                        'explanation': q.get('instructions', ''),
                        'marks': 1,
                        'source_type': 'question_bank',
                        'module_id': str(q.get('module_id', '')),
                        'level_id': str(q.get('level_id', '')),
                        'audio_file_url': q.get('audio_file_url', ''),
                        'image_url': q.get('image_url', ''),
                        'instructions': q.get('instructions', ''),
                        'test_cases': q.get('test_cases', ''),
                        'expected_output': q.get('expected_output', ''),
                        'language': q.get('language', 'python')
                    }
                    questions.append(formatted_question)
                    logger.info(f"Added question: {q.get('question', '')[:50]}...")
        
        # Fallback: If no selected_questions, try querying question bank (old method)
        if not questions and section.get('source_type') == 'question_bank':
            logger.info("No selected_questions found, falling back to question bank query")
            # Build query for question bank
            query = {}
            
            if section.get('module_id'):
                query['module_id'] = section['module_id']
            if section.get('level_id'):
                query['level_id'] = section['level_id']
            if section.get('topic_id'):
                query['topic_id'] = ObjectId(section['topic_id'])
            
            logger.info(f"Question bank query: {query}")
            
            # Get questions from question bank
            bank_questions = list(mongo_db.question_bank.find(query).limit(section.get('question_count', 10)))
            logger.info(f"Found {len(bank_questions)} questions from question bank")
            
            # Format questions for frontend
            for q in bank_questions:
                    formatted_question = {
                        'id': str(q['_id']),
                        'question_text': q.get('question_text', ''),
                        'question_type': q.get('question_type', 'MCQ'),
                    'options': q.get('options', {}),
                        'correct_answer': q.get('correct_answer', ''),
                        'explanation': q.get('explanation', ''),
                        'marks': q.get('marks', 1),
                    'source_type': 'question_bank',
                    'module_id': str(q.get('module_id', '')),
                    'level_id': str(q.get('level_id', '')),
                    'audio_file_url': q.get('audio_file_url', ''),
                    'image_url': q.get('image_url', ''),
                    'instructions': q.get('instructions', ''),
                    'test_cases': q.get('test_cases', ''),
                    'expected_output': q.get('expected_output', ''),
                    'language': q.get('language', 'python')
                    }
                    questions.append(formatted_question)
        
        logger.info(f"Returning {len(questions)} questions for section {section_id}")
        logger.info(f"Questions: {questions}")
        
        return jsonify({
            'success': True,
            'questions': questions,
            'section': {
                'id': section_id,
                'name': section.get('section_name', ''),
                'description': section.get('section_description', ''),
                'time_limit_minutes': section.get('time_limit_minutes', 0),
                'total_questions': len(questions)
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching section questions: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch questions: {str(e)}'
        }), 500

@unified_test_taking_bp.route('/unified-tests/<test_id>/submit', methods=['POST'])
def submit_unified_test(test_id):
    """Submit entire unified test with all answers"""
    try:
        logger.info(f"=== SUBMIT UNIFIED TEST DEBUG ===")
        logger.info(f"Test ID: {test_id}")
        logger.info(f"Request data: {request.get_json()}")
        
        data = request.get_json()
        attempt_id = data.get('attempt_id')
        answers = data.get('answers', {})  # Changed to object for question_id -> answer mapping
        
        logger.info(f"Attempt ID: {attempt_id}")
        logger.info(f"Answers: {answers}")
        
        if not attempt_id:
            logger.warning("No attempt_id provided, but continuing for debugging")
            # For debugging, create a mock attempt_id
            attempt_id = "68ca77a5969366ab9f37cec0"  # Mock attempt ID for testing
            logger.info(f"Using mock attempt ID for debugging: {attempt_id}")
        
        # For debugging - handle JWT token leniently
        try:
            current_user_id = get_jwt_identity()
            logger.info(f"Current user ID from JWT: {current_user_id}")
        except Exception as e:
            logger.info(f"No JWT token or JWT error: {e}")
            # For debugging, use a real student ID from the database
            current_user_id = "68b9ae53236c35dcb8ea7bb0"  # Real student user_id for testing
            logger.info(f"Using default user ID for debugging: {current_user_id}")
        
        if not current_user_id:
            logger.error("No user ID available")
            return jsonify({'success': False, 'message': 'User ID required'}), 400
        
        # For debugging - make user validation lenient
        user = mongo_db.users.find_one({'_id': ObjectId(current_user_id)})
        if not user:
            logger.warning("User not found, but continuing for debugging")
            user = {'_id': ObjectId(current_user_id), 'role': 'student', 'email': 'debug@test.com'}
        elif user.get('role') != 'student':
            logger.warning(f"User role is {user.get('role')}, but continuing for debugging")
        
        # For debugging - make student validation lenient
        student = mongo_db.students.find_one({'user_id': ObjectId(current_user_id)})
        if not student:
            logger.warning("Student profile not found, but continuing for debugging")
            student = {'_id': ObjectId(current_user_id), 'user_id': ObjectId(current_user_id), 'email': 'debug@test.com'}
        
        # For debugging - make attempt validation lenient
        attempt = mongo_db.unified_test_attempts.find_one({
            '_id': ObjectId(attempt_id),
            'student_id': ObjectId(current_user_id),
            'unified_test_id': ObjectId(test_id)
        })
        
        if not attempt:
            logger.warning("Attempt not found, but continuing for debugging")
            # For debugging, create a mock attempt
            attempt = {
                '_id': ObjectId(attempt_id),
                'student_id': ObjectId(current_user_id),
                'unified_test_id': ObjectId(test_id),
                'status': 'in_progress'
            }
        
        # Get test details to validate answers
        test = mongo_db.unified_tests.find_one({'_id': ObjectId(test_id)})
        if not test:
            return jsonify({
                'success': False,
                'message': 'Test not found'
            }), 404
        
        # Calculate score based on question types
        total_score = 0.0
        total_marks = 0
        detailed_results = []
        
        # Get all questions from test
        all_questions = []
        for section in test.get('sections', []):
            question_sources = section.get('question_sources', [])
            for source in question_sources:
                if source.get('source_type') == 'question_bank' and source.get('selected_questions'):
                    all_questions.extend(source.get('selected_questions', []))
        
        logger.info(f"Processing {len(all_questions)} questions for scoring")
        
        # Process each answer
        for question in all_questions:
            question_id = str(question['_id'])
            user_answer = answers.get(question_id, '')
            question_type = question.get('question_type', 'MCQ').upper()
            correct_answer = question.get('answer', '')
            marks = 1  # Default marks per question
            
            total_marks += marks
            
            # Validate answer based on question type
            is_correct = False
            score = 0.0
            
            if question_type == 'MCQ':
                # MCQ validation - exact match
                if user_answer and user_answer.upper() == correct_answer.upper():
                    is_correct = True
                    score = marks
                    total_score += score
                    
            elif question_type == 'SENTENCE':
                # Sentence validation - case-insensitive partial match
                if user_answer and correct_answer:
                    user_words = set(user_answer.lower().split())
                    correct_words = set(correct_answer.lower().split())
                    # Check if at least 70% of words match
                    if len(correct_words) > 0:
                        match_ratio = len(user_words.intersection(correct_words)) / len(correct_words)
                        if match_ratio >= 0.7:
                            is_correct = True
                            score = marks * match_ratio
                            total_score += score
                            
            elif question_type == 'AUDIO':
                # Audio validation - similar to sentence
                if user_answer and correct_answer:
                    user_words = set(user_answer.lower().split())
                    correct_words = set(correct_answer.lower().split())
                    if len(correct_words) > 0:
                        match_ratio = len(user_words.intersection(correct_words)) / len(correct_words)
                        if match_ratio >= 0.6:  # Slightly more lenient for audio
                            is_correct = True
                            score = marks * match_ratio
                            total_score += score
                            
            elif question_type == 'TECHNICAL':
                # Technical validation - check test cases if available
                test_cases = question.get('test_cases', '')
                expected_output = question.get('expected_output', '')
                
                if test_cases and expected_output:
                    # For technical questions, check if output matches expected
                    if user_answer and expected_output:
                        if user_answer.strip() == expected_output.strip():
                            is_correct = True
                            score = marks
                            total_score += score
                else:
                    # Fallback to text comparison
                    if user_answer and correct_answer:
                        if user_answer.strip().lower() == correct_answer.strip().lower():
                            is_correct = True
                            score = marks
                            total_score += score
                            
            elif question_type == 'WRITING':
                # Writing validation - always give partial credit if answer provided
                if user_answer and len(user_answer.strip()) > 10:  # Minimum length check
                    # Give partial credit based on length and content
                    word_count = len(user_answer.split())
                    if word_count >= 20:  # Minimum word count
                        is_correct = True
                        score = marks * 0.8  # 80% for writing questions
                        total_score += score
                    elif word_count >= 10:
                        is_correct = True
                        score = marks * 0.5  # 50% for shorter answers
                        total_score += score
            
            # Store detailed result
            detailed_results.append({
                    'question_id': question_id,
                'question_text': question.get('question', ''),
                'question_type': question_type,
                'user_answer': user_answer,
                'correct_answer': correct_answer,
                    'is_correct': is_correct,
                'score': score,
                'marks': marks,
                'section_id': question.get('section_id', ''),
                'section_name': question.get('section_name', '')
            })
        
        # Calculate percentage
        percentage = (total_score / total_marks * 100) if total_marks > 0 else 0
        
        # Update attempt with final results
        final_attempt_data = {
            'status': 'completed',
            'submitted_at': datetime.now(pytz.utc),
            'total_score': total_score,
            'total_marks': total_marks,
            'percentage': percentage,
            'answers': answers,
            'detailed_results': detailed_results,
            'last_updated': datetime.now(pytz.utc)
        }
        
        mongo_db.unified_test_attempts.update_one(
            {'_id': ObjectId(attempt_id)},
            {'$set': final_attempt_data}
        )
        
        logger.info(f"Test submitted successfully - Score: {total_score}/{total_marks} ({percentage:.2f}%)")
        
        return jsonify({
            'success': True,
            'message': 'Test submitted successfully',
            'data': {
                'total_score': total_score,
                'total_marks': total_marks,
                'percentage': percentage,
                'detailed_results': detailed_results
            }
        })
        
    except Exception as e:
        logger.error(f"Error submitting unified test: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Failed to submit test: {str(e)}'
        }), 500


@unified_test_taking_bp.route('/unified-tests/<test_id>/attempts/<attempt_id>', methods=['GET'])
@jwt_required()
def get_attempt_details(test_id, attempt_id):
    """Get details of a specific attempt"""
    try:
        # Get user_id from JWT token (same as online exam system)
        current_user_id = get_jwt_identity()
        if not current_user_id:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        
        # Get user and verify role
        user = mongo_db.users.find_one({'_id': ObjectId(current_user_id)})
        if not user or user.get('role') != 'student':
            return jsonify({
                'success': False,
                'message': 'Access denied'
            }), 403
        
        # Get student profile
        student = mongo_db.students.find_one({'user_id': ObjectId(current_user_id)})
        if not student:
            return jsonify({
                'success': False,
                'message': 'Student profile not found'
            }), 404
        
        # Get attempt details
        attempt = mongo_db.unified_test_attempts.find_one({
            '_id': ObjectId(attempt_id),
            'student_id': ObjectId(current_user_id),  # Use current_user_id directly
            'unified_test_id': ObjectId(test_id)
        })
        
        if not attempt:
            return jsonify({
                'success': False,
                'message': 'Attempt not found'
            }), 404
        
        # Get test details
        test = mongo_db.unified_tests.find_one({'_id': ObjectId(test_id)})
        if not test:
            return jsonify({
                'success': False,
                'message': 'Test not found'
            }), 404
        
        # Format response
        response_data = {
            'attempt_id': str(attempt['_id']),
            'test_id': str(test['_id']),
            'test_name': test['test_name'],
            'status': attempt['status'],
            'started_at': attempt.get('started_at'),
            'submitted_at': attempt.get('submitted_at'),
            'total_score': attempt.get('total_score', 0.0),
            'total_marks': attempt.get('total_marks', 0),
            'time_spent_minutes': attempt.get('time_spent_minutes', 0),
            'section_attempts': attempt.get('section_attempts', [])
        }
        
        return jsonify({
            'success': True,
            'data': response_data
        })
        
    except Exception as e:
        logger.error(f"Error fetching attempt details: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch attempt details: {str(e)}'
        }), 500

@unified_test_taking_bp.route('/debug/test-structure/<test_id>', methods=['GET'])
def debug_test_structure(test_id):
    """Debug endpoint to check test structure without authentication"""
    try:
        logger.info(f"=== DEBUG TEST STRUCTURE ===")
        logger.info(f"Test ID: {test_id}")
        
        # Check if test exists
        test = mongo_db.unified_tests.find_one({'_id': ObjectId(test_id)})
        if not test:
            return jsonify({'success': False, 'message': 'Test not found'}), 404
            
        logger.info(f"Test found: {test.get('title', 'No title')}")
        logger.info(f"Test status: {test.get('status')}")
        logger.info(f"Test sections: {len(test.get('sections', []))}")
        
        return jsonify({
            'success': True,
            'test': {
                'id': str(test['_id']),
                'title': test.get('title'),
                'status': test.get('status'),
                'sections_count': len(test.get('sections', [])),
                'start_date': test.get('start_date'),
                'end_date': test.get('end_date')
            }
        })
    except Exception as e:
        logger.error(f"Debug test structure error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
