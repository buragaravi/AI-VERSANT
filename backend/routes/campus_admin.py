from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from mongo import mongo_db

campus_admin_bp = Blueprint('campus_admin', __name__)

@campus_admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    """Campus admin dashboard"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user or user.get('role') != 'campus_admin':
            return jsonify({
                'success': False,
                'message': 'Access denied'
            }), 403
        
        campus_id = user.get('campus_id')
        if not campus_id:
            return jsonify({
                'success': False,
                'message': 'Campus not assigned'
            }), 400
        
        # Get campus statistics
        total_students = mongo_db.students.count_documents({'campus_id': campus_id})
        total_courses = mongo_db.users.count_documents({
            'campus_id': campus_id,
            'role': 'course_admin'
        })
        
        dashboard_data = {
            'campus_id': str(campus_id),
            'statistics': {
                'total_students': total_students,
                'total_courses': total_courses
            }
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

@campus_admin_bp.route('/students', methods=['GET'])
@jwt_required()
def get_campus_students():
    """Get all students in the campus"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user or user.get('role') != 'campus_admin':
            return jsonify({
                'success': False,
                'message': 'Access denied'
            }), 403
        
        campus_id = user.get('campus_id')
        if not campus_id:
            return jsonify({
                'success': False,
                'message': 'Campus not assigned'
            }), 400
        
        students = list(mongo_db.students.find({'campus_id': campus_id}))
        
        students_data = []
        for student in students:
            students_data.append({
                'id': str(student['_id']),
                'roll_number': student['roll_number'],
                'name': student['name'],
                'course_id': str(student['course_id']),
                'batch_id': str(student['batch_id']),
                'department': student['department'],
                'year': student['year'],
                'status': student['status']
            })
        
        return jsonify({
            'success': True,
            'message': 'Students retrieved successfully',
            'data': students_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get students: {str(e)}'
        }), 500

@campus_admin_bp.route('/reports/student-progress', methods=['GET'])
@jwt_required()
def get_student_progress():
    """Get student progress reports for the campus"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user or user.get('role') != 'campus_admin':
            return jsonify({
                'success': False,
                'message': 'Access denied'
            }), 403
        
        campus_id = user.get('campus_id')
        if not campus_id:
            return jsonify({
                'success': False,
                'message': 'Campus not assigned'
            }), 400
        
        # Get students in campus
        students = list(mongo_db.students.find({'campus_id': campus_id}))
        student_ids = [student['user_id'] for student in students]
        
        # Get progress data
        progress_data = list(mongo_db.student_progress.find({
            'student_id': {'$in': student_ids}
        }))
        
        return jsonify({
            'success': True,
            'message': 'Progress data retrieved successfully',
            'data': progress_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get progress data: {str(e)}'
        }), 500 