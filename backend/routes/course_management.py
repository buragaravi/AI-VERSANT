from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from mongo import mongo_db
from bson import ObjectId
from werkzeug.security import generate_password_hash
from datetime import datetime
from pymongo.errors import DuplicateKeyError

course_management_bp = Blueprint('course_management', __name__)

@course_management_bp.route('/', methods=['GET'])
@jwt_required()
def get_courses():
    try:
        # Fetch all courses
        courses = list(mongo_db.db.courses.find())
        course_list = []
        for course in courses:
            # Get campus info
            campus = mongo_db.campuses.find_one({'_id': course.get('campus_id')})
            campus_info = {
                'id': str(campus['_id']),
                'name': campus.get('name')
            } if campus else None
            # Get admin info
            admin = mongo_db.users.find_one({'_id': course.get('admin_id')})
            admin_info = {
                'id': str(admin['_id']),
                'name': admin.get('name'),
                'email': admin.get('email')
            } if admin else None
            course_list.append({
                'id': str(course['_id']),
                'name': course.get('name'),
                'campus': campus_info,
                'admin': admin_info
            })
        return jsonify({'success': True, 'data': course_list}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@course_management_bp.route('/<campus_id>', methods=['GET'])
@jwt_required()
def get_courses_by_campus(campus_id):
    try:
        courses = mongo_db.get_courses_by_campus_with_admin(campus_id)
        course_list = [
            {
                'id': str(course['_id']),
                'name': course.get('name'),
                'admin': course.get('admin')
            }
            for course in courses
        ]
        return jsonify({'success': True, 'data': course_list}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@course_management_bp.route('/<campus_id>', methods=['POST'])
@jwt_required()
def create_course(campus_id):
    try:
        data = request.get_json()
        course_name = data.get('course_name')
        admin_name = data.get('admin_name')
        admin_email = data.get('admin_email')
        admin_password = data.get('admin_password')

        if not all([course_name, admin_name, admin_email, admin_password]):
            return jsonify({'success': False, 'message': 'All fields are required'}), 400

        # Check for existing user before attempting to insert
        if mongo_db.users.find_one({'email': admin_email}):
            return jsonify({'success': False, 'message': 'A user with this email already exists.'}), 409

        password_hash = generate_password_hash(admin_password)
        
        course_id, admin_id = mongo_db.insert_course_with_admin(
            course_name, campus_id, admin_name, admin_email, password_hash
        )
        return jsonify({'success': True, 'data': {'id': str(course_id), 'admin_id': str(admin_id)}}), 201
    except DuplicateKeyError:
        # This is a fallback, the check above should catch it.
        return jsonify({'success': False, 'message': 'A user with this email or username already exists.'}), 409
    except Exception as e:
        # Log the full error for debugging
        print(f"Error creating course: {e}") 
        return jsonify({'success': False, 'message': f'An unexpected error occurred: {str(e)}'}), 500

@course_management_bp.route('/<course_id>', methods=['PUT'])
@jwt_required()
def update_course(course_id):
    try:
        data = request.get_json()
        update_data = {}
        if 'name' in data:
            update_data['name'] = data['name']
        if 'admin_email' in data and 'admin_name' in data and 'admin_password' in data:
            from config.constants import ROLES
            password_hash = generate_password_hash(data['admin_password'])
            new_admin = {
                'username': data['admin_email'],
                'email': data['admin_email'],
                'password_hash': password_hash,
                'role': ROLES['COURSE_ADMIN'],
                'name': data['admin_name'],
                'is_active': True,
                'created_at': datetime.utcnow()
            }
            user_result = mongo_db.users.insert_one(new_admin)
            update_data['admin_id'] = user_result.inserted_id
        result = mongo_db.update_course(course_id, update_data)
        if result.modified_count == 0:
            return jsonify({'success': False, 'message': 'No course updated'}), 404
        return jsonify({'success': True, 'message': 'Course updated'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@course_management_bp.route('/<course_id>', methods=['DELETE'])
@jwt_required()
def delete_course(course_id):
    try:
        result = mongo_db.delete_course(course_id)
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'No course deleted'}), 404
        return jsonify({'success': True, 'message': 'Course deleted'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500 