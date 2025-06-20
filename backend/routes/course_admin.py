from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from mongo import mongo_db

course_admin_bp = Blueprint('course_admin', __name__)

@course_admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    """Course admin dashboard"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user or user.get('role') != 'course_admin':
            return jsonify({
                'success': False,
                'message': 'Access denied'
            }), 403
        
        course_id = user.get('course_id')
        if not course_id:
            return jsonify({
                'success': False,
                'message': 'Course not assigned'
            }), 400
        
        # Get course statistics
        total_students = mongo_db.students.count_documents({'course_id': course_id})
        
        dashboard_data = {
            'course_id': str(course_id),
            'statistics': {
                'total_students': total_students
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