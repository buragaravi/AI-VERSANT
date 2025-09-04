from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
import pytz
from mongo import mongo_db
from routes.test_management import require_superadmin, generate_unique_test_id, convert_objectids, generate_test_link

mcq_test_bp = Blueprint('mcq_test_management', __name__)

@mcq_test_bp.route('/create', methods=['POST'])
@jwt_required()
@require_superadmin
def create_mcq_test():
    """Create MCQ test for Grammar, Vocabulary, Reading modules"""
    try:
        data = request.get_json()
        test_name = data.get('test_name')
        test_type = data.get('test_type')
        module_id = data.get('module_id')
        level_id = data.get('level_id')
        subcategory = data.get('subcategory')
        campus_id = data.get('campus_id')
        course_ids = data.get('course_ids', [])
        batch_ids = data.get('batch_ids', [])
        questions = data.get('questions', [])
        assigned_student_ids = data.get('assigned_student_ids', [])
        startDateTime = data.get('startDateTime')
        endDateTime = data.get('endDateTime')
        duration = data.get('duration')

        # Validate required fields
        if not all([test_name, test_type, module_id, campus_id, course_ids, batch_ids]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400

        # Validate MCQ modules
        mcq_modules = ['GRAMMAR', 'VOCABULARY', 'READING']
        if module_id not in mcq_modules:
            return jsonify({'success': False, 'message': f'Invalid module for MCQ test: {module_id}'}), 400

        # Check if test name already exists
        existing_test = mongo_db.tests.find_one({'name': test_name})
        if existing_test:
            return jsonify({'success': False, 'message': f'Test name "{test_name}" already exists. Please choose a different name.'}), 409

        # Generate unique test ID
        test_id = generate_unique_test_id()

        # Create test document
        test_doc = {
            'test_id': test_id,
            'name': test_name,
            'test_type': test_type.lower(),
            'module_id': module_id,
            'level_id': level_id,
            'subcategory': subcategory,
            'campus_ids': [ObjectId(campus_id)],
            'course_ids': [ObjectId(cid) for cid in course_ids],
            'batch_ids': [ObjectId(bid) for bid in batch_ids],
            'questions': questions,
            'assigned_student_ids': [ObjectId(sid) for sid in assigned_student_ids],
            'created_by': ObjectId(get_jwt_identity()),
            'created_at': datetime.now(pytz.utc),
            'status': 'active',
            'is_active': True
        }

        # Add online test specific fields
        if test_type.lower() == 'online':
            if not all([startDateTime, endDateTime, duration]):
                return jsonify({'success': False, 'message': 'Start date, end date, and duration are required for online tests'}), 400
            
            test_doc.update({
                'startDateTime': datetime.fromisoformat(startDateTime.replace('Z', '+00:00')),
                'endDateTime': datetime.fromisoformat(endDateTime.replace('Z', '+00:00')),
                'duration': int(duration)
            })

        # Insert test
        result = mongo_db.tests.insert_one(test_doc)
        
        # Update question usage count for questions from the bank
        if questions:
            for question in questions:
                if question.get('_id'):  # Only update questions that have an _id (from question bank)
                    try:
                        mongo_db.question_bank.update_one(
                            {'_id': ObjectId(question['_id'])},
                            {
                                '$inc': {'used_count': 1},
                                '$set': {'last_used': datetime.now(pytz.utc)},
                                '$push': {'used_in_tests': test_id}
                            }
                        )
                    except Exception as e:
                        current_app.logger.warning(f"Failed to update usage count for question {question.get('_id')}: {e}")

        return jsonify({
            'success': True,
            'message': 'MCQ test created successfully',
            'data': {
                'test_id': test_id
            }
        }), 201

    except Exception as e:
        current_app.logger.error(f"Error creating MCQ test: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@mcq_test_bp.route('/<test_id>', methods=['GET'])
@jwt_required()
@require_superadmin
def get_mcq_test(test_id):
    """Get MCQ test details"""
    try:
        test = mongo_db.tests.find_one({'_id': ObjectId(test_id)})
        if not test:
            return jsonify({'success': False, 'message': 'Test not found'}), 404

        # Validate it's an MCQ test
        mcq_modules = ['GRAMMAR', 'VOCABULARY', 'READING']
        if test.get('module_id') not in mcq_modules:
            return jsonify({'success': False, 'message': 'Not an MCQ test'}), 400

        test['_id'] = str(test['_id'])
        test = convert_objectids(test)
        
        return jsonify({'success': True, 'data': test}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching MCQ test {test_id}: {e}")
        return jsonify({'success': False, 'message': f'An error occurred while fetching the test: {e}'}), 500

@mcq_test_bp.route('/<test_id>/validate', methods=['POST'])
@jwt_required()
@require_superadmin
def validate_mcq_test(test_id):
    """Validate MCQ test configuration"""
    try:
        test = mongo_db.tests.find_one({'_id': ObjectId(test_id)})
        if not test:
            return jsonify({'success': False, 'message': 'Test not found'}), 404

        # Validate MCQ test structure
        questions = test.get('questions', [])
        if not questions:
            return jsonify({'success': False, 'message': 'Test has no questions'}), 400

        validation_results = []
        for i, question in enumerate(questions):
            validation = {
                'question_index': i,
                'question': question.get('question', ''),
                'has_options': all(key in question for key in ['optionA', 'optionB', 'optionC', 'optionD']),
                'has_answer': 'answer' in question and question['answer'],
                'is_valid': True,
                'errors': []
            }
            
            if not validation['has_options']:
                validation['is_valid'] = False
                validation['errors'].append('Missing MCQ options')
            
            if not validation['has_answer']:
                validation['is_valid'] = False
                validation['errors'].append('Missing correct answer')
            
            validation_results.append(validation)

        all_valid = all(v['is_valid'] for v in validation_results)
        
        return jsonify({
            'success': True,
            'data': {
                'test_id': test_id,
                'total_questions': len(questions),
                'valid_questions': sum(1 for v in validation_results if v['is_valid']),
                'invalid_questions': sum(1 for v in validation_results if not v['is_valid']),
                'all_valid': all_valid,
                'validation_results': validation_results
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error validating MCQ test {test_id}: {e}")
        return jsonify({'success': False, 'message': f'An error occurred while validating the test: {e}'}), 500

@mcq_test_bp.route('/<test_id>/notify', methods=['POST'])
@jwt_required()
@require_superadmin
def notify_mcq_test_students(test_id):
    """Notify students about MCQ test"""
    try:
        test = mongo_db.tests.find_one({'_id': ObjectId(test_id)})
        if not test:
            return jsonify({'success': False, 'message': 'Test not found'}), 404

        # Get students for this test
        from routes.student import get_students_for_test_ids
        student_list = get_students_for_test_ids([test_id])
        
        if not student_list:
            return jsonify({'success': False, 'message': 'No students found for this test'}), 404

        # Send notifications
        results = []
        for student in student_list:
            try:
                # Send email notification
                from utils.email_service import send_email, render_template
                try:
                    html_content = render_template('test_notification.html', 
                        student_name=student['name'],
                        test_name=test['name'],
                        test_id=str(test['_id']),
                        test_type='MCQ',
                        module=test.get('module_id', 'Unknown'),
                        level=test.get('level_id', 'Unknown'),
                        module_display_name=test.get('module_id', 'Unknown'),
                        level_display_name=test.get('level_id', 'Unknown'),
                        question_count=len(test.get('questions', [])),
                        is_online=test.get('test_type') == 'online',
                        start_dt=test.get('startDateTime', 'Not specified'),
                        end_dt=test.get('endDateTime', 'Not specified'),
                        duration=test.get('duration', 'Not specified')
                    )
                except Exception as template_error:
                    current_app.logger.error(f"Template rendering failed for {student['email']}: {template_error}")
                    html_content = f"""
                    <html>
                    <body>
                        <h2>New MCQ Test Available: {test['name']}</h2>
                        <p>Hello {student['name']},</p>
                        <p>You have been assigned a new MCQ test: {test['name']}</p>
                        <p>Module: {test.get('module_id', 'Unknown')}</p>
                        <p>Level: {test.get('level_id', 'Unknown')}</p>
                        <p>Questions: {len(test.get('questions', []))}</p>
                        <p>Please log in to your account to take the test.</p>
                    </body>
                    </html>
                    """
                
                email_sent = send_email(
                    to_email=student['email'],
                    to_name=student['name'],
                    subject=f"New MCQ Test Available: {test['name']}",
                    html_content=html_content
                )
                
                # Send SMS notification if mobile number is available
                sms_sent = False
                mobile_number = student.get('mobile_number', '')
                if mobile_number:
                    try:
                        from utils.sms_service import send_sms
                        sms_message = f"New MCQ test '{test['name']}' assigned to you. Login to take the test. - Study Edge"
                        sms_sent = send_sms(mobile_number, sms_message)
                        current_app.logger.info(f"SMS sent to {mobile_number}: {sms_sent}")
                    except Exception as sms_error:
                        current_app.logger.error(f"Failed to send SMS to {mobile_number}: {sms_error}")
                        sms_sent = False
                else:
                    current_app.logger.info(f"No mobile number for student {student['name']}")
                
                # Generate test link for the student
                test_link = generate_test_link(test, student)
                
                results.append({
                    'student_id': student['_id'],
                    'student_name': student['name'],
                    'email': student['email'],
                    'mobile_number': mobile_number,
                    'email_sent': email_sent,
                    'sms_sent': sms_sent,
                    'test_link': test_link,
                    'status': 'success' if (email_sent or sms_sent) else 'failed'
                })
            except Exception as e:
                current_app.logger.error(f"Failed to notify student {student['_id']}: {e}")
                # Generate test link for the student even if email fails
                test_link = generate_test_link(test, student)
                
                # Try to send SMS even if email failed
                sms_sent = False
                mobile_number = student.get('mobile_number', '')
                if mobile_number:
                    try:
                        from utils.sms_service import send_sms
                        sms_message = f"New MCQ test '{test['name']}' assigned to you. Login to take the test. - Study Edge"
                        sms_sent = send_sms(mobile_number, sms_message)
                        current_app.logger.info(f"SMS sent to {mobile_number}: {sms_sent}")
                    except Exception as sms_error:
                        current_app.logger.error(f"Failed to send SMS to {mobile_number}: {sms_error}")
                        sms_sent = False
                
                results.append({
                    'student_id': student['_id'],
                    'student_name': student['name'],
                    'email': student['email'],
                    'mobile_number': mobile_number,
                    'email_sent': False,
                    'sms_sent': sms_sent,
                    'test_link': test_link,
                    'status': 'success' if sms_sent else 'failed',
                    'error': str(e)
                })

        return jsonify({
            'success': True,
            'message': f'MCQ test notification sent to {len(results)} students',
            'data': {
                'test_id': test_id,
                'test_name': test['name'],
                'notifications_sent': len(results),
                'results': results
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error notifying MCQ test students: {e}")
        return jsonify({'success': False, 'message': f'Failed to send notifications: {e}'}), 500 