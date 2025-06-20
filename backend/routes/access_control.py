from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

access_control_bp = Blueprint('access_control', __name__)

@access_control_bp.route('/', methods=['GET'])
@jwt_required()
def get_access_requests():
    """Get access requests"""
    return jsonify({
        'success': True,
        'message': 'Access control endpoint'
    }), 200 