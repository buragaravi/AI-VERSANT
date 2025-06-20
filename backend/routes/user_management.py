from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from mongo import mongo_db

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
        users = list(mongo_db.users.find({'campus_id': mongo_db.ObjectId(campus_id)}))
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
        users = list(mongo_db.users.find({'course_id': mongo_db.ObjectId(course_id)}))
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