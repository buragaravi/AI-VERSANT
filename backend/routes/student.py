from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from mongo import mongo_db

student_bp = Blueprint('student', __name__)

@student_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    """Student dashboard"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user or user.get('role') != 'student':
            return jsonify({
                'success': False,
                'message': 'Access denied'
            }), 403
        
        # Get student progress
        progress = list(mongo_db.student_progress.find({'student_id': current_user_id}))
        
        dashboard_data = {
            'user_id': str(current_user_id),
            'progress': progress
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

@student_bp.route('/tests', methods=['GET'])
@jwt_required()
def get_available_tests():
    """Get available tests for student"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user or user.get('role') != 'student':
            return jsonify({
                'success': False,
                'message': 'Access denied'
            }), 403
        
        # Get practice tests
        practice_tests = list(mongo_db.tests.find({
            'test_type': 'practice',
            'status': 'active'
        }))
        
        return jsonify({
            'success': True,
            'message': 'Tests retrieved successfully',
            'data': practice_tests
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get tests: {str(e)}'
        }), 500 