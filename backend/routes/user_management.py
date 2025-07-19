from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from mongo import mongo_db
from bson import ObjectId
from flask import current_app
from bson.errors import InvalidId
from config.shared import bcrypt
from utils.email_service import send_email, render_template
from config.constants import MODULES, LEVELS, GRAMMAR_CATEGORIES
from routes.access_control import require_permission

user_management_bp = Blueprint('user_management', __name__)

@user_management_bp.route('/', methods=['GET'])
@jwt_required()
@require_permission(module='user_management')
def get_users():
    """Get users - SUPER ADMIN ONLY"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        # Only super admin can access user management
        if not user or user.get('role') not in ['super_admin', 'superadmin']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Super admin privileges required.'
            }), 403
        
        return jsonify({
            'success': True,
            'message': 'User management endpoint'
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@user_management_bp.route('/counts/campus', methods=['GET'])
@jwt_required()
@require_permission(module='user_management')
def get_user_counts_by_campus():
    """Get user counts by campus - SUPER ADMIN ONLY"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        # Only super admin can access user management
        if not user or user.get('role') not in ['super_admin', 'superadmin']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Super admin privileges required.'
            }), 403
        
        counts = mongo_db.get_user_counts_by_campus()
        return jsonify({'success': True, 'data': counts}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@user_management_bp.route('/counts/course', methods=['GET'])
@jwt_required()
@require_permission(module='user_management')
def get_user_counts_by_course():
    """Get user counts by course - SUPER ADMIN ONLY"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        # Only super admin can access user management
        if not user or user.get('role') not in ['super_admin', 'superadmin']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Super admin privileges required.'
            }), 403
        
        counts = mongo_db.get_user_counts_by_course()
        return jsonify({'success': True, 'data': counts}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@user_management_bp.route('/list/campus/<campus_id>', methods=['GET'])
@jwt_required()
@require_permission(module='user_management')
def list_users_by_campus(campus_id):
    """List users by campus - SUPER ADMIN ONLY"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        # Only super admin can access user management
        if not user or user.get('role') not in ['super_admin', 'superadmin']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Super admin privileges required.'
            }), 403
        
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
@require_permission(module='user_management')
def list_users_by_course(course_id):
    """List users by course - SUPER ADMIN ONLY"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        # Only super admin can access user management
        if not user or user.get('role') not in ['super_admin', 'superadmin']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Super admin privileges required.'
            }), 403
        
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
@require_permission(module='user_management')
def get_all_admins():
    """Get a list of all admin and manager users - SUPER ADMIN ONLY"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        # Only super admin can access user management
        if not user or user.get('role') not in ['super_admin', 'superadmin']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Super admin privileges required.'
            }), 403
        
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
@require_permission(module='user_management')
def get_all_students():
    """Get a list of all students with their details and module/level progress."""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        # Only super admin can access user management
        if not user or user.get('role') not in ['super_admin', 'superadmin']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Super admin privileges required.'
            }), 403

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
                    'roll_number': { '$ifNull': ['$roll_number', ''] },
                    'campus_name': { '$arrayElemAt': ['$campus_details.name', 0] },
                    'course_name': { '$arrayElemAt': ['$course_details.name', 0] },
                    'batch_name': { '$arrayElemAt': ['$batch_details.name', 0] }
                }
            }
        ]
        students = list(mongo_db.users.aggregate(pipeline))
        for s in students:
            s['_id'] = str(s['_id'])
            if 'campus_name' not in s: s['campus_name'] = 'N/A'
            if 'course_name' not in s: s['course_name'] = 'N/A'
            if 'batch_name' not in s: s['batch_name'] = 'N/A'
            if 'roll_number' not in s: s['roll_number'] = ''

            # Fetch student progress
            progress = list(mongo_db.student_progress.find({'student_id': ObjectId(s['_id'])}))
            # Fetch student record for lock/unlock info
            student_record = mongo_db.students.find_one({'user_id': ObjectId(s['_id'])})
            authorized_levels = set(student_record.get('authorized_levels', [])) if student_record else set()
            authorized_modules = set(student_record.get('authorized_modules', [])) if student_record else set()
            # Group progress by module and level
            progress_by_module_level = {}
            for p in progress:
                module_id = str(p.get('module_id'))
                level_id = str(p.get('level_id'))
                percentage = p.get('highest_score', 0)
                progress_by_module_level[(module_id, level_id)] = percentage
            # Always include all modules and all levels
            modules_list = []
            for module_id, module_name in MODULES.items():
                levels = []
                module_locked = False if (not authorized_modules or module_id in authorized_modules) else True
                if module_id == 'GRAMMAR':
                    for level_id, level_name in GRAMMAR_CATEGORIES.items():
                        percentage = progress_by_module_level.get((module_id, level_id), 0)
                        level_locked = False if (not authorized_levels or level_id in authorized_levels) else True
                        levels.append({
                            'level_id': level_id,
                            'level_name': level_name,
                            'percentage': percentage,
                            'locked': level_locked
                        })
                else:
                    for level_id, level_name in LEVELS.items():
                        percentage = progress_by_module_level.get((module_id, level_id), 0)
                        level_locked = False if (not authorized_levels or level_id in authorized_levels) else True
                        levels.append({
                            'level_id': level_id,
                            'level_name': level_name,
                            'percentage': percentage,
                            'locked': level_locked
                        })
                modules_list.append({
                    'module_id': module_id,
                    'module_name': module_name,
                    'levels': levels,
                    'locked': module_locked
                })
            s['modules'] = modules_list
        # Debug print for the first student's modules/levels
        if students:
            print('DEBUG STUDENT MODULES:', students[0]['name'], students[0]['modules'])
        return jsonify({'success': True, 'data': students})
    except Exception as e:
        current_app.logger.error(f"Error getting all students: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@user_management_bp.route('/<user_id>', methods=['GET'])
@jwt_required()
@require_permission(module='user_management')
def get_user(user_id):
    """Get a single user's details by their ID."""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        # Only super admin can access user management
        if not user or user.get('role') not in ['super_admin', 'superadmin']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Super admin privileges required.'
            }), 403

        if not user_id or user_id in ['undefined', 'null', 'None']:
            return jsonify({'success': False, 'message': 'Invalid or missing user_id'}), 400
        try:
            user_object_id = ObjectId(user_id)
        except (InvalidId, TypeError):
            return jsonify({'success': False, 'message': 'Invalid user_id format'}), 400
        user = mongo_db.users.find_one({'_id': user_object_id})
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        user['_id'] = str(user['_id'])
        if 'campus_id' in user:
            user['campus_id'] = str(user['campus_id'])
        if 'course_id' in user:
            user['course_id'] = str(user['course_id'])
        if 'batch_id' in user:
            user['batch_id'] = str(user['batch_id'])
        # Always include roll_number for students
        if user.get('role') == 'student':
            user['roll_number'] = user.get('roll_number', '')
        return jsonify({'success': True, 'data': user}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@user_management_bp.route('/<user_id>', methods=['PUT'])
@jwt_required()
@require_permission(module='user_management')
def update_user(user_id):
    """Update a user's details."""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        # Only super admin can access user management
        if not user or user.get('role') not in ['super_admin', 'superadmin']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Super admin privileges required.'
            }), 403

        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400

        update_fields = {k: v for k, v in data.items() if k not in ['_id', 'created_at', 'password']}
        password_changed = False
        new_password = None
        if 'password' in data and data['password']:
            update_fields['password'] = bcrypt.generate_password_hash(data['password']).decode('utf-8')
            password_changed = True
            new_password = data['password']

        result = mongo_db.users.update_one({'_id': ObjectId(user_id)}, {'$set': update_fields})

        if result.matched_count == 0:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        # Send reset password email if password was changed
        if password_changed:
            user = mongo_db.users.find_one({'_id': ObjectId(user_id)})
            if user:
                name = user.get('name', 'User')
                email = user.get('email')
                login_url = "https://pydah-ai-versant.vercel.app/login"
                html_content = render_template(
                    'reset_password_notification.html',
                    params={
                        'name': name,
                        'email': email,
                        'password': new_password,
                        'login_url': login_url
                    }
                )
                send_email(
                    to_email=email,
                    to_name=name,
                    subject="Your VERSANT password has been reset",
                    html_content=html_content
                )

        return jsonify({'success': True, 'message': 'User updated successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@user_management_bp.route('/<user_id>', methods=['DELETE'])
@jwt_required()
@require_permission(module='user_management')
def delete_user(user_id):
    """Delete a user and handle course admin or student dissociation."""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        # Only super admin can access user management
        if not user or user.get('role') not in ['super_admin', 'superadmin']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Super admin privileges required.'
            }), 403

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

@user_management_bp.route('/<user_id>/send-credentials', methods=['POST'])
@jwt_required()
@require_permission(module='user_management')
def send_credentials_again(user_id):
    """Send credentials again to a student"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        # Only super admin can access user management
        if not user or user.get('role') not in ['super_admin', 'superadmin']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Super admin privileges required.'
            }), 403

        if not user_id or user_id in ['undefined', 'null', 'None']:
            return jsonify({'success': False, 'message': 'Invalid or missing user_id'}), 400
        
        user = mongo_db.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        if user.get('role') != 'student':
            return jsonify({'success': False, 'message': 'This endpoint is only for students'}), 400
        
        # Get student details
        student = mongo_db.students.find_one({'user_id': ObjectId(user_id)})
        if not student:
            return jsonify({'success': False, 'message': 'Student record not found'}), 404
        
        # Generate password (same logic as original creation)
        username = student.get('roll_number', user.get('username', ''))
        password = f"{user.get('name', '').split()[0][:4].lower()}{username[-4:]}"
        
        # Send welcome email
        try:
            html_content = render_template(
                'student_credentials.html',
                params={
                    'name': user.get('name', 'Student'),
                    'username': username,
                    'email': user.get('email', ''),
                    'password': password,
                    'login_url': "https://pydah-ai-versant.vercel.app/login"
                }
            )
            send_email(
                to_email=user.get('email'),
                to_name=user.get('name', 'Student'),
                subject="Your VERSANT Student Credentials",
                html_content=html_content
            )
            return jsonify({'success': True, 'message': 'Credentials sent successfully'}), 200
        except Exception as e:
            return jsonify({'success': False, 'message': f'Failed to send email: {str(e)}'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@user_management_bp.route('/<user_id>/credentials', methods=['GET'])
@jwt_required()
@require_permission(module='user_management')
def download_credentials(user_id):
    """Download student credentials as CSV"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        # Only super admin can access user management
        if not user or user.get('role') not in ['super_admin', 'superadmin']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Super admin privileges required.'
            }), 403

        if not user_id or user_id in ['undefined', 'null', 'None']:
            return jsonify({'success': False, 'message': 'Invalid or missing user_id'}), 400
        
        user = mongo_db.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        if user.get('role') != 'student':
            return jsonify({'success': False, 'message': 'This endpoint is only for students'}), 400
        
        # Get student details
        student = mongo_db.students.find_one({'user_id': ObjectId(user_id)})
        if not student:
            return jsonify({'success': False, 'message': 'Student record not found'}), 404
        
        # Generate password
        username = student.get('roll_number', user.get('username', ''))
        password = f"{user.get('name', '').split()[0][:4].lower()}{username[-4:]}"
        
        # Create CSV content
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Name', 'Roll Number', 'Email', 'Username', 'Password'])
        writer.writerow([
            user.get('name', ''),
            student.get('roll_number', ''),
            user.get('email', ''),
            username,
            password
        ])
        
        output.seek(0)
        return output.getvalue(), 200, {
            'Content-Type': 'text/csv',
            'Content-Disposition': f'attachment; filename="{user.get("name", "student")}_credentials.csv"'
        }
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500 