from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from mongo import mongo_db
from bson import ObjectId
from config.constants import GRAMMAR_CATEGORIES, MODULES
import logging
from datetime import datetime

student_bp = Blueprint('student', __name__)

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
        
        # Get student progress
        progress = list(mongo_db.db.student_progress.find({'student_id': current_user_id}))
        
        dashboard_data = {
            'user_id': str(current_user_id),
            'progress': progress
        }
        
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
def get_available_tests():
    """Get available tests for a student, with optional filtering."""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.db.users.find_one({'_id': ObjectId(current_user_id)})
        
        if not user or user.get('role') != 'student':
            return jsonify({'success': False, 'message': 'Access denied'}), 403

        # Base query for active practice tests assigned to the student's audience
        query = {
            'test_type': 'practice', 
            'status': 'active',
            '$or': [
                { 'campus_ids': {'$in': [user.get('campus_id')]} },
                { 'course_ids': {'$in': [user.get('course_id')]} },
                { 'batch_ids': {'$in': [user.get('batch_id')]} }
            ]
        }

        # Filter by module and subcategory if provided from the frontend
        module_id = request.args.get('module')
        if module_id:
            query['module_id'] = module_id
        
        subcategory_id = request.args.get('subcategory')
        if subcategory_id:
            query['subcategory'] = subcategory_id
        
        # Projection to avoid sending large question data
        projection = { "name": 1 }
        
        pipeline = [
            { '$match': query },
            {
                '$lookup': {
                    'from': 'test_results',
                    'let': { 'test_id': '$_id' },
                    'pipeline': [
                        {
                            '$match': {
                                '$expr': {
                                    '$and': [
                                        { '$eq': ['$test_id', '$$test_id'] },
                                        { '$eq': ['$student_id', ObjectId(current_user_id)] }
                                    ]
                                }
                            }
                        },
                        { '$sort': { 'average_score': -1 } },
                        { '$limit': 1 }
                    ],
                    'as': 'student_results'
                }
            },
            {
                '$addFields': {
                    'highest_score': { '$ifNull': [{ '$arrayElemAt': ['$student_results.average_score', 0] }, 0] }
                }
            },
            {
                '$project': {
                    'name': 1,
                    'highest_score': 1
                }
            }
        ]

        tests = list(mongo_db.db.tests.aggregate(pipeline))

        # Manually process tests to serialize and clean up data for the list view
        tests_data = []
        for test in tests:
            tests_data.append({
                '_id': str(test['_id']),
                'name': test.get('name', 'Untitled Test'),
                'highest_score': test.get('highest_score', 0)
            })
        
        return jsonify({
            'success': True,
            'message': 'Tests retrieved successfully',
            'data': tests_data
        }), 200
        
    except Exception as e:
        logging.error(f"Error in /student/tests for user {current_user_id}: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'An error occurred while fetching tests: {str(e)}'
        }), 500

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
            results = list(mongo_db.db.test_results.find({
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
             logging.error(f"Database error fetching grammar progress for user {current_user_id}: {db_error}", exc_info=True)
             return jsonify({'success': False, 'message': 'An internal error occurred while fetching your progress.'}), 500

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

@student_bp.route('/online-exams', methods=['GET'])
@jwt_required()
def get_online_exams():
    """Get available online exams for a student."""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.db.users.find_one({'_id': ObjectId(current_user_id)})
        
        if not user or user.get('role') != 'student':
            return jsonify({'success': False, 'message': 'Access denied'}), 403

        # Base query for active online exams assigned to the student's audience
        query = {
            'test_type': 'online', 
            'status': 'active',
            'campus_ids': user.get('campus_id'),
            'course_ids': user.get('course_id')
        }
        
        # This part can be extended with batch_ids if needed
        # 'batch_ids': user.get('batch_id')

        projection = { "questions": 0, "audio_config": 0 }
        
        exams = list(mongo_db.db.tests.find(query, projection))

        # Prepare data for frontend
        exams_data = []
        for exam in exams:
            module_name = MODULES.get(exam.get('module_id'), 'N/A')
            level_name = "N/A"
            if exam.get('module_id') == 'GRAMMAR':
                level_name = GRAMMAR_CATEGORIES.get(exam.get('subcategory'), 'N/A')
            else:
                level_name = LEVELS.get(exam.get('level_id'), 'N/A')

            exams_data.append({
                '_id': str(exam['_id']),
                'name': exam.get('name'),
                'module_name': module_name,
                'level_name': level_name,
                'question_count': len(exam.get('questions', [])) if 'questions' in exam else 'N/A'
            })
        
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
        user = mongo_db.db.users.find_one({'_id': ObjectId(current_user_id)})
        
        if not user or user.get('role') != 'student':
            return jsonify({'success': False, 'message': 'Access denied'}), 403

        test = mongo_db.db.tests.find_one({'_id': ObjectId(test_id)})
        if not test:
            return jsonify({'success': False, 'message': 'Test not found'}), 404

        # You might want to add an access check here to ensure the student
        # is actually assigned to this test, similar to the /tests endpoint.

        # We don't want to send the correct answers to the student before they take the test.
        projection = { 'questions.correct_answer': 0 }
        test_details = mongo_db.db.tests.find_one({'_id': ObjectId(test_id)}, projection)
        
        # Manually serialize and clean data
        test_details['_id'] = str(test_details['_id'])
        if 'created_by' in test_details:
             test_details['created_by'] = str(test_details['created_by'])
        
        for key in ['campus_ids', 'course_ids', 'batch_ids']:
            if key in test_details:
                test_details[key] = [str(item) for item in test_details[key]]

        return jsonify({'success': True, 'data': test_details})

    except Exception as e:
        logging.error(f"Error fetching single test {test_id} for student {current_user_id}: {e}", exc_info=True)
        return jsonify({'success': False, 'message': 'Could not load test details.'}), 500

@student_bp.route('/submit-test', methods=['POST'])
@jwt_required()
def submit_student_test():
    """Submit a test (practice or online) with student's answers."""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()

        if not data or 'test_id' not in data or 'answers' not in data:
            return jsonify({'success': False, 'message': 'Test ID and answers are required.'}), 400

        test_id = ObjectId(data['test_id'])
        test = mongo_db.db.tests.find_one({'_id': test_id})

        if not test:
            return jsonify({'success': False, 'message': 'Test not found'}), 404
        
        # NOTE: Add access validation here if needed

        results = []
        total_score = 0
        correct_answers_count = 0
        
        answers = data.get('answers', {})

        for q in test['questions']:
            q_id = q.get('question_id')
            student_answer = answers.get(q_id)
            is_correct = student_answer == q.get('correct_answer')
            score = 100 if is_correct else 0
            
            if is_correct:
                correct_answers_count += 1
            total_score += score
            
            results.append({
                'question_id': q_id,
                'question': q.get('question'),
                'student_answer': student_answer,
                'correct_answer': q.get('correct_answer'),
                'is_correct': is_correct,
                'score': score
            })

        average_score = total_score / len(test['questions']) if test['questions'] else 0

        result_doc = {
            'student_id': ObjectId(current_user_id),
            'test_id': test_id,
            'module_id': test.get('module_id'),
            'subcategory': test.get('subcategory'),
            'level_id': test.get('level_id'),
            'results': results,
            'total_score': total_score,
            'average_score': average_score,
            'correct_answers': correct_answers_count,
            'total_questions': len(test['questions']),
            'submitted_at': datetime.utcnow(),
            'test_type': test.get('test_type', 'practice')
        }
        
        result_id = mongo_db.db.test_results.insert_one(result_doc).inserted_id

        return jsonify({
            'success': True,
            'message': 'Test submitted successfully!',
            'data': {
                'result_id': str(result_id),
                'average_score': average_score,
                'total_questions': len(test['questions']),
                'correct_answers': correct_answers_count,
                'results': results
            }
        }), 201

    except Exception as e:
        logging.error(f"Error submitting test for student {get_jwt_identity()}: {e}", exc_info=True)
        return jsonify({'success': False, 'message': 'An internal server error occurred.'}), 500 