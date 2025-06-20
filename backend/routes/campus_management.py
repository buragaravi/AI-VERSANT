from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from mongo import mongo_db
from bson import ObjectId
from werkzeug.security import generate_password_hash
from datetime import datetime

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

@campus_management_bp.route('/', methods=['POST'])
@jwt_required()
def create_campus():
    """Create a new campus and assign an admin"""
    try:
        data = request.get_json()
        campus_name = data.get('campus_name')
        admin_name = data.get('admin_name')
        admin_email = data.get('admin_email')
        admin_password = data.get('admin_password')
        if not all([campus_name, admin_name, admin_email, admin_password]):
            return jsonify({'success': False, 'message': 'All fields are required'}), 400
        password_hash = generate_password_hash(admin_password)
        campus_id, admin_id = mongo_db.insert_campus_with_admin(
            campus_name, admin_name, admin_email, password_hash
        )
        return jsonify({'success': True, 'data': {'id': campus_id, 'admin_id': admin_id}}), 201
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@campus_management_bp.route('/<campus_id>', methods=['PUT'])
@jwt_required()
def update_campus(campus_id):
    """Update a campus name or re-assign admin"""
    try:
        data = request.get_json()
        update_data = {}
        if 'name' in data:
            update_data['name'] = data['name']
        if 'admin_email' in data and 'admin_name' in data and 'admin_password' in data:
            # Create new admin user
            from config.constants import ROLES
            password_hash = generate_password_hash(data['admin_password'])
            new_admin = {
                'username': data['admin_email'],
                'email': data['admin_email'],
                'password_hash': password_hash,
                'role': ROLES['CAMPUS_ADMIN'],
                'name': data['admin_name'],
                'is_active': True,
                'created_at': datetime.utcnow()
            }
            user_result = mongo_db.users.insert_one(new_admin)
            update_data['admin_id'] = user_result.inserted_id
        result = mongo_db.update_campus(campus_id, update_data)
        if result.modified_count == 0:
            return jsonify({'success': False, 'message': 'No campus updated'}), 404
        return jsonify({'success': True, 'message': 'Campus updated'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@campus_management_bp.route('/<campus_id>', methods=['DELETE'])
@jwt_required()
def delete_campus(campus_id):
    """Delete a campus"""
    try:
        result = mongo_db.delete_campus(campus_id)
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'No campus deleted'}), 404
        return jsonify({'success': True, 'message': 'Campus deleted'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500 