from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
import logging
import re

from config.database import DatabaseConfig
from models_forms import Form, FormField, FormSettings, FORMS_COLLECTION, FORM_TEMPLATES, FIELD_VALIDATION_RULES
from routes.test_management import require_superadmin

forms_bp = Blueprint('forms', __name__)
mongo_db = DatabaseConfig.get_database()
logger = logging.getLogger(__name__)

def validate_form_data(data):
    """Validate form data before creating/updating"""
    errors = []
    
    if not data.get('title') or len(data['title'].strip()) < 3:
        errors.append("Title must be at least 3 characters long")
    
    if not data.get('fields') or not isinstance(data['fields'], list):
        errors.append("Form must have at least one field")
    
    if data.get('fields'):
        for i, field in enumerate(data['fields']):
            if not field.get('field_id'):
                errors.append(f"Field {i+1} must have a field_id")
            if not field.get('label'):
                errors.append(f"Field {i+1} must have a label")
            if not field.get('type'):
                errors.append(f"Field {i+1} must have a type")
            
            # Validate field type
            valid_types = ['text', 'email', 'number', 'dropdown', 'radio', 'checkbox', 'textarea', 'date']
            if field.get('type') not in valid_types:
                errors.append(f"Field {i+1} has invalid type. Must be one of: {', '.join(valid_types)}")
            
            # Validate options for dropdown, radio, checkbox
            if field.get('type') in ['dropdown', 'radio', 'checkbox']:
                if not field.get('options') or not isinstance(field['options'], list) or len(field['options']) == 0:
                    errors.append(f"Field {i+1} ({field.get('type')}) must have options")
    
    return errors

def validate_field_value(field, value):
    """Validate individual field value"""
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
        
        min_length = validation.get('minLength', FIELD_VALIDATION_RULES.get(field_type, {}).get('minLength', 1))
        max_length = validation.get('maxLength', FIELD_VALIDATION_RULES.get(field_type, {}).get('maxLength', 1000))
        
        if len(value) < min_length:
            return f"Field '{field['label']}' must be at least {min_length} characters"
        if len(value) > max_length:
            return f"Field '{field['label']}' must be no more than {max_length} characters"
    
    # Email validation
    elif field_type == 'email':
        if not isinstance(value, str):
            return f"Field '{field['label']}' must be an email address"
        
        pattern = validation.get('pattern', FIELD_VALIDATION_RULES.get('email', {}).get('pattern'))
        if pattern and not re.match(pattern, value):
            return f"Field '{field['label']}' must be a valid email address"
    
    # Number validation
    elif field_type == 'number':
        try:
            num_value = float(value)
            min_val = validation.get('min', FIELD_VALIDATION_RULES.get('number', {}).get('min', 0))
            max_val = validation.get('max', FIELD_VALIDATION_RULES.get('number', {}).get('max', 999999))
            
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

@forms_bp.route('/templates', methods=['GET'])
@jwt_required()
@require_superadmin
def get_form_templates():
    """Get all available form templates"""
    try:
        return jsonify({
            "success": True,
            "data": {
                "templates": FORM_TEMPLATES
            }
        })
    except Exception as e:
        logger.error(f"Error fetching form templates: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch form templates"
        }), 500

@forms_bp.route('/templates/<template_type>', methods=['GET'])
@jwt_required()
@require_superadmin
def get_form_template(template_type):
    """Get specific form template"""
    try:
        if template_type not in FORM_TEMPLATES:
            return jsonify({
                "success": False,
                "message": "Template not found"
            }), 404
        
        return jsonify({
            "success": True,
            "data": {
                "template": FORM_TEMPLATES[template_type]
            }
        })
    except Exception as e:
        logger.error(f"Error fetching form template: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch form template"
        }), 500

@forms_bp.route('/', methods=['POST'])
@jwt_required()
@require_superadmin
def create_form():
    """Create a new form"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "message": "No data provided"
            }), 400
        
        # Validate form data
        errors = validate_form_data(data)
        if errors:
            return jsonify({
                "success": False,
                "message": "Validation errors",
                "errors": errors
            }), 400
        
        # Create form fields
        fields = []
        for field_data in data['fields']:
            field = FormField(
                field_id=field_data['field_id'],
                label=field_data['label'],
                field_type=field_data['type'],
                required=field_data.get('required', False),
                options=field_data.get('options', []),
                placeholder=field_data.get('placeholder', ''),
                validation=field_data.get('validation', {})
            )
            fields.append(field)
        
        # Create form settings
        settings_data = data.get('settings', {})
        settings = FormSettings(
            is_active=settings_data.get('isActive', True),
            submission_deadline=datetime.fromisoformat(settings_data['submissionDeadline']) if settings_data.get('submissionDeadline') else None,
            allow_multiple_submissions=settings_data.get('allowMultipleSubmissions', False),
            show_progress=settings_data.get('showProgress', True)
        )
        
        # Create form
        form = Form(
            title=data['title'],
            description=data.get('description', ''),
            template_type=data.get('template_type', 'custom'),
            fields=fields,
            settings=settings,
            created_by=ObjectId(get_jwt_identity()),
            is_required=data.get('is_required', False)
        )
        
        # Save to database
        result = mongo_db[FORMS_COLLECTION].insert_one(form.to_dict())
        
        if result.inserted_id:
            return jsonify({
                "success": True,
                "message": "Form created successfully",
                "data": {
                    "form_id": str(result.inserted_id)
                }
            })
        else:
            return jsonify({
                "success": False,
                "message": "Failed to create form"
            }), 500
            
    except Exception as e:
        logger.error(f"Error creating form: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to create form"
        }), 500

@forms_bp.route('/', methods=['GET'])
@jwt_required()
@require_superadmin
def get_forms():
    """Get all forms with pagination and filtering"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        search = request.args.get('search', '')
        template_type = request.args.get('template_type', '')
        status = request.args.get('status', '')
        
        # Build query
        query = {}
        if search:
            query['$or'] = [
                {'title': {'$regex': search, '$options': 'i'}},
                {'description': {'$regex': search, '$options': 'i'}}
            ]
        if template_type:
            query['template_type'] = template_type
        if status == 'active':
            query['settings.isActive'] = True
        elif status == 'inactive':
            query['settings.isActive'] = False
        
        # Get total count
        total = mongo_db[FORMS_COLLECTION].count_documents(query)
        
        # Get forms with pagination
        skip = (page - 1) * limit
        forms = list(mongo_db[FORMS_COLLECTION].find(query)
                    .sort('created_at', -1)
                    .skip(skip)
                    .limit(limit))
        
        # Convert ObjectId to string
        for form in forms:
            form['_id'] = str(form['_id'])
            form['created_by'] = str(form['created_by'])
        
        return jsonify({
            "success": True,
            "data": {
                "forms": forms,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                }
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching forms: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch forms"
        }), 500

@forms_bp.route('/<form_id>', methods=['GET'])
@jwt_required()
@require_superadmin
def get_form(form_id):
    """Get specific form by ID"""
    try:
        if not ObjectId.is_valid(form_id):
            return jsonify({
                "success": False,
                "message": "Invalid form ID"
            }), 400
        
        form = mongo_db[FORMS_COLLECTION].find_one({'_id': ObjectId(form_id)})
        if not form:
            return jsonify({
                "success": False,
                "message": "Form not found"
            }), 404
        
        form['_id'] = str(form['_id'])
        form['created_by'] = str(form['created_by'])
        
        return jsonify({
            "success": True,
            "data": {
                "form": form
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching form: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch form"
        }), 500

@forms_bp.route('/<form_id>', methods=['PUT'])
@jwt_required()
@require_superadmin
def update_form(form_id):
    """Update existing form"""
    try:
        if not ObjectId.is_valid(form_id):
            return jsonify({
                "success": False,
                "message": "Invalid form ID"
            }), 400
        
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "message": "No data provided"
            }), 400
        
        # Check if form exists
        existing_form = mongo_db[FORMS_COLLECTION].find_one({'_id': ObjectId(form_id)})
        if not existing_form:
            return jsonify({
                "success": False,
                "message": "Form not found"
            }), 404
        
        # Validate form data
        errors = validate_form_data(data)
        if errors:
            return jsonify({
                "success": False,
                "message": "Validation errors",
                "errors": errors
            }), 400
        
        # Create form fields
        fields = []
        for field_data in data['fields']:
            field = FormField(
                field_id=field_data['field_id'],
                label=field_data['label'],
                field_type=field_data['type'],
                required=field_data.get('required', False),
                options=field_data.get('options', []),
                placeholder=field_data.get('placeholder', ''),
                validation=field_data.get('validation', {})
            )
            fields.append(field)
        
        # Create form settings
        settings_data = data.get('settings', {})
        settings = FormSettings(
            is_active=settings_data.get('isActive', True),
            submission_deadline=datetime.fromisoformat(settings_data['submissionDeadline']) if settings_data.get('submissionDeadline') else None,
            allow_multiple_submissions=settings_data.get('allowMultipleSubmissions', False),
            show_progress=settings_data.get('showProgress', True)
        )
        
        # Update form
        update_data = {
            'title': data['title'],
            'description': data.get('description', ''),
            'template_type': data.get('template_type', 'custom'),
            'fields': [field.to_dict() for field in fields],
            'settings': settings.to_dict(),
            'updated_at': datetime.utcnow()
        }
        
        result = mongo_db[FORMS_COLLECTION].update_one(
            {'_id': ObjectId(form_id)},
            {'$set': update_data}
        )
        
        if result.modified_count > 0:
            return jsonify({
                "success": True,
                "message": "Form updated successfully"
            })
        else:
            return jsonify({
                "success": False,
                "message": "No changes made to form"
            })
            
    except Exception as e:
        logger.error(f"Error updating form: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to update form"
        }), 500

@forms_bp.route('/<form_id>', methods=['DELETE'])
@jwt_required()
@require_superadmin
def delete_form(form_id):
    """Delete form"""
    try:
        if not ObjectId.is_valid(form_id):
            return jsonify({
                "success": False,
                "message": "Invalid form ID"
            }), 400
        
        # Check if form exists
        form = mongo_db[FORMS_COLLECTION].find_one({'_id': ObjectId(form_id)})
        if not form:
            return jsonify({
                "success": False,
                "message": "Form not found"
            }), 404
        
        # Delete form and all its submissions
        mongo_db[FORMS_COLLECTION].delete_one({'_id': ObjectId(form_id)})
        mongo_db[FORM_SUBMISSIONS_COLLECTION].delete_many({'form_id': ObjectId(form_id)})
        
        return jsonify({
            "success": True,
            "message": "Form deleted successfully"
        })
        
    except Exception as e:
        logger.error(f"Error deleting form: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to delete form"
        }), 500

@forms_bp.route('/<form_id>/toggle-status', methods=['PATCH'])
@jwt_required()
@require_superadmin
def toggle_form_status(form_id):
    """Toggle form active/inactive status"""
    try:
        if not ObjectId.is_valid(form_id):
            return jsonify({
                "success": False,
                "message": "Invalid form ID"
            }), 400
        
        form = mongo_db[FORMS_COLLECTION].find_one({'_id': ObjectId(form_id)})
        if not form:
            return jsonify({
                "success": False,
                "message": "Form not found"
            }), 404
        
        # Toggle status
        new_status = not form['settings']['isActive']
        mongo_db[FORMS_COLLECTION].update_one(
            {'_id': ObjectId(form_id)},
            {'$set': {
                'settings.isActive': new_status,
                'updated_at': datetime.utcnow()
            }}
        )
        
        return jsonify({
            "success": True,
            "message": f"Form {'activated' if new_status else 'deactivated'} successfully",
            "data": {
                "isActive": new_status
            }
        })
        
    except Exception as e:
        logger.error(f"Error toggling form status: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to toggle form status"
        }), 500

@forms_bp.route('/<form_id>/duplicate', methods=['POST'])
@jwt_required()
@require_superadmin
def duplicate_form(form_id):
    """Duplicate existing form"""
    try:
        if not ObjectId.is_valid(form_id):
            return jsonify({
                "success": False,
                "message": "Invalid form ID"
            }), 400
        
        form = mongo_db[FORMS_COLLECTION].find_one({'_id': ObjectId(form_id)})
        if not form:
            return jsonify({
                "success": False,
                "message": "Form not found"
            }), 404
        
        # Create duplicate
        duplicate_data = form.copy()
        duplicate_data['_id'] = ObjectId()
        duplicate_data['title'] = f"{form['title']} (Copy)"
        duplicate_data['created_by'] = ObjectId(get_jwt_identity())
        duplicate_data['created_at'] = datetime.utcnow()
        duplicate_data['updated_at'] = datetime.utcnow()
        
        result = mongo_db[FORMS_COLLECTION].insert_one(duplicate_data)
        
        if result.inserted_id:
            return jsonify({
                "success": True,
                "message": "Form duplicated successfully",
                "data": {
                    "form_id": str(result.inserted_id)
                }
            })
        else:
            return jsonify({
                "success": False,
                "message": "Failed to duplicate form"
            }), 500
            
    except Exception as e:
        logger.error(f"Error duplicating form: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to duplicate form"
        }), 500
