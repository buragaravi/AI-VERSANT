"""
Global Settings Routes for Feature Control
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
import logging

from models_global_settings import GlobalSettings
from routes.test_management import require_superadmin

# Create blueprint
global_settings_bp = Blueprint('global_settings', __name__)

# Set up logging
logger = logging.getLogger(__name__)

@global_settings_bp.route('/features', methods=['GET'])
@jwt_required()
@require_superadmin
def get_all_feature_settings():
    """Get feature settings for all roles - Superadmin only"""
    try:
        settings = GlobalSettings.get_all_feature_settings()
        
        return jsonify({
            'success': True,
            'data': settings
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching all feature settings: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch feature settings: {str(e)}'
        }), 500

@global_settings_bp.route('/features/<role>', methods=['GET'])
@jwt_required()
@require_superadmin
def get_feature_settings(role):
    """Get feature settings for a specific role - Superadmin only"""
    try:
        if role not in ['student', 'campus_admin', 'course_admin']:
            return jsonify({
                'success': False,
                'message': 'Invalid role. Must be student, campus_admin, or course_admin'
            }), 400
        
        features = GlobalSettings.get_feature_settings(role)
        
        return jsonify({
            'success': True,
            'data': {
                'role': role,
                'features': features
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching feature settings for {role}: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch feature settings: {str(e)}'
        }), 500

@global_settings_bp.route('/features/<role>', methods=['PUT'])
@jwt_required()
@require_superadmin
def update_feature_settings(role):
    """Update feature settings for a specific role - Superadmin only"""
    try:
        if role not in ['student', 'campus_admin', 'course_admin']:
            return jsonify({
                'success': False,
                'message': 'Invalid role. Must be student, campus_admin, or course_admin'
            }), 400
        
        data = request.get_json()
        features = data.get('features', {})
        
        if not features:
            return jsonify({
                'success': False,
                'message': 'Features data is required'
            }), 400
        
        # Validate that dashboard is always enabled and required
        if 'dashboard' in features:
            if not features['dashboard'].get('enabled', True):
                return jsonify({
                    'success': False,
                    'message': 'Dashboard feature cannot be disabled'
                }), 400
            if not features['dashboard'].get('required', True):
                return jsonify({
                    'success': False,
                    'message': 'Dashboard feature must be required'
                }), 400
        
        # Get current user ID
        current_user_id = get_jwt_identity()
        
        # Update the settings
        result = GlobalSettings.update_feature_settings(role, features, current_user_id)
        
        if result.modified_count > 0 or result.upserted_id:
            return jsonify({
                'success': True,
                'message': f'Feature settings updated successfully for {role}',
                'data': {
                    'role': role,
                    'features': features
                }
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'No changes made to feature settings'
            }), 400
        
    except Exception as e:
        logger.error(f"Error updating feature settings for {role}: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to update feature settings: {str(e)}'
        }), 500

@global_settings_bp.route('/features/<role>/reset', methods=['POST'])
@jwt_required()
@require_superadmin
def reset_feature_settings(role):
    """Reset feature settings to default for a specific role - Superadmin only"""
    try:
        if role not in ['student', 'campus_admin', 'course_admin']:
            return jsonify({
                'success': False,
                'message': 'Invalid role. Must be student, campus_admin, or course_admin'
            }), 400
        
        # Get current user ID
        current_user_id = get_jwt_identity()
        
        # Create default settings for the role
        default_features = GlobalSettings.create_default_settings_for_role(role)
        
        # Update the settings
        result = GlobalSettings.update_feature_settings(role, default_features, current_user_id)
        
        return jsonify({
            'success': True,
            'message': f'Feature settings reset to default for {role}',
            'data': {
                'role': role,
                'features': default_features
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error resetting feature settings for {role}: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to reset feature settings: {str(e)}'
        }), 500

@global_settings_bp.route('/user/features', methods=['GET'])
@jwt_required()
def get_user_features():
    """Get enabled features for current user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get user details to determine role
        from config.database import DatabaseConfig
        mongo_db = DatabaseConfig.get_database()
        
        user = mongo_db.users.find_one({'_id': ObjectId(current_user_id)})
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        user_role = user.get('role')
        if not user_role:
            return jsonify({
                'success': False,
                'message': 'User role not found'
            }), 400
        
        # Get feature settings for user's role
        features = GlobalSettings.get_feature_settings(user_role)
        
        # Filter only enabled features
        enabled_features = {}
        for feature_key, feature_data in features.items():
            if feature_data.get('enabled', False):
                enabled_features[feature_key] = {
                    'name': feature_data.get('name', feature_key),
                    'description': feature_data.get('description', ''),
                    'required': feature_data.get('required', False)
                }
        
        return jsonify({
            'success': True,
            'data': {
                'role': user_role,
                'features': enabled_features
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching user features: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch user features: {str(e)}'
        }), 500

@global_settings_bp.route('/initialize', methods=['POST'])
@jwt_required()
@require_superadmin
def initialize_default_settings():
    """Initialize default feature settings for all roles - Superadmin only"""
    try:
        # Create default settings
        GlobalSettings.create_default_settings()
        
        return jsonify({
            'success': True,
            'message': 'Default feature settings initialized successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error initializing default settings: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to initialize default settings: {str(e)}'
        }), 500
