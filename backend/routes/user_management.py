from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from mongo import mongo_db
from bson import ObjectId
from flask import current_app

user_management_bp = Blueprint('user_management', __name__)

@user_management_bp.route('/', methods=['GET'])
@jwt_required()
def get_users():
    """Get users"""
    return jsonify({
        'success': True,
        'message': 'User management endpoint'
    }), 200

@user_management_bp.route('/counts/campus', methods=['GET'])
@jwt_required()
def get_user_counts_by_campus():
    try:
        counts = mongo_db.get_user_counts_by_campus()
        return jsonify({'success': True, 'data': counts}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@user_management_bp.route('/counts/course', methods=['GET'])
@jwt_required()
def get_user_counts_by_course():
    try:
        counts = mongo_db.get_user_counts_by_course()
        return jsonify({'success': True, 'data': counts}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@user_management_bp.route('/list/campus/<campus_id>', methods=['GET'])
@jwt_required()
def list_users_by_campus(campus_id):
    try:
        if not campus_id or campus_id == 'undefined' or campus_id == 'null':
            return jsonify({'success': False, 'message': 'Invalid or missing campus_id'}), 400
        users = list(mongo_db.users.find({'campus_id': ObjectId(campus_id)}))
        user_list = [
            {
                'id': str(user['_id']),
                'name': user.get('name'),
                'email': user.get('email'),
                'role': user.get('role')
            }
            for user in users
        ]
        return jsonify({'success': True, 'data': user_list}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@user_management_bp.route('/list/course/<course_id>', methods=['GET'])
@jwt_required()
def list_users_by_course(course_id):
    try:
        if not course_id or course_id == 'undefined' or course_id == 'null':
            return jsonify({'success': False, 'message': 'Invalid or missing course_id'}), 400
        users = list(mongo_db.users.find({'course_id': ObjectId(course_id)}))
        user_list = [
            {
                'id': str(user['_id']),
                'name': user.get('name'),
                'email': user.get('email'),
                'role': user.get('role')
            }
            for user in users
        ]
        return jsonify({'success': True, 'data': user_list}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@user_management_bp.route('/admins', methods=['GET'])
@jwt_required()
def get_all_admins():
    """Get a list of all admin and manager users."""
    try:
        # Fetch users who are not students
        pipeline = [
            {
                '$match': {
                    'role': { '$in': ['superadmin', 'campus-admin', 'course-admin'] }
                }
            },
            {
                '$project': {
                    '_id': 1,
                    'name': 1,
                    'email': 1,
                    'username': 1,
                    'role': 1,
                    'created_at': 1,
                }
            }
        ]
        admins = list(mongo_db.db.users.aggregate(pipeline))
        for admin in admins:
            admin['_id'] = str(admin['_id'])
        return jsonify({'success': True, 'data': admins})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@user_management_bp.route('/students', methods=['GET'])
@jwt_required()
def get_all_students():
    """Get a list of all students with their details."""
    try:
        pipeline = [
            {
                '$match': {'role': 'student'}
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
            {
                '$project': {
                    '_id': 1,
                    'name': 1,
                    'email': 1,
                    'username': 1,
                    'created_at': 1,
                    'campus_name': { '$arrayElemAt': ['$campus_details.name', 0] },
                    'course_name': { '$arrayElemAt': ['$course_details.name', 0] },
                    'batch_name': { '$arrayElemAt': ['$batch_details.name', 0] }
                }
            }
        ]
        students = list(mongo_db.users.aggregate(pipeline))
        for s in students:
            s['_id'] = str(s['_id'])
            # Ensure keys exist before trying to access them
            if 'campus_name' not in s: s['campus_name'] = 'N/A'
            if 'course_name' not in s: s['course_name'] = 'N/A'
            if 'batch_name' not in s: s['batch_name'] = 'N/A'
            
        return jsonify({'success': True, 'data': students})
    except Exception as e:
        current_app.logger.error(f"Error getting all students: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@user_management_bp.route('/<user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    """Get a single user's details by their ID."""
    try:
        user = mongo_db.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        user['_id'] = str(user['_id'])
        if 'campus_id' in user:
            user['campus_id'] = str(user['campus_id'])
        if 'course_id' in user:
            user['course_id'] = str(user['course_id'])
        if 'batch_id' in user:
            user['batch_id'] = str(user['batch_id'])

        return jsonify({'success': True, 'data': user}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@user_management_bp.route('/<user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    """Update a user's details."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400

        update_fields = {k: v for k, v in data.items() if k not in ['_id', 'created_at', 'password']}
        
        if 'password' in data and data['password']:
            from app import bcrypt
            update_fields['password'] = bcrypt.generate_password_hash(data['password']).decode('utf-8')

        result = mongo_db.users.update_one({'_id': ObjectId(user_id)}, {'$set': update_fields})

        if result.matched_count == 0:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        return jsonify({'success': True, 'message': 'User updated successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@user_management_bp.route('/<user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    """Delete a user and handle course admin or student dissociation."""
    try:
        user_object_id = ObjectId(user_id)
        user = mongo_db.users.find_one({'_id': user_object_id})

        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        # If the user is a student, delete their record from the 'students' collection
        if user.get('role') == 'student':
            mongo_db.students.delete_one({'user_id': user_object_id})
            
        # If the user is a course admin, you might want to handle course dissociation
        elif user.get('role') == 'course-admin':
            # Example: find and nullify the admin_id in the course
            mongo_db.courses.update_one({'admin_id': user_object_id}, {'$set': {'admin_id': None}})

        # Finally, delete the user from the 'users' collection
        result = mongo_db.users.delete_one({'_id': user_object_id})
        
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'User could not be deleted'}), 500
            
        return jsonify({'success': True, 'message': 'User deleted successfully'}), 200
    except Exception as e:
        current_app.logger.error(f"Error deleting user: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500 