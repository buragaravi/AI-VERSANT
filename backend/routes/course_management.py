from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from mongo import mongo_db
from bson import ObjectId
from config.shared import bcrypt
from config.constants import ROLES
from datetime import datetime
from pymongo.errors import DuplicateKeyError
import pytz
from utils.email_service import send_email, render_template

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

@course_management_bp.route('/courses', methods=['GET'])
@jwt_required()
def get_courses_filtered():
    """Get courses filtered by campus_id query parameter"""
    try:
        campus_id = request.args.get('campus_id')
        if not campus_id:
            return jsonify({'success': False, 'message': 'campus_id parameter is required'}), 400
        
        # Fetch courses for the specific campus
        courses = list(mongo_db.courses.find({'campus_id': ObjectId(campus_id)}))
        course_list = [
            {
                'id': str(course['_id']),
                'name': course.get('name'),
                'campus_id': str(course.get('campus_id'))
            }
            for course in courses
        ]
        return jsonify({'success': True, 'data': course_list}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@course_management_bp.route('/batch/<batch_id>/courses', methods=['GET'])
@jwt_required()
def get_courses_by_batch(batch_id):
    try:
        # Get the batch to find its course_ids
        batch = mongo_db.batches.find_one({'_id': ObjectId(batch_id)})
        if not batch:
            return jsonify({'success': False, 'message': 'Batch not found'}), 404
        
        # Get courses for the batch
        courses = list(mongo_db.courses.find({'_id': {'$in': batch.get('course_ids', [])}}))
        course_list = [
            {
                'id': str(course['_id']),
                'name': course.get('name')
            }
            for course in courses
        ]
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
    """Create a new course - SUPER ADMIN ONLY"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        # Only super admin can create courses
        if not user or user.get('role') not in ['super_admin', 'superadmin']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Only super admin can create courses.'
            }), 403
        
        data = request.get_json()
        course_name = data.get('course_name')
        admin_name = data.get('admin_name')
        admin_email = data.get('admin_email')
        admin_password = data.get('admin_password')

        if not all([course_name, admin_name, admin_email, admin_password]):
            return jsonify({'success': False, 'message': 'All fields are required'}), 400

        if mongo_db.users.find_one({'email': admin_email}):
            return jsonify({'success': False, 'message': 'A user with this email already exists.'}), 409

        password_hash = bcrypt.generate_password_hash(admin_password).decode('utf-8')
        
        # Create course admin user
        admin_user = {
            'name': admin_name,
            'email': admin_email,
            'username': admin_name,
            'password_hash': password_hash,
            'role': ROLES['COURSE_ADMIN'],
            'is_active': True,
            'campus_id': ObjectId(campus_id),
            'created_at': datetime.now(pytz.utc)
        }
        user_id = mongo_db.users.insert_one(admin_user).inserted_id

        # Create course
        course = {
            'name': course_name,
            'campus_id': ObjectId(campus_id),
            'admin_id': user_id,
            'created_at': datetime.now(pytz.utc)
        }
        course_id = mongo_db.courses.insert_one(course).inserted_id
        
        # Update user with course_id
        mongo_db.users.update_one({'_id': user_id}, {'$set': {'course_id': course_id}})

        # Send welcome email
        try:
            html_content = render_template(
                'course_admin_credentials.html',
                name=admin_name,
                username=admin_name,
                email=admin_email,
                password=admin_password,
                login_url="https://pydah-ai-versant.vercel.app/login"
            )
            send_email(
                to_email=admin_email,
                to_name=admin_name,
                subject="Welcome to VERSANT - Your Course Admin Credentials",
                html_content=html_content
            )
        except Exception as e:
            print(f"Failed to send welcome email to {admin_email}: {e}")

        return jsonify({
            'success': True,
            'message': 'Course created successfully',
            'data': {
                'course_id': str(course_id),
                'admin_id': str(user_id)
            }
        }), 201
        
    except DuplicateKeyError:
        return jsonify({'success': False, 'message': 'A user with this email or username already exists.'}), 409
    except Exception as e:
        print(f"Error creating course: {e}") 
        return jsonify({
            'success': False,
            'message': f'Failed to create course: {str(e)}'
        }), 500

@course_management_bp.route('/<course_id>', methods=['PUT'])
@jwt_required()
def update_course(course_id):
    try:
        data = request.get_json()
        
        # Update course name
        if 'name' in data:
            mongo_db.courses.update_one({'_id': ObjectId(course_id)}, {'$set': {'name': data['name']}})
            
        # Update course admin
        if 'admin_email' in data and 'admin_name' in data:
            update_data = {'name': data['admin_name'], 'email': data['admin_email'], 'username': data['admin_name']}
            if 'admin_password' in data and data['admin_password']:
                password_hash = bcrypt.generate_password_hash(data['admin_password']).decode('utf-8')
                update_data['password_hash'] = password_hash
            
            course = mongo_db.courses.find_one({'_id': ObjectId(course_id)})
            if course and 'admin_id' in course:
                mongo_db.users.update_one({'_id': course['admin_id']}, {'$set': update_data})

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

@course_management_bp.route('/<course_id>/batches', methods=['GET'])
@jwt_required()
def get_course_batches(course_id):
    """Get all batches for a specific course."""
    try:
        batches = mongo_db.get_batches_by_course(course_id)
        return jsonify({'success': True, 'data': batches}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500 