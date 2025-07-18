from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from mongo import mongo_db
from bson import ObjectId
from config.shared import bcrypt
from config.constants import ROLES
from datetime import datetime
import pytz
from utils.email_service import send_email, render_template

campus_management_bp = Blueprint('campus_management', __name__)

@campus_management_bp.route('/', methods=['GET'])
@jwt_required()
def get_campuses():
    """Get all campuses with admin info"""
    try:
        campuses = mongo_db.get_all_campuses_with_admin()
        campus_list = [
            {
                'id': str(campus['_id']),
                'name': campus.get('name'),
                'admin': campus.get('admin')
            }
            for campus in campuses
        ]
        return jsonify({'success': True, 'data': campus_list}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@campus_management_bp.route('/campuses', methods=['GET'])
@jwt_required()
def get_campuses_simple():
    """Get all campuses (simple format for batch creation)"""
    try:
        campuses = list(mongo_db.campuses.find())
        campus_list = [
            {
                'id': str(campus['_id']),
                'name': campus.get('name')
            }
            for campus in campuses
        ]
        return jsonify({'success': True, 'data': campus_list}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@campus_management_bp.route('/', methods=['POST'])
@jwt_required()
def create_campus():
    """Create a new campus and assign an admin - SUPER ADMIN ONLY"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        # Only super admin can create campuses
        if not user or user.get('role') not in ['super_admin', 'superadmin']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Only super admin can create campuses.'
            }), 403
        
        data = request.get_json()
        campus_name = data.get('campus_name')
        admin_name = data.get('admin_name')
        admin_email = data.get('admin_email')
        admin_password = data.get('admin_password')
        if not all([campus_name, admin_name, admin_email, admin_password]):
            return jsonify({'success': False, 'message': 'All fields are required'}), 400

        if mongo_db.users.find_one({'email': admin_email}):
            return jsonify({'success': False, 'message': 'Admin with this email already exists'}), 409

        password_hash = bcrypt.generate_password_hash(admin_password).decode('utf-8')
        
        # Create campus admin user
        admin_user = {
            'name': admin_name,
            'email': admin_email,
            'username': admin_name,
            'password_hash': password_hash,
            'role': ROLES['CAMPUS_ADMIN'],
            'is_active': True,
            'created_at': datetime.now(pytz.utc)
        }
        user_id = mongo_db.users.insert_one(admin_user).inserted_id

        # Create campus
        campus = {
            'name': campus_name,
            'admin_id': user_id,
            'created_at': datetime.now(pytz.utc)
        }
        campus_id = mongo_db.campuses.insert_one(campus).inserted_id
        
        # Update user with campus_id
        mongo_db.users.update_one({'_id': user_id}, {'$set': {'campus_id': campus_id}})

        # Send welcome email
        try:
            html_content = render_template(
                'campus_admin_credentials.html',
                params={
                    'name': admin_name,
                    'username': admin_name,
                    'email': admin_email,
                    'password': admin_password,
                    'login_url': "https://pydah-ai-versant.vercel.app/login"
                }
            )
            send_email(
                to_email=admin_email,
                to_name=admin_name,
                subject="Welcome to VERSANT - Your Admin Credentials",
                html_content=html_content
            )
        except Exception as e:
            print(f"Failed to send welcome email to {admin_email}: {e}")

        return jsonify({
            'success': True,
            'message': 'Campus created successfully',
            'data': {
                'campus_id': str(campus_id),
                'admin_id': str(user_id)
            }
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to create campus: {str(e)}'
        }), 500

@campus_management_bp.route('/<campus_id>', methods=['PUT'])
@jwt_required()
def update_campus(campus_id):
    """Update a campus name or re-assign admin"""
    try:
        data = request.get_json()
        
        # Update campus name
        if 'name' in data:
            mongo_db.campuses.update_one({'_id': ObjectId(campus_id)}, {'$set': {'name': data['name']}})
        
        # Update campus admin
        if 'admin_email' in data and 'admin_name' in data:
            update_data = {'name': data['admin_name'], 'email': data['admin_email'], 'username': data['admin_name']}
            if 'admin_password' in data and data['admin_password']:
                password_hash = bcrypt.generate_password_hash(data['admin_password']).decode('utf-8')
                update_data['password_hash'] = password_hash
            
            campus = mongo_db.campuses.find_one({'_id': ObjectId(campus_id)})
            if campus and 'admin_id' in campus:
                mongo_db.users.update_one({'_id': campus['admin_id']}, {'$set': update_data})

        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@campus_management_bp.route('/<campus_id>/details', methods=['GET'])
@jwt_required()
def get_campus_details(campus_id):
    """Get details for a campus including course and student counts."""
    try:
        campus_object_id = ObjectId(campus_id)
        
        # Count courses associated with the campus
        course_count = mongo_db.courses.count_documents({'campus_id': campus_object_id})
        
        # Count students associated with the campus
        student_count = mongo_db.users.count_documents({'campus_id': campus_object_id, 'role': ROLES['STUDENT']})
        
        return jsonify({
            'success': True,
            'data': {
                'course_count': course_count,
                'student_count': student_count
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'An error occurred: {str(e)}'}), 500

@campus_management_bp.route('/<campus_id>', methods=['DELETE'])
@jwt_required()
def delete_campus(campus_id):
    """Delete a campus and all associated data"""
    try:
        result = mongo_db.delete_campus(campus_id)
        if not result.get('success'):
            return jsonify({'success': False, 'message': result.get('message', 'Failed to delete campus')}), 404
        
        if result.get('deleted_count', 0) == 0:
            return jsonify({'success': False, 'message': 'Campus not found or already deleted'}), 404

        return jsonify({'success': True, 'message': 'Campus and all associated data deleted successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@campus_management_bp.route('/<campus_id>/courses', methods=['GET'])
@jwt_required()
def get_campus_courses(campus_id):
    """Get all courses for a specific campus."""
    try:
        courses = mongo_db.get_courses_by_campus(campus_id)
        return jsonify({'success': True, 'data': courses}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500 