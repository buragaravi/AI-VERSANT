from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from mongo import mongo_db
from bson import ObjectId
from config.constants import GRAMMAR_CATEGORIES, MODULES, LEVELS
import logging
from datetime import datetime
import pytz

# Helper function to recursively convert ObjectId fields to strings
def convert_objectids_to_strings(obj):
    """Recursively convert all ObjectId fields to strings for JSON serialization"""
    if isinstance(obj, dict):
        for key, value in obj.items():
            if isinstance(value, ObjectId):
                obj[key] = str(value)
            elif isinstance(value, (dict, list)):
                convert_objectids_to_strings(value)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            if isinstance(item, ObjectId):
                obj[i] = str(item)
            elif isinstance(item, (dict, list)):
                convert_objectids_to_strings(item)
    return obj

student_bp = Blueprint('student', __name__)

@student_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_student_profile():
    """Fetches the detailed profile for the currently logged-in student."""
    try:
        current_user_id = get_jwt_identity()
        user_object_id = ObjectId(current_user_id)

        pipeline = [
            {'$match': {'_id': user_object_id}},
            {
                '$lookup': {
                    'from': 'students',
                    'localField': '_id',
                    'foreignField': 'user_id',
                    'as': 'student_details'
                }
            },
            {
                '$lookup': {
                    'from': 'campuses',
                    'localField': 'campus_id',
                    'foreignField': '_id',
                    'as': 'campus_details'
                }
            },
            {
                '$lookup': {
                    'from': 'courses',
                    'localField': 'course_id',
                    'foreignField': '_id',
                    'as': 'course_details'
                }
            },
            {
                '$lookup': {
                    'from': 'batches',
                    'localField': 'batch_id',
                    'foreignField': '_id',
                    'as': 'batch_details'
                }
            },
            {'$unwind': {'path': '$student_details', 'preserveNullAndEmptyArrays': True}},
            {'$unwind': {'path': '$campus_details', 'preserveNullAndEmptyArrays': True}},
            {'$unwind': {'path': '$course_details', 'preserveNullAndEmptyArrays': True}},
            {'$unwind': {'path': '$batch_details', 'preserveNullAndEmptyArrays': True}},
            {
                '$project': {
                    '_id': 0,
                    'name': '$name',
                    'email': '$email',
                    'role': '$role',
                    'mobile_number': '$mobile_number',
                    'roll_number': '$student_details.roll_number',
                    'campus': '$campus_details.name',
                    'course': '$course_details.name',
                    'batch': '$batch_details.name'
                }
            }
        ]

        profile_data = list(mongo_db.users.aggregate(pipeline))

        if not profile_data:
            return jsonify({'success': False, 'message': 'Student profile not found.'}), 404

        return jsonify({'success': True, 'data': profile_data[0]}), 200

    except Exception as e:
        logging.error(f"Error fetching student profile for user_id {get_jwt_identity()}: {e}", exc_info=True)
        return jsonify({'success': False, 'message': 'An error occurred while fetching your profile.'}), 500

@student_bp.route('/modules', methods=['GET'])
@jwt_required()
def get_available_modules():
    """
    Get all available practice modules for the student landing page,
    ordered with Grammar and Vocabulary first, and with a locked status.
    """
    try:
        # Define the priority order
        priority_order = ['GRAMMAR', 'VOCABULARY']
        
        all_modules = [{'id': key, 'name': value} for key, value in MODULES.items()]
        
        # Separate into priority and other modules
        priority_modules = [m for m in all_modules if m['id'] in priority_order]
        other_modules = [m for m in all_modules if m['id'] not in priority_order]

        # Sort priority modules according to the defined order
        priority_modules.sort(key=lambda m: priority_order.index(m['id']))
        
        # Add 'locked' status
        final_module_list = []
        for m in priority_modules:
            final_module_list.append({**m, 'locked': False})
        
        for m in other_modules:
            final_module_list.append({**m, 'locked': True})
            
        return jsonify({'success': True, 'data': final_module_list})
    except Exception as e:
        logging.error(f"Error fetching modules: {e}", exc_info=True)
        return jsonify({'success': False, 'message': 'Could not load modules.'}), 500

@student_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    """Student dashboard"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user or user.get('role') != 'student':
            return jsonify({
                'success': False,
                'message': 'Access denied'
            }), 403
        
        # Check if student_progress collection exists
        if not hasattr(mongo_db, 'student_progress'):
            current_app.logger.warning("student_progress collection not found, using empty progress")
            progress = []
        else:
            # Get student progress
            progress = list(mongo_db.student_progress.find({'student_id': current_user_id}))
        
        dashboard_data = {
            'user_id': str(current_user_id),
            'progress': progress
        }
        
        # Convert any ObjectId fields to strings for JSON serialization
        convert_objectids_to_strings(dashboard_data)
        
        return jsonify({
            'success': True,
            'message': 'Dashboard data retrieved successfully',
            'data': dashboard_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get dashboard data: {str(e)}'
        }), 500

@student_bp.route('/tests', methods=['GET'])
@jwt_required()
def get_student_tests():
    """Get tests available for the logged-in student based on their batch-course instance"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.users.find_one({'_id': ObjectId(current_user_id)})
        
        if not user or user.get('role') != 'student':
            return jsonify({'success': False, 'message': 'Access denied'}), 403

        # Get query parameters for filtering
        module = request.args.get('module')
        category = request.args.get('category')
        subcategory = request.args.get('subcategory')

        # Get student's record (may or may not have batch_course_instance_id yet)
        student = mongo_db.students.find_one({'user_id': ObjectId(current_user_id)})
        # If no student profile, return empty list gracefully
        if not student:
            return jsonify({'success': True, 'data': []}), 200
        instance_id = student.get('batch_course_instance_id')
        
        # Build base query filter
        # Prefer explicit practice tests and handle different active flags
        active_clause = {
            '$or': [
                { 'status': 'active' },
                { 'is_active': True },
                { 'status': { '$exists': False }, 'is_active': { '$exists': False } }
            ]
        }
        query_filter = {
            '$and': [
                { 'test_type': 'practice' },
                active_clause
            ]
        }
        
        # Add module filter if provided
        if module:
            query_filter['$and'].append({ 'module_id': module })
            
        # Add category filter if provided
        if category:
            query_filter['$and'].append({ 'test_category': category })
            
        # Add subcategory filter if provided
        if subcategory:
            query_filter['$and'].append({ 'subcategory': subcategory })

        # Audience filter: match by instance OR student's campus/course/batch OR explicit assignment
        audience_or = []
        if instance_id:
            audience_or.append({ 'batch_course_instance_ids': { '$in': [instance_id] } })
        if student:
            campus_id = student.get('campus_id')
            course_id = student.get('course_id')
            batch_id = student.get('batch_id')
            if campus_id:
                audience_or.append({ 'campus_ids': { '$in': [campus_id] } })
            if course_id:
                audience_or.append({ 'course_ids': { '$in': [course_id] } })
            if batch_id:
                audience_or.append({ 'batch_ids': { '$in': [batch_id] } })
            # Some tests may use explicit assigned_student_ids with either student _id or user _id
            if student.get('_id'):
                audience_or.append({ 'assigned_student_ids': { '$in': [student['_id']] } })
            audience_or.append({ 'assigned_student_ids': { '$in': [ObjectId(current_user_id)] } })

        # If we have any audience filters, require at least one to match; otherwise, keep base filter
        if audience_or:
            query_filter['$and'].append({ '$or': audience_or })
        else:
            # No audience context available (e.g., student not assigned yet and no campus/course/batch)
            # Return empty list instead of 404
            return jsonify({'success': True, 'data': []}), 200

        # Get tests according to filters
        tests = list(mongo_db.tests.find(query_filter))
        
        test_list = []
        for test in tests:
            # Check if student has already attempted this test
            existing_attempt = mongo_db.student_test_attempts.find_one({
                'test_id': test['_id'],
                'student_id': ObjectId(current_user_id),
                # instance may be missing; include it only if present to avoid over-filtering
                **({ 'batch_course_instance_id': instance_id } if instance_id else {})
            })
            
            # Get highest score for this test
            highest_score = 0
            # Try both possible collections for historical results
            try:
                attempts_primary = list(mongo_db.test_results.find({
                    'test_id': test['_id'],
                    'student_id': ObjectId(current_user_id)
                }))
            except Exception:
                attempts_primary = []
            try:
                attempts_alt = list(mongo_db.test_results.find({
                    'test_id': test['_id'],
                    'student_id': ObjectId(current_user_id)
                }))
            except Exception:
                attempts_alt = []
            all_attempts = (attempts_primary or []) + (attempts_alt or [])
            if all_attempts:
                highest_score = max(attempt.get('average_score', 0) for attempt in all_attempts)
            
            test_list.append({
                '_id': str(test['_id']),
                'name': test['name'],
                'type': test.get('type') or test.get('test_type'),
                'duration': test.get('duration'),
                'total_marks': test.get('total_marks'),
                'instructions': test.get('instructions', ''),
                'start_date': test.get('start_date', '').isoformat() if test.get('start_date') else None,
                'end_date': test.get('end_date', '').isoformat() if test.get('end_date') else None,
                'has_attempted': existing_attempt is not None,
                'attempt_id': str(existing_attempt['_id']) if existing_attempt else None,
                'highest_score': highest_score
            })
        
        # Convert any remaining ObjectId fields to strings for JSON serialization
        convert_objectids_to_strings(test_list)
        
        return jsonify({'success': True, 'data': test_list}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching student tests: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@student_bp.route('/tests/<test_id>/start', methods=['POST'])
@jwt_required()
def start_test(test_id):
    """Start a test for the student"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.users.find_one({'_id': ObjectId(current_user_id)})
        
        if not user or user.get('role') != 'student':
            return jsonify({'success': False, 'message': 'Access denied'}), 403
        
        # Get student's batch-course instance
        student = mongo_db.students.find_one({'user_id': ObjectId(current_user_id)})
        if not student or not student.get('batch_course_instance_id'):
            return jsonify({'success': False, 'message': 'Student not assigned to any batch-course instance'}), 404
        
        instance_id = student['batch_course_instance_id']
        
        # Get test and verify it's assigned to this instance
        test = mongo_db.tests.find_one({
            '_id': ObjectId(test_id),
            'batch_course_instance_ids': instance_id,
            'is_active': True
        })
        
        if not test:
            return jsonify({'success': False, 'message': 'Test not found or not available'}), 404
        
        # Check if student has already attempted this test
        existing_attempt = mongo_db.student_test_attempts.find_one({
            'test_id': ObjectId(test_id),
            'student_id': ObjectId(current_user_id),
            'batch_course_instance_id': instance_id
        })
        
        if existing_attempt:
            return jsonify({'success': False, 'message': 'Test already attempted'}), 409
        
        # Create test attempt
        attempt_doc = {
            'test_id': ObjectId(test_id),
            'student_id': ObjectId(current_user_id),
            'batch_course_instance_id': instance_id,
            'start_time': datetime.now(pytz.utc),
            'status': 'in_progress',
            'answers': [],
            'score': 0,
            'total_marks': test['total_marks']
        }
        
        attempt_id = mongo_db.student_test_attempts.insert_one(attempt_doc).inserted_id
        
        return jsonify({
            'success': True,
            'data': {
                'attempt_id': str(attempt_id),
                'test': {
                    'id': str(test['_id']),
                    'name': test['name'],
                    'duration': test['duration'],
                    'total_marks': test['total_marks'],
                    'instructions': test.get('instructions', '')
                }
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error starting test: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@student_bp.route('/tests/<test_id>/submit', methods=['POST'])
@jwt_required()
def submit_test(test_id):
    """Submit test answers and calculate score"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.users.find_one({'_id': ObjectId(current_user_id)})
        
        if not user or user.get('role') != 'student':
            return jsonify({'success': False, 'message': 'Access denied'}), 403
        
        data = request.get_json()
        attempt_id = data.get('attempt_id')
        answers = data.get('answers', [])
        
        if not attempt_id:
            return jsonify({'success': False, 'message': 'Attempt ID is required'}), 400
        
        # Get student's batch-course instance
        student = mongo_db.students.find_one({'user_id': ObjectId(current_user_id)})
        if not student or not student.get('batch_course_instance_id'):
            return jsonify({'success': False, 'message': 'Student not assigned to any batch-course instance'}), 404
        
        instance_id = student['batch_course_instance_id']
        
        # Get test attempt
        attempt = mongo_db.student_test_attempts.find_one({
            '_id': ObjectId(attempt_id),
            'test_id': ObjectId(test_id),
            'student_id': ObjectId(current_user_id),
            'batch_course_instance_id': instance_id
        })
        
        if not attempt:
            return jsonify({'success': False, 'message': 'Test attempt not found'}), 404
        
        if attempt['status'] == 'completed':
            return jsonify({'success': False, 'message': 'Test already submitted'}), 409
        
        # Get test details
        test = mongo_db.tests.find_one({'_id': ObjectId(test_id)})
        if not test:
            return jsonify({'success': False, 'message': 'Test not found'}), 404
        
        # Calculate score (simplified - you can implement more complex scoring logic)
        score = 0
        total_questions = len(answers)
        
        # Update attempt with answers and score
        mongo_db.student_test_attempts.update_one(
            {'_id': ObjectId(attempt_id)},
            {
                '$set': {
                    'answers': answers,
                    'score': score,
                    'end_time': datetime.now(pytz.utc),
                    'status': 'completed'
                }
            }
        )
        
        return jsonify({
            'success': True,
            'message': 'Test submitted successfully',
            'data': {
                'score': score,
                'total_marks': test['total_marks'],
                'total_questions': total_questions
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error submitting test: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@student_bp.route('/grammar-progress', methods=['GET'])
@jwt_required()
def get_grammar_progress():
    try:
        current_user_id = get_jwt_identity()

        if not isinstance(GRAMMAR_CATEGORIES, dict) or not GRAMMAR_CATEGORIES:
             logging.critical("GRAMMAR_CATEGORIES constant is not a valid dictionary or is empty.")
             return jsonify({'success': True, 'data': []}), 200

        ordered_categories = list(GRAMMAR_CATEGORIES.keys())
        scores_by_subcategory = {}
        
        try:
            # Check if test_results collection exists
            if not hasattr(mongo_db, 'test_results'):
                current_app.logger.warning("test_results collection not found, using empty results")
                results = []
            else:
                results = list(mongo_db.test_results.find({
                    'student_id': ObjectId(current_user_id),
                    'module_id': 'GRAMMAR'
                }))

            for result in results:
                if not isinstance(result, dict):
                    logging.warning(f"Skipping non-dict item in test results for user {current_user_id}: {result}")
                    continue

                try:
                    subcategory = result.get('subcategory')
                    score_val = result.get('average_score')

                    if subcategory and subcategory in GRAMMAR_CATEGORIES:
                        score = float(score_val)
                        
                        current_max_score = scores_by_subcategory.get(subcategory, -1.0)
                        if score > current_max_score:
                            scores_by_subcategory[subcategory] = score
                except (ValueError, TypeError, AttributeError) as e:
                    logging.warning(f"Skipping malformed test result for user {current_user_id}. Error: {e}. Result: {result}")
                    continue
        except Exception as db_error:
             current_app.logger.error(f"Database error fetching grammar progress for user {current_user_id}: {db_error}", exc_info=True)
             # Return empty progress instead of error
             return jsonify({'success': True, 'data': []}), 200

        progress_data = []
        unlocked = True
        for category_id in ordered_categories:
            category_name = GRAMMAR_CATEGORIES.get(category_id, "Unknown Category")
            score = scores_by_subcategory.get(category_id, 0.0)
            
            progress_data.append({
                'id': category_id,
                'name': category_name,
                'unlocked': unlocked,
                'score': score
            })
            
            if unlocked and score < 60:
                unlocked = False

        return jsonify({'success': True, 'data': progress_data}), 200

    except Exception as e:
        logging.error(f"FATAL error in /grammar-progress for user {get_jwt_identity()}: {e}", exc_info=True)
        return jsonify({'success': False, 'message': 'An unexpected internal error occurred.'}), 500

@student_bp.route('/test/<test_id>/random-assignment', methods=['GET'])
@jwt_required()
def get_student_random_test_assignment(test_id):
    """Get student's specific test assignment with randomized questions"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.users.find_one({'_id': ObjectId(current_user_id)})
        
        if not user or user.get('role') != 'student':
            return jsonify({'success': False, 'message': 'Access denied'}), 403
        
        # Get student's batch-course instance
        student = mongo_db.students.find_one({'user_id': ObjectId(current_user_id)})
        if not student or not student.get('batch_course_instance_id'):
            return jsonify({'success': False, 'message': 'Student not assigned to any batch-course instance'}), 404
        
        instance_id = student['batch_course_instance_id']
        
        # Get test and verify it's assigned to this instance
        test = mongo_db.tests.find_one({
            '_id': ObjectId(test_id),
            'batch_course_instance_ids': instance_id,
            'is_active': True,
            'has_random_questions': True  # Only for tests with random questions
        })
        
        if not test:
            return jsonify({'success': False, 'message': 'Test not found or not available'}), 404
        
        # Check if student is assigned to this test
        if ObjectId(current_user_id) not in test.get('assigned_student_ids', []):
            return jsonify({'success': False, 'message': 'You are not assigned to this test'}), 403
        
        # Get student's specific test assignment
        assignment = mongo_db.student_test_assignments.find_one({
            'test_id': ObjectId(test_id),
            'student_id': ObjectId(current_user_id)
        })
        
        if not assignment:
            return jsonify({'success': False, 'message': 'Test assignment not found'}), 404
        
        # Check if test is already attempted
        if assignment.get('attempted', False):
            return jsonify({'success': False, 'message': 'Test already attempted'}), 409
        
        # Check if test is within time window
        now = datetime.now(pytz.utc)
        start_time = test.get('startDateTime')
        end_time = test.get('endDateTime')
        
        if start_time and now < start_time:
            return jsonify({'success': False, 'message': 'Test has not started yet'}), 400
        
        if end_time and now > end_time:
            return jsonify({'success': False, 'message': 'Test has ended'}), 400
        
        # Prepare test data for student (without correct answers)
        test_data = {
            'id': str(test['_id']),
            'name': test['name'],
            'module_id': test['module_id'],
            'level_id': test['level_id'],
            'duration': test['duration'],
            'startDateTime': test['startDateTime'],
            'endDateTime': test['endDateTime'],
            'questions': assignment['questions'],
            'total_questions': len(assignment['questions']),
            'assignment_id': str(assignment['_id'])
        }
        
        # Remove correct answers from questions for security
        for question in test_data['questions']:
            if 'correct_answer' in question:
                del question['correct_answer']
            if 'original_answer' in question:
                del question['original_answer']
        
        return jsonify({
            'success': True,
            'message': 'Test assignment retrieved successfully',
            'data': test_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting student test assignment: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@student_bp.route('/test/<test_id>/submit-random', methods=['POST'])
@jwt_required()
def submit_random_test(test_id):
    """Submit test with randomized questions and calculate score"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.users.find_one({'_id': ObjectId(current_user_id)})
        
        if not user or user.get('role') != 'student':
            return jsonify({'success': False, 'message': 'Access denied'}), 403
        
        data = request.get_json()
        assignment_id = data.get('assignment_id')
        answers = data.get('answers', [])
        
        if not assignment_id:
            return jsonify({'success': False, 'message': 'Assignment ID is required'}), 400
        
        # Get student's test assignment
        assignment = mongo_db.student_test_assignments.find_one({
            '_id': ObjectId(assignment_id),
            'test_id': ObjectId(test_id),
            'student_id': ObjectId(current_user_id)
        })
        
        if not assignment:
            return jsonify({'success': False, 'message': 'Test assignment not found'}), 404
        
        if assignment.get('attempted', False):
            return jsonify({'success': False, 'message': 'Test already submitted'}), 409
        
        # Get test details
        test = mongo_db.tests.find_one({'_id': ObjectId(test_id)})
        if not test:
            return jsonify({'success': False, 'message': 'Test not found'}), 404
        
        # Calculate score
        score = 0
        total_questions = len(assignment['questions'])
        correct_answers = 0
        detailed_results = []
        
        for i, question in enumerate(assignment['questions']):
            student_answer = answers.get(f'question_{i}', '')
            correct_answer = question.get('correct_answer', '')
            
            is_correct = student_answer == correct_answer
            if is_correct:
                correct_answers += 1
                score += 1
            
            detailed_results.append({
                'question_index': i,
                'question': question.get('question', ''),
                'student_answer': student_answer,
                'correct_answer': correct_answer,
                'is_correct': is_correct
            })
        
        # Calculate percentage
        percentage = (score / total_questions) * 100 if total_questions > 0 else 0
        
        # Update assignment with results
        mongo_db.student_test_assignments.update_one(
            {'_id': ObjectId(assignment_id)},
            {
                '$set': {
                    'attempted': True,
                    'completed_at': datetime.now(pytz.utc),
                    'score': score,
                    'percentage': percentage,
                    'answers': answers,
                    'detailed_results': detailed_results
                }
            }
        )
        
        return jsonify({
            'success': True,
            'message': 'Test submitted successfully',
            'data': {
                'score': score,
                'total_questions': total_questions,
                'percentage': percentage,
                'correct_answers': correct_answers,
                'detailed_results': detailed_results
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error submitting random test: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@student_bp.route('/online-exams', methods=['GET'])
@jwt_required()
def get_online_exams():
    """Get available online exams for a student."""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.users.find_one({'_id': ObjectId(current_user_id)})
        
        if not user or user.get('role') != 'student':
            return jsonify({'success': False, 'message': 'Access denied'}), 403

        # Base query for active online exams assigned to the student's audience
        query = {
            'test_type': 'online', 
            'status': 'active',
            'campus_ids': user.get('campus_id'),
            'course_ids': user.get('course_id')
        }
        
        projection = { "questions": 0, "audio_config": 0 }
        
        try:
            exams = list(mongo_db.tests.find(query, projection))
        except Exception as e:
            current_app.logger.warning(f"Error fetching online exams: {e}, using empty list")
            exams = []

        # Prepare data for frontend
        exams_data = []
        for exam in exams:
            module_name = MODULES.get(exam.get('module_id'), 'N/A')
            level_name = "N/A"
            if exam.get('module_id') == 'GRAMMAR':
                level_name = GRAMMAR_CATEGORIES.get(exam.get('subcategory'), 'N/A')
            else:
                level_name = LEVELS.get(exam.get('level_id'), {}).get('name', 'N/A')

            # Add start/end time fields
            start_dt = exam.get('startDateTime')
            end_dt = exam.get('endDateTime')

            exams_data.append({
                '_id': str(exam['_id']),
                'name': exam.get('name'),
                'module_name': module_name,
                'level_name': level_name,
                'question_count': len(exam.get('questions', [])) if 'questions' in exam else 'N/A',
                'startDateTime': start_dt,
                'endDateTime': end_dt
            })
        
        # Convert any remaining ObjectId fields to strings for JSON serialization
        convert_objectids_to_strings(exams_data)
        
        return jsonify({
            'success': True,
            'message': 'Online exams retrieved successfully',
            'data': exams_data
        }), 200
        
    except Exception as e:
        logging.error(f"Error in /student/online-exams for user {current_user_id}: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'An error occurred while fetching online exams: {str(e)}'
        }), 500 

@student_bp.route('/test/<test_id>', methods=['GET'])
@jwt_required()
def get_single_test(test_id):
    """Get full details for a single test for a student to take."""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.users.find_one({'_id': ObjectId(current_user_id)})
        
        if not user or user.get('role') != 'student':
            return jsonify({'success': False, 'message': 'Access denied'}), 403

        test = mongo_db.tests.find_one({'_id': ObjectId(test_id)})
        if not test:
            return jsonify({'success': False, 'message': 'Test not found'}), 404

        # You might want to add an access check here to ensure the student
        # is actually assigned to this test, similar to the /tests endpoint.

        # We don't want to send the correct answers to the student before they take the test.
        projection = { 'questions.correct_answer': 0 }
        test_details = mongo_db.tests.find_one({'_id': ObjectId(test_id)}, projection)
        
        # Convert all ObjectId fields to strings for JSON serialization
        convert_objectids_to_strings(test_details)
        # --- SHUFFLE MCQ QUESTIONS AND OPTIONS ---
        import random
        if 'questions' in test_details and isinstance(test_details['questions'], list):
            # Shuffle questions
            random.shuffle(test_details['questions'])
            for q in test_details['questions']:
                if q.get('question_type') == 'mcq' and 'options' in q and isinstance(q['options'], dict):
                    # Shuffle options
                    items = list(q['options'].items())
                    random.shuffle(items)
                    new_options = {}
                    answer_map = {}
                    for idx, (old_key, value) in enumerate(items):
                        new_key = chr(ord('A') + idx)
                        new_options[new_key] = value
                        answer_map[old_key] = new_key
                    # Update options
                    q['options'] = new_options
                    # Update correct_answer to new key
                    if 'correct_answer' in q and q['correct_answer'] in answer_map:
                        q['correct_answer'] = answer_map[q['correct_answer']]
        # --- END SHUFFLE ---
        return jsonify({'success': True, 'data': test_details})

    except Exception as e:
        logging.error(f"Error fetching single test {test_id} for student {current_user_id}: {e}", exc_info=True)
        return jsonify({'success': False, 'message': 'Could not load test details.'}), 500

@student_bp.route('/test-history', methods=['GET'])
@jwt_required()
def get_test_history():
    """Get student's test history with detailed results"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if test_results collection exists
        if not hasattr(mongo_db, 'test_results'):
            current_app.logger.warning("test_results collection not found, returning empty test history")
            return jsonify({'success': True, 'data': []}), 200
        
        pipeline = [
            {
                '$match': {
                    'student_id': ObjectId(current_user_id)
                }
            },
            {
                '$lookup': {
                    'from': 'tests',
                    'localField': 'test_id',
                    'foreignField': '_id',
                    'as': 'test_details'
                }
            },
            {
                '$unwind': '$test_details'
            },
            {
                '$project': {
                    '_id': 1,
                    'test_name': '$test_details.name',
                    'module_id': '$test_details.module_id',
                    'subcategory': 1,
                    'level_id': '$test_details.level_id',
                    'average_score': 1,
                    'correct_answers': 1,
                    'total_questions': 1,
                    'time_taken': 1,
                    'submitted_at': 1,
                    'test_type': 1
                }
            },
            { '$sort': { 'submitted_at': -1 } }
        ]
        
        try:
            results = list(mongo_db.test_results.aggregate(pipeline))
        except Exception as e:
            current_app.logger.warning(f"Error aggregating test history: {e}, using empty results")
            results = []
        
        # Convert ObjectIds to strings and add module names
        for result in results:
            result['_id'] = str(result['_id'])
            result['module_name'] = MODULES.get(result.get('module_id'), 'Unknown')
            result['level_name'] = LEVELS.get(result.get('level_id'), {}).get('name', 'Unknown')
            if 'submitted_at' in result:
                result['submitted_at'] = result['submitted_at'].isoformat()
        
        # Convert any remaining ObjectId fields to strings for JSON serialization
        convert_objectids_to_strings(results)
        
        return jsonify({
            'success': True,
            'data': results
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching test history for student {get_jwt_identity()}: {e}", exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to fetch test history.'}), 500

@student_bp.route('/practice-results', methods=['GET'])
@jwt_required()
def get_practice_results():
    """Get detailed practice module results for student"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if test_results collection exists
        if not hasattr(mongo_db, 'test_results'):
            current_app.logger.warning("test_results collection not found, returning empty practice results")
            return jsonify({'success': True, 'data': []}), 200
        
        # Get all practice test results
        pipeline = [
            {
                '$match': {
                    'student_id': ObjectId(current_user_id),
                    'test_type': 'practice'
                }
            },
            {
                '$lookup': {
                    'from': 'tests',
                    'localField': 'test_id',
                    'foreignField': '_id',
                    'as': 'test_details'
                }
            },
            {
                '$unwind': '$test_details'
            },
            {
                '$group': {
                    '_id': {
                        'module_id': '$test_details.module_id',
                        'subcategory': '$subcategory'
                    },
                    'module_name': { '$first': '$test_details.module_id' },
                    'subcategory_name': { '$first': '$subcategory' },
                    'total_attempts': { '$sum': 1 },
                    'highest_score': { '$max': '$average_score' },
                    'average_score': { '$avg': '$average_score' },
                    'total_questions_attempted': { '$sum': '$total_questions' },
                    'total_correct_answers': { '$sum': '$correct_answers' },
                    'last_attempt': { '$max': '$submitted_at' },
                    'results': { '$push': '$$ROOT' }
                }
            },
            {
                '$sort': { 'module_name': 1, 'subcategory_name': 1 }
            }
        ]
        
        try:
            results = list(mongo_db.test_results.aggregate(pipeline))
        except Exception as e:
            current_app.logger.warning(f"Error aggregating practice results: {e}, using empty results")
            results = []
        
        # Process results
        for result in results:
            result['module_name'] = MODULES.get(result['module_name'], 'Unknown')
            result['accuracy'] = (result['total_correct_answers'] / result['total_questions_attempted'] * 100) if result['total_questions_attempted'] > 0 else 0
            result['last_attempt'] = result['last_attempt'].isoformat() if result['last_attempt'] else None
        
        # Convert any ObjectId fields to strings for JSON serialization
        convert_objectids_to_strings(results)
        
        return jsonify({
            'success': True,
            'data': results
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching practice results for student {get_jwt_identity()}: {e}", exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to fetch practice results.'}), 500

@student_bp.route('/grammar-detailed-results', methods=['GET'])
@jwt_required()
def get_grammar_detailed_results():
    """Get detailed grammar practice results by subcategory"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if test_results collection exists
        if not hasattr(mongo_db, 'test_results'):
            current_app.logger.warning("test_results collection not found, returning empty grammar results")
            return jsonify({'success': True, 'data': []}), 200
        
        pipeline = [
            {
                '$match': {
                    'student_id': ObjectId(current_user_id),
                    'module_id': 'GRAMMAR',
                    'test_type': 'practice'
                }
            },
            {
                '$lookup': {
                    'from': 'tests',
                    'localField': 'test_id',
                    'foreignField': '_id',
                    'as': 'test_details'
                }
            },
            {
                '$unwind': '$test_details'
            },
            {
                '$group': {
                    '_id': '$subcategory',
                    'subcategory_name': { '$first': '$subcategory' },
                    'total_attempts': { '$sum': 1 },
                    'highest_score': { '$max': '$average_score' },
                    'average_score': { '$avg': '$average_score' },
                    'total_questions': { '$sum': '$total_questions' },
                    'total_correct': { '$sum': '$correct_answers' },
                    'last_attempt': { '$max': '$submitted_at' },
                    'attempts': {
                        '$push': {
                            'test_name': '$test_details.name',
                            'score': '$average_score',
                            'correct_answers': '$correct_answers',
                            'total_questions': '$total_questions',
                            'submitted_at': '$submitted_at',
                            'result_id': '$_id'
                        }
                    }
                }
            },
            {
                '$sort': { 'subcategory_name': 1 }
            }
        ]
        
        try:
            results = list(mongo_db.test_results.aggregate(pipeline))
        except Exception as e:
            current_app.logger.warning(f"Error aggregating grammar results: {e}, using empty results")
            results = []
        
        # Process results
        for result in results:
            result['subcategory_display_name'] = GRAMMAR_CATEGORIES.get(result['subcategory_name'], result['subcategory_name'])
            result['accuracy'] = (result['total_correct'] / result['total_questions'] * 100) if result['total_questions'] > 0 else 0
            result['last_attempt'] = result['last_attempt'].isoformat() if result['last_attempt'] else None
            result['status'] = 'completed' if result['highest_score'] >= 60 else 'needs_improvement'
            
            # Sort attempts by date
            result['attempts'].sort(key=lambda x: x['submitted_at'], reverse=True)
            
            # Convert ObjectIds to strings
            for attempt in result['attempts']:
                attempt['result_id'] = str(attempt['result_id'])
                attempt['submitted_at'] = attempt['submitted_at'].isoformat()
        
        # Convert any remaining ObjectId fields to strings for JSON serialization
        convert_objectids_to_strings(results)
        
        return jsonify({
            'success': True,
            'data': results
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching grammar detailed results for student {get_jwt_identity()}: {e}", exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to fetch grammar results.'}), 500

@student_bp.route('/vocabulary-detailed-results', methods=['GET'])
@jwt_required()
def get_vocabulary_detailed_results():
    """Get detailed vocabulary practice results"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if test_results collection exists
        if not hasattr(mongo_db, 'test_results'):
            current_app.logger.warning("test_results collection not found, returning empty vocabulary results")
            return jsonify({'success': True, 'data': []}), 200
        
        pipeline = [
            {
                '$match': {
                    'student_id': ObjectId(current_user_id),
                    'module_id': 'VOCABULARY',
                    'test_type': 'practice'
                }
            },
            {
                '$lookup': {
                    'from': 'tests',
                    'localField': 'test_id',
                    'foreignField': '_id',
                    'as': 'test_details'
                }
            },
            {
                '$unwind': '$test_details'
            },
            {
                '$group': {
                    '_id': '$test_details.level_id',
                    'level_name': { '$first': '$test_details.level_id' },
                    'total_attempts': { '$sum': 1 },
                    'highest_score': { '$max': '$average_score' },
                    'average_score': { '$avg': '$average_score' },
                    'total_questions': { '$sum': '$total_questions' },
                    'total_correct': { '$sum': '$correct_answers' },
                    'last_attempt': { '$max': '$submitted_at' },
                    'attempts': {
                        '$push': {
                            'test_name': '$test_details.name',
                            'score': '$average_score',
                            'correct_answers': '$correct_answers',
                            'total_questions': '$total_questions',
                            'submitted_at': '$submitted_at',
                            'result_id': '$_id'
                        }
                    }
                }
            },
            {
                '$sort': { 'level_name': 1 }
            }
        ]
        
        try:
            results = list(mongo_db.test_results.aggregate(pipeline))
        except Exception as e:
            current_app.logger.warning(f"Error aggregating vocabulary results: {e}, using empty results")
            results = []
        
        # Process results
        for result in results:
            result['level_display_name'] = LEVELS.get(result['level_name'], {}).get('name', result['level_name'])
            result['accuracy'] = (result['total_correct'] / result['total_questions'] * 100) if result['total_questions'] > 0 else 0
            result['last_attempt'] = result['last_attempt'].isoformat() if result['last_attempt'] else None
            result['status'] = 'completed' if result['highest_score'] >= 60 else 'needs_improvement'
            
            # Sort attempts by date
            result['attempts'].sort(key=lambda x: x['submitted_at'], reverse=True)
            
            # Convert ObjectIds to strings
            for attempt in result['attempts']:
                attempt['result_id'] = str(attempt['result_id'])
                attempt['submitted_at'] = attempt['submitted_at'].isoformat()
        
        # Convert any remaining ObjectId fields to strings for JSON serialization
        convert_objectids_to_strings(results)
        
        return jsonify({
            'success': True,
            'data': results
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching vocabulary detailed results for student {get_jwt_identity()}: {e}", exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to fetch vocabulary results.'}), 500

@student_bp.route('/progress-summary', methods=['GET'])
@jwt_required()
def get_progress_summary():
    """Get comprehensive progress summary for student"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if test_results collection exists
        if not hasattr(mongo_db, 'test_results'):
            current_app.logger.warning("test_results collection not found, returning empty progress")
            return jsonify({
                'success': True,
                'data': {
                    'total_practice_tests': 0,
                    'modules': [],
                    'recent_activity': []
                }
            }), 200
        
        # Get overall statistics
        total_results = mongo_db.test_results.count_documents({
            'student_id': ObjectId(current_user_id),
            'test_type': 'practice'
        })
        
        # Get module-wise statistics
        pipeline = [
            {
                '$match': {
                    'student_id': ObjectId(current_user_id),
                    'test_type': 'practice'
                }
            },
            {
                '$lookup': {
                    'from': 'tests',
                    'localField': 'test_id',
                    'foreignField': '_id',
                    'as': 'test_details'
                }
            },
            {'$unwind': '$test_details'},
            {
                '$group': {
                    '_id': '$test_details.module_id',
                    'module_name': { '$first': '$test_details.module_id' },
                    'total_attempts': { '$sum': 1 },
                    'highest_score': { '$max': '$average_score' },
                    'average_score': { '$avg': '$average_score' },
                    'total_questions': { '$sum': '$total_questions' },
                    'total_correct': { '$sum': '$correct_answers' },
                    'last_attempt': { '$max': '$submitted_at' }
                }
            }
        ]
        
        try:
            module_stats = list(mongo_db.test_results.aggregate(pipeline))
        except Exception as e:
            current_app.logger.warning(f"Error aggregating module stats: {e}, using empty stats")
            module_stats = []
        
        # Process module statistics
        for stat in module_stats:
            stat['module_display_name'] = MODULES.get(stat['module_name'], 'Unknown')
            stat['accuracy'] = (stat['total_correct'] / stat['total_questions'] * 100) if stat['total_questions'] > 0 else 0
            stat['last_attempt'] = stat['last_attempt'].isoformat() if stat['last_attempt'] else None
            stat['progress_percentage'] = min(100, (stat['highest_score'] / 100) * 100)
            # Convert ObjectId in _id to string if present
            if isinstance(stat.get('_id'), ObjectId):
                stat['_id'] = str(stat['_id'])
        
        # Get recent activity
        try:
            recent_activity = list(mongo_db.test_results.find({
                'student_id': ObjectId(current_user_id)
            }).sort('submitted_at', -1).limit(10))
        except Exception as e:
            current_app.logger.warning(f"Error fetching recent activity: {e}, using empty activity")
            recent_activity = []
        
        for activity in recent_activity:
            activity['_id'] = str(activity['_id'])
            activity['submitted_at'] = activity['submitted_at'].isoformat()
            # Convert any ObjectId fields in activity to string
            for k, v in activity.items():
                if isinstance(v, ObjectId):
                    activity[k] = str(v)
        
        summary = {
            'total_practice_tests': total_results,
            'modules': module_stats,
            'recent_activity': recent_activity
        }
        
        # Convert any ObjectId fields to strings for JSON serialization
        convert_objectids_to_strings(summary)
        
        return jsonify({
            'success': True,
            'data': summary
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching progress summary for student {get_jwt_identity()}: {e}", exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to fetch progress summary.'}), 500 

def get_students_for_test_ids(test_ids, assigned_student_ids=None):
    """
    Given a list of test IDs, return a list of students (dicts with at least email and name)
    assigned to those tests based on campus_ids, course_ids, and batch_ids.
    If assigned_student_ids is provided, only return those students.
    Fetch from students collection, join with users for email.
    """
    student_set = {}
    for test_id in test_ids:
        test = mongo_db.tests.find_one({'_id': ObjectId(test_id)})
        if not test:
            continue
        campus_ids = test.get('campus_ids', [])
        course_ids = test.get('course_ids', [])
        batch_ids = test.get('batch_ids', [])
        query = {}
        if campus_ids:
            query['campus_id'] = {'$in': campus_ids}
        if course_ids:
            query['course_id'] = {'$in': course_ids}
        if batch_ids:
            query['batch_id'] = {'$in': batch_ids}
        if assigned_student_ids:
            query['_id'] = {'$in': assigned_student_ids}
        if not query:
            continue
        students = mongo_db.students.find(query)
        for s in students:
            # Join with users collection to get email
            user = mongo_db.users.find_one({'_id': s.get('user_id')})
            email = user.get('email') if user else None
            if email:
                student_set[email] = {
                    'email': email,
                    'name': s.get('name', user.get('name', 'Student') if user else 'Student'),
                    'roll_number': s.get('roll_number'),
                    'student_id': str(s.get('_id')),
                    'mobile_number': s.get('mobile_number')
                }
    return list(student_set.values()) 

@student_bp.route('/students/assign', methods=['POST'])
@jwt_required()
def assign_student_to_instance():
    data = request.get_json()
    student_id = data.get('student_id')
    batch_course_instance_id = data.get('batch_course_instance_id')
    if not student_id or not batch_course_instance_id:
        return jsonify({'success': False, 'message': 'Missing student_id or batch_course_instance_id'}), 400
    result = mongo_db.students.update_one(
        {'_id': ObjectId(student_id)},
        {'$set': {'batch_course_instance_id': ObjectId(batch_course_instance_id)}}
    )
    if result.modified_count == 1:
        return jsonify({'success': True, 'message': 'Student assigned to batch-course instance'}), 200
    else:
        return jsonify({'success': False, 'message': 'Student not found or not updated'}), 404 

@student_bp.route('/unlocked-modules', methods=['GET'])
@jwt_required()
def get_unlocked_modules():
    """Return all modules and levels the student is allowed to access."""
    try:
        from config.constants import MODULES, LEVELS
        current_user_id = get_jwt_identity()
        student = mongo_db.students.find_one({'user_id': ObjectId(current_user_id)})
        # Define the desired order - exclude CRT modules
        module_order = ['GRAMMAR', 'VOCABULARY', 'LISTENING', 'SPEAKING', 'READING', 'WRITING']
        # Build a list of (module_id, module_name) in the desired order, excluding CRT modules
        ordered_modules = []
        for mid in module_order:
            if mid in MODULES and not mid.startswith('CRT_'):
                ordered_modules.append((mid, MODULES[mid]))
        for mid, mname in MODULES.items():
            if mid not in module_order and not mid.startswith('CRT_'):
                ordered_modules.append((mid, mname))
        modules_status = []
        if not student or not student.get('authorized_levels'):
            for module_id, module_name in ordered_modules:
                levels = [
                    {
                        'level_id': level_id,
                        'level_name': level['name'] if isinstance(level, dict) else level,
                        'unlocked': (
                            module_id == 'GRAMMAR' or module_id == 'VOCABULARY'
                        )
                    }
                    for level_id, level in LEVELS.items()
                    if (level.get('module_id') if isinstance(level, dict) else None) == module_id
                ]
                modules_status.append({
                    'module_id': module_id,
                    'module_name': module_name,
                    'unlocked': (
                        module_id == 'GRAMMAR' or module_id == 'VOCABULARY'
                    ),
                    'levels': levels
                })
            return jsonify({'success': True, 'data': modules_status}), 200
        # If student has authorized_levels, use them
        authorized_levels = set(student.get('authorized_levels', []))
        for module_id, module_name in ordered_modules:
            if module_id in ['GRAMMAR', 'VOCABULARY']:
                unlocked = True
                levels = [
                    {
                        'level_id': level_id,
                        'level_name': level['name'] if isinstance(level, dict) else level,
                        'unlocked': True
                    }
                    for level_id, level in LEVELS.items()
                    if (level.get('module_id') if isinstance(level, dict) else None) == module_id
                ]
            else:
                levels = [
                    {
                        'level_id': level_id,
                        'level_name': level['name'] if isinstance(level, dict) else level,
                        'unlocked': level_id in authorized_levels
                    }
                    for level_id, level in LEVELS.items()
                    if (level.get('module_id') if isinstance(level, dict) else None) == module_id
                ]
                unlocked = any(l['unlocked'] for l in levels) if levels else False
            modules_status.append({
                'module_id': module_id,
                'module_name': module_name,
                'unlocked': unlocked,
                'levels': levels
            })
        return jsonify({'success': True, 'data': modules_status}), 200
    except Exception as e:
        import logging
        logging.error(f"Error fetching unlocked modules for student: {e}")
        return jsonify({'success': False, 'message': 'An error occurred fetching unlocked modules.'}), 500 