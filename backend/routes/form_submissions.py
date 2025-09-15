from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
import logging
import json

from config.database import DatabaseConfig
from models_forms import FormSubmission, FormResponse, FORMS_COLLECTION, FORM_SUBMISSIONS_COLLECTION
from routes.test_management import require_superadmin

form_submissions_bp = Blueprint('form_submissions', __name__)
mongo_db = DatabaseConfig.get_database()
logger = logging.getLogger(__name__)

def format_field_value(value, field_type):
    """Format field value for display based on field type"""
    if value is None:
        return 'No response'
    
    if field_type == 'checkbox':
        if isinstance(value, list):
            return ', '.join(str(v) for v in value)
        return str(value)
    elif field_type == 'radio':
        return str(value)
    elif field_type == 'dropdown':
        return str(value)
    elif field_type == 'textarea':
        return str(value)
    elif field_type == 'email':
        return str(value)
    elif field_type == 'number':
        return str(value)
    elif field_type == 'date':
        return str(value)
    else:  # text and other types
        return str(value)

def get_client_ip():
    """Get client IP address"""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr

@form_submissions_bp.route('/student/forms', methods=['GET'])
@jwt_required()
def get_student_forms():
    """Get forms available for student submission"""
    try:
        student_id = ObjectId(get_jwt_identity())
        
        # Get active forms
        forms = list(mongo_db[FORMS_COLLECTION].find({
            'settings.isActive': True,
            '$or': [
                {'settings.submissionDeadline': {'$exists': False}},
                {'settings.submissionDeadline': None},
                {'settings.submissionDeadline': {'$gt': datetime.utcnow()}}
            ]
        }).sort('created_at', -1))
        
        # Check which forms student has already submitted
        form_ids = [str(form['_id']) for form in forms]  # Convert to strings
        
        submissions = list(mongo_db[FORM_SUBMISSIONS_COLLECTION].find({
            'form_id': {'$in': form_ids},
            'student_id': str(student_id),
            'status': 'submitted'
        }))
        
        # Convert form IDs to strings for comparison
        submitted_form_ids = {str(sub['form_id']) for sub in submissions}
        
        # Process forms and filter based on submission status
        processed_forms = []
        
        for form in forms:
            form['_id'] = str(form['_id'])
            form['created_by'] = str(form['created_by'])
            form['isSubmitted'] = form['_id'] in submitted_form_ids
            form['isRequired'] = form.get('is_required', False)
            
            # Check if multiple submissions are allowed
            if not form['settings'].get('allowMultipleSubmissions', False):
                form['canSubmit'] = not form['isSubmitted']
            else:
                form['canSubmit'] = True
            
            # For required forms: only return if not submitted yet
            # For non-required forms: return all active forms
            if form['isRequired']:
                if not form['isSubmitted']:
                    processed_forms.append(form)
            else:
                # Non-required forms: return all (for optional forms)
                processed_forms.append(form)
        
        return jsonify({
            "success": True,
            "data": {
                "forms": processed_forms
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching student forms: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch forms"
        }), 500

@form_submissions_bp.route('/student/recent-submissions', methods=['GET'])
@jwt_required()
def get_student_recent_submissions():
    """Get recent form submissions for student"""
    try:
        student_id = ObjectId(get_jwt_identity())
        
        # Get recent submissions
        submissions = list(mongo_db[FORM_SUBMISSIONS_COLLECTION].find({
            'student_id': str(student_id),
            'status': 'submitted'
        }).sort('submitted_at', -1).limit(10))
        
        # Get form details for each submission
        form_ids = [ObjectId(sub['form_id']) for sub in submissions]
        forms = list(mongo_db[FORMS_COLLECTION].find({
            '_id': {'$in': form_ids}
        }))
        
        form_map = {str(form['_id']): form for form in forms}
        
        # Combine submission data with form details
        recent_submissions = []
        for submission in submissions:
            form = form_map.get(submission['form_id'])
            if form:
                recent_submissions.append({
                    'submission_id': str(submission['_id']),
                    'form_id': submission['form_id'],
                    'form_title': form['title'],
                    'submitted_at': submission['submitted_at'],
                    'responses_count': len(submission.get('responses', []))
                })
        
        return jsonify({
            "success": True,
            "data": {
                "submissions": recent_submissions
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching recent submissions: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch recent submissions"
        }), 500

@form_submissions_bp.route('/student/forms/<form_id>', methods=['GET'])
@jwt_required()
def get_student_form(form_id):
    """Get specific form for student submission"""
    try:
        if not ObjectId.is_valid(form_id):
            return jsonify({
                "success": False,
                "message": "Invalid form ID"
            }), 400
        
        student_id = ObjectId(get_jwt_identity())
        
        # Get form
        form = mongo_db[FORMS_COLLECTION].find_one({'_id': ObjectId(form_id)})
        if not form:
            return jsonify({
                "success": False,
                "message": "Form not found"
            }), 404
        
        # Check if form is active
        if not form['settings'].get('isActive', False):
            return jsonify({
                "success": False,
                "message": "Form is not active"
            }), 400
        
        # Check submission deadline
        deadline = form['settings'].get('submissionDeadline')
        if deadline and deadline < datetime.utcnow():
            return jsonify({
                "success": False,
                "message": "Form submission deadline has passed"
            }), 400
        
        # Get existing submission if any
        existing_submission = mongo_db[FORM_SUBMISSIONS_COLLECTION].find_one({
            'form_id': ObjectId(form_id),
            'student_id': student_id
        })
        
        form['_id'] = str(form['_id'])
        form['created_by'] = str(form['created_by'])
        
        response_data = {
            "form": form,
            "existingSubmission": None
        }
        
        if existing_submission:
            existing_submission['_id'] = str(existing_submission['_id'])
            existing_submission['form_id'] = str(existing_submission['form_id'])
            existing_submission['student_id'] = str(existing_submission['student_id'])
            response_data['existingSubmission'] = existing_submission
        
        return jsonify({
            "success": True,
            "data": response_data
        })
        
    except Exception as e:
        logger.error(f"Error fetching student form: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch form"
        }), 500

@form_submissions_bp.route('/student/submit', methods=['POST'])
@jwt_required()
def submit_form():
    """Submit form response"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "message": "No data provided"
            }), 400
        
        form_id = data.get('form_id')
        responses = data.get('responses', [])
        status = data.get('status', 'submitted')  # draft or submitted
        
        if not form_id or not ObjectId.is_valid(form_id):
            return jsonify({
                "success": False,
                "message": "Invalid form ID"
            }), 400
        
        student_id = ObjectId(get_jwt_identity())
        
        # Get form
        form = mongo_db[FORMS_COLLECTION].find_one({'_id': ObjectId(form_id)})
        if not form:
            return jsonify({
                "success": False,
                "message": "Form not found"
            }), 404
        
        # Check if form is active
        if not form['settings'].get('isActive', False):
            return jsonify({
                "success": False,
                "message": "Form is not active"
            }), 400
        
        # Check submission deadline
        deadline = form['settings'].get('submissionDeadline')
        if deadline and deadline < datetime.utcnow():
            return jsonify({
                "success": False,
                "message": "Form submission deadline has passed"
            }), 400
        
        # Check if multiple submissions are allowed
        if not form['settings'].get('allowMultipleSubmissions', False):
            existing_submission = mongo_db[FORM_SUBMISSIONS_COLLECTION].find_one({
                'form_id': ObjectId(form_id),
                'student_id': str(student_id),
                'status': 'submitted'
            })
            if existing_submission:
                return jsonify({
                    "success": False,
                    "message": "Form has already been submitted"
                }), 400
        
        # Validate responses
        validation_errors = []
        form_fields = {field['field_id']: field for field in form['fields']}
        
        for response in responses:
            field_id = response.get('field_id')
            value = response.get('value')
            
            if field_id not in form_fields:
                validation_errors.append(f"Unknown field: {field_id}")
                continue
            
            field = form_fields[field_id]
            error = validate_field_value(field, value)
            if error:
                validation_errors.append(error)
        
        if validation_errors:
            return jsonify({
                "success": False,
                "message": "Validation errors",
                "errors": validation_errors
            }), 400
        
        # Create form responses
        form_responses = []
        for response in responses:
            form_response = FormResponse(
                field_id=response['field_id'],
                value=response['value'],
                submitted_at=datetime.utcnow()
            )
            form_responses.append(form_response)
        
        # Check if submission already exists (for draft updates)
        existing_submission = mongo_db[FORM_SUBMISSIONS_COLLECTION].find_one({
            'form_id': ObjectId(form_id),
            'student_id': str(student_id)
        })
        
        if existing_submission:
            # Update existing submission
            update_data = {
                'responses': [response.to_dict() for response in form_responses],
                'status': status,
                'submitted_at': datetime.utcnow() if status == 'submitted' else None,
                'ip_address': get_client_ip()
            }
            
            result = mongo_db[FORM_SUBMISSIONS_COLLECTION].update_one(
                {'_id': existing_submission['_id']},
                {'$set': update_data}
            )
            
            if result.modified_count > 0:
                return jsonify({
                    "success": True,
                    "message": f"Form {'submitted' if status == 'submitted' else 'saved as draft'} successfully",
                    "data": {
                        "submission_id": str(existing_submission['_id']),
                        "status": status
                    }
                })
            else:
                return jsonify({
                    "success": False,
                    "message": "Failed to update submission"
                }), 500
        else:
            # Create new submission
            submission = FormSubmission(
                form_id=ObjectId(form_id),
                student_id=student_id,
                responses=form_responses,
                status=status,
                ip_address=get_client_ip()
            )
            
            result = mongo_db[FORM_SUBMISSIONS_COLLECTION].insert_one(submission.to_dict())
            
            if result.inserted_id:
                return jsonify({
                    "success": True,
                    "message": f"Form {'submitted' if status == 'submitted' else 'saved as draft'} successfully",
                    "data": {
                        "submission_id": str(result.inserted_id),
                        "status": status
                    }
                })
            else:
                return jsonify({
                    "success": False,
                    "message": "Failed to create submission"
                }), 500
        
    except Exception as e:
        logger.error(f"Error submitting form: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to submit form"
        }), 500

@form_submissions_bp.route('/admin/submissions', methods=['GET'])
@jwt_required()
@require_superadmin
def get_form_submissions():
    """Get all form submissions with filtering and pagination"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        form_id = request.args.get('form_id', '')
        student_id = request.args.get('student_id', '')
        status = request.args.get('status', '')
        search = request.args.get('search', '')
        
        # Build query
        query = {}
        if form_id and ObjectId.is_valid(form_id):
            query['form_id'] = form_id  # form_id is stored as string, not ObjectId
        if student_id and ObjectId.is_valid(student_id):
            query['student_id'] = student_id  # student_id is stored as string, not ObjectId
        if status:
            query['status'] = status
        
        # Get total count
        total = mongo_db[FORM_SUBMISSIONS_COLLECTION].count_documents(query)
        
        # Get submissions with pagination
        skip = (page - 1) * limit
        submissions = list(mongo_db[FORM_SUBMISSIONS_COLLECTION].find(query)
                          .sort('submitted_at', -1)
                          .skip(skip)
                          .limit(limit))
        
        # Convert ObjectId to string and populate form/student details
        for submission in submissions:
            submission['_id'] = str(submission['_id'])
            submission['form_id'] = str(submission['form_id'])
            submission['student_id'] = str(submission['student_id'])
            
            # Get form details
            form = mongo_db[FORMS_COLLECTION].find_one({'_id': ObjectId(submission['form_id'])})
            if form:
                submission['form_title'] = form['title']
                submission['form_template_type'] = form.get('template_type', 'custom')
                
                # Process form responses with field labels
                if 'responses' in submission:
                    processed_responses = []
                    for response in submission['responses']:
                        field_id = response.get('field_id')
                        field_value = response.get('value')
                        
                        # Find the field definition in the form
                        field_definition = None
                        for field in form.get('fields', []):
                            if field.get('field_id') == field_id:
                                field_definition = field
                                break
                        
                        if field_definition:
                            processed_responses.append({
                                'field_id': field_id,
                                'field_label': field_definition.get('label', 'Unknown Field'),
                                'field_type': field_definition.get('type', 'text'),
                                'field_required': field_definition.get('required', False),
                                'value': field_value,
                                'display_value': format_field_value(field_value, field_definition.get('type', 'text'))
                            })
                        else:
                            processed_responses.append({
                                'field_id': field_id,
                                'field_label': 'Unknown Field',
                                'field_type': 'text',
                                'field_required': False,
                                'value': field_value,
                                'display_value': str(field_value) if field_value is not None else 'No response'
                            })
                    
                    submission['form_responses'] = processed_responses
                else:
                    submission['form_responses'] = []
            
            # Get student details with course, batch, and campus information
            student = mongo_db['students'].find_one({'_id': ObjectId(submission['student_id'])})
            if student:
                submission['student_name'] = student.get('name', 'Unknown')
                submission['student_email'] = student.get('email', 'Unknown')
                submission['student_roll_number'] = student.get('roll_number', 'Unknown')
                submission['student_mobile'] = student.get('mobile_number', 'Unknown')
                
                # Get course details
                course = mongo_db['courses'].find_one({'_id': student.get('course_id')})
                if course:
                    submission['student_course'] = course.get('name', 'Unknown')
                else:
                    submission['student_course'] = 'Unknown'
                
                # Get batch details
                batch = mongo_db['batches'].find_one({'_id': student.get('batch_id')})
                if batch:
                    submission['student_batch'] = batch.get('name', 'Unknown')
                else:
                    submission['student_batch'] = 'Unknown'
                
                # Get campus details
                campus = mongo_db['campuses'].find_one({'_id': student.get('campus_id')})
                if campus:
                    submission['student_campus'] = campus.get('name', 'Unknown')
                else:
                    submission['student_campus'] = 'Unknown'
        
        return jsonify({
            "success": True,
            "data": {
                "submissions": submissions,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                }
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching form submissions: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch form submissions"
        }), 500

@form_submissions_bp.route('/admin/submissions/<submission_id>', methods=['GET'])
@jwt_required()
@require_superadmin
def get_form_submission(submission_id):
    """Get specific form submission"""
    try:
        if not ObjectId.is_valid(submission_id):
            return jsonify({
                "success": False,
                "message": "Invalid submission ID"
            }), 400
        
        submission = mongo_db[FORM_SUBMISSIONS_COLLECTION].find_one({'_id': ObjectId(submission_id)})
        if not submission:
            return jsonify({
                "success": False,
                "message": "Submission not found"
            }), 404
        
        # Convert ObjectId to string
        submission['_id'] = str(submission['_id'])
        submission['form_id'] = str(submission['form_id'])
        submission['student_id'] = str(submission['student_id'])
        
        # Get form details
        form = mongo_db[FORMS_COLLECTION].find_one({'_id': ObjectId(submission['form_id'])})
        if form:
            submission['form_details'] = {
                'title': form['title'],
                'description': form['description'],
                'template_type': form.get('template_type', 'custom'),
                'fields': form['fields']
            }
            
            # Process form responses with field labels
            if 'responses' in submission:
                processed_responses = []
                for response in submission['responses']:
                    field_id = response.get('field_id')
                    field_value = response.get('value')
                    
                    # Find the field definition in the form
                    field_definition = None
                    for field in form.get('fields', []):
                        if field.get('field_id') == field_id:
                            field_definition = field
                            break
                    
                    if field_definition:
                        processed_responses.append({
                            'field_id': field_id,
                            'field_label': field_definition.get('label', 'Unknown Field'),
                            'field_type': field_definition.get('type', 'text'),
                            'field_required': field_definition.get('required', False),
                            'value': field_value,
                            'display_value': format_field_value(field_value, field_definition.get('type', 'text'))
                        })
                    else:
                        processed_responses.append({
                            'field_id': field_id,
                            'field_label': 'Unknown Field',
                            'field_type': 'text',
                            'field_required': False,
                            'value': field_value,
                            'display_value': str(field_value) if field_value is not None else 'No response'
                        })
                
                submission['form_responses'] = processed_responses
            else:
                submission['form_responses'] = []
        
        # Get student details with course, batch, and campus information
        student = mongo_db['students'].find_one({'_id': ObjectId(submission['student_id'])})
        if student:
            # Get course details
            course = mongo_db['courses'].find_one({'_id': student.get('course_id')})
            course_name = course.get('name', 'Unknown') if course else 'Unknown'
            
            # Get batch details
            batch = mongo_db['batches'].find_one({'_id': student.get('batch_id')})
            batch_name = batch.get('name', 'Unknown') if batch else 'Unknown'
            
            # Get campus details
            campus = mongo_db['campuses'].find_one({'_id': student.get('campus_id')})
            campus_name = campus.get('name', 'Unknown') if campus else 'Unknown'
            
            submission['student_details'] = {
                'name': student.get('name', 'Unknown'),
                'email': student.get('email', 'Unknown'),
                'phone': student.get('mobile_number', 'Unknown'),
                'roll_number': student.get('roll_number', 'Unknown'),
                'course': course_name,
                'batch': batch_name,
                'campus': campus_name
            }
        
        return jsonify({
            "success": True,
            "data": {
                "submission": submission
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching form submission: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch form submission"
        }), 500

@form_submissions_bp.route('/admin/submissions/<submission_id>', methods=['DELETE'])
@jwt_required()
@require_superadmin
def delete_form_submission(submission_id):
    """Delete form submission"""
    try:
        if not ObjectId.is_valid(submission_id):
            return jsonify({
                "success": False,
                "message": "Invalid submission ID"
            }), 400
        
        result = mongo_db[FORM_SUBMISSIONS_COLLECTION].delete_one({'_id': ObjectId(submission_id)})
        
        if result.deleted_count > 0:
            return jsonify({
                "success": True,
                "message": "Submission deleted successfully"
            })
        else:
            return jsonify({
                "success": False,
                "message": "Submission not found"
            }), 404
        
    except Exception as e:
        logger.error(f"Error deleting form submission: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to delete form submission"
        }), 500

@form_submissions_bp.route('/admin/export/<form_id>', methods=['GET'])
@jwt_required()
@require_superadmin
def export_form_submissions(form_id):
    """Export form submissions to Excel/CSV"""
    try:
        if not ObjectId.is_valid(form_id):
            return jsonify({
                "success": False,
                "message": "Invalid form ID"
            }), 400
        
        # Get form details
        form = mongo_db[FORMS_COLLECTION].find_one({'_id': ObjectId(form_id)})
        if not form:
            return jsonify({
                "success": False,
                "message": "Form not found"
            }), 404
        
        # Get all submissions for this form
        submissions = list(mongo_db[FORM_SUBMISSIONS_COLLECTION].find({
            'form_id': ObjectId(form_id),
            'status': 'submitted'
        }).sort('submitted_at', -1))
        
        # Prepare export data
        export_data = []
        for submission in submissions:
            # Get student details
            student = mongo_db['students'].find_one({'_id': ObjectId(submission['student_id'])})
            student_name = student.get('name', 'Unknown') if student else 'Unknown'
            student_email = student.get('email', 'Unknown') if student else 'Unknown'
            
            # Create row data
            row = {
                'Student Name': student_name,
                'Student Email': student_email,
                'Submission Date': submission['submitted_at'].strftime('%Y-%m-%d %H:%M:%S') if submission['submitted_at'] else 'N/A',
                'IP Address': submission.get('ip_address', 'N/A')
            }
            
            # Add form field responses
            for response in submission['responses']:
                field_id = response['field_id']
                value = response['value']
                
                # Find field label
                field_label = field_id
                for field in form['fields']:
                    if field['field_id'] == field_id:
                        field_label = field['label']
                        break
                
                # Format value based on type
                if isinstance(value, list):
                    row[field_label] = ', '.join(str(v) for v in value)
                else:
                    row[field_label] = str(value) if value is not None else ''
            
            export_data.append(row)
        
        return jsonify({
            "success": True,
            "data": {
                "form_title": form['title'],
                "submissions": export_data,
                "total_submissions": len(export_data)
            }
        })
        
    except Exception as e:
        logger.error(f"Error exporting form submissions: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to export form submissions"
        }), 500

def validate_field_value(field, value):
    """Validate individual field value (imported from forms.py)"""
    if field['required'] and (value is None or value == '' or (isinstance(value, list) and len(value) == 0)):
        return f"Field '{field['label']}' is required"
    
    if value is None or value == '':
        return None  # Optional field, no validation needed
    
    field_type = field['type']
    validation = field.get('validation', {})
    
    # Text validation
    if field_type in ['text', 'textarea']:
        if not isinstance(value, str):
            return f"Field '{field['label']}' must be text"
        
        min_length = validation.get('minLength', 1)
        max_length = validation.get('maxLength', 1000)
        
        if len(value) < min_length:
            return f"Field '{field['label']}' must be at least {min_length} characters"
        if len(value) > max_length:
            return f"Field '{field['label']}' must be no more than {max_length} characters"
    
    # Email validation
    elif field_type == 'email':
        if not isinstance(value, str):
            return f"Field '{field['label']}' must be an email address"
        
        import re
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(pattern, value):
            return f"Field '{field['label']}' must be a valid email address"
    
    # Number validation
    elif field_type == 'number':
        try:
            num_value = float(value)
            min_val = validation.get('min', 0)
            max_val = validation.get('max', 999999)
            
            if num_value < min_val or num_value > max_val:
                return f"Field '{field['label']}' must be between {min_val} and {max_val}"
        except (ValueError, TypeError):
            return f"Field '{field['label']}' must be a number"
    
    # Date validation
    elif field_type == 'date':
        if not isinstance(value, str):
            return f"Field '{field['label']}' must be a date"
        
        try:
            datetime.strptime(value, '%Y-%m-%d')
        except ValueError:
            return f"Field '{field['label']}' must be a valid date (YYYY-MM-DD)"
    
    # Dropdown/Radio validation
    elif field_type in ['dropdown', 'radio']:
        if value not in field.get('options', []):
            return f"Field '{field['label']}' must be one of the provided options"
    
    # Checkbox validation
    elif field_type == 'checkbox':
        if not isinstance(value, list):
            return f"Field '{field['label']}' must be a list of selected options"
        
        valid_options = field.get('options', [])
        for val in value:
            if val not in valid_options:
                return f"Field '{field['label']}' contains invalid option: {val}"
    
    return None
