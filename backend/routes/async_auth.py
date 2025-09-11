"""
Async Authentication Routes
Demonstrates parallel processing for authentication endpoints
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from config.shared import bcrypt
import bcrypt as raw_bcrypt
from mongo import mongo_db
from config.constants import ROLES
import traceback
import sys
from bson.errors import InvalidId
from utils.async_processor import async_route, parallel_execute, cached_response, performance_monitor
import logging

logger = logging.getLogger(__name__)
async_auth_bp = Blueprint('async_auth', __name__)

@async_auth_bp.route('/login', methods=['POST'])
@async_route(timeout=15.0)
@performance_monitor(threshold=0.5)
def async_login():
    """Async user login endpoint with parallel processing"""
    try:
        logger.info("🔍 Async login attempt started")
        
        data = request.get_json()
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({
                'success': False,
                'message': 'Username and password are required'
            }), 400
        
        username = data['username']
        password = data['password']
        
        # Parallel execution of user lookup and validation
        def find_user_by_username():
            return mongo_db.find_user_by_username(username)
        
        def find_user_by_email():
            return mongo_db.users.find_one({'email': username})
        
        # Execute both lookups in parallel
        results = parallel_execute([find_user_by_username, find_user_by_email], timeout=5.0)
        user = results[0] or results[1]
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'Invalid username or password'
            }), 401
        
        # Check if user is active
        if not user.get('is_active', True):
            return jsonify({
                'success': False,
                'message': 'Account is deactivated'
            }), 401
        
        # Verify password
        if 'password_hash' not in user:
            return jsonify({
                'success': False,
                'message': 'Login failed: Critical server error - missing user credentials.'
            }), 500
        
        if not raw_bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            return jsonify({
                'success': False,
                'message': 'Invalid username or password'
            }), 401
        
        # Create tokens in parallel
        def create_tokens():
            access_token = create_access_token(identity=str(user['_id']))
            refresh_token = create_refresh_token(identity=str(user['_id']))
            return access_token, refresh_token
        
        def get_user_info():
            return {
                'id': str(user['_id']),
                'username': user['username'],
                'email': user['email'],
                'name': user.get('name', f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()),
                'role': user['role'],
                'campus_id': str(user['campus_id']) if user.get('campus_id') else None,
                'course_id': str(user['course_id']) if user.get('course_id') else None,
                'batch_id': str(user['batch_id']) if user.get('batch_id') else None
            }
        
        # Execute token creation and user info in parallel
        token_result, user_info = parallel_execute([create_tokens, get_user_info], timeout=5.0)
        access_token, refresh_token = token_result
        
        logger.info(f"✅ Async login successful for user: {username}")
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'data': {
                'user': user_info,
                'access_token': access_token,
                'refresh_token': refresh_token
            }
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Async login error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Login failed: {str(e)}'
        }), 500

@async_auth_bp.route('/me', methods=['GET'])
@jwt_required()
@async_route(timeout=10.0)
@cached_response(ttl=60)  # Cache user info for 1 minute
@performance_monitor(threshold=0.3)
def async_get_current_user():
    """Async get current user information with caching"""
    try:
        current_user_id = get_jwt_identity()
        
        # Parallel execution of user lookup and validation
        def find_user():
            try:
                return mongo_db.find_user_by_id(current_user_id)
            except InvalidId:
                return None
        
        def validate_user(user):
            if not user:
                return None
            return {
                'id': str(user['_id']),
                'username': user['username'],
                'email': user['email'],
                'name': user.get('name', f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user.get('username', '')),
                'role': user['role'],
                'campus_id': str(user['campus_id']) if user.get('campus_id') else None,
                'course_id': str(user['course_id']) if user.get('course_id') else None,
                'batch_id': str(user['batch_id']) if user.get('batch_id') else None,
                'is_active': user.get('is_active', True)
            }
        
        # Execute in parallel
        user = find_user()
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        user_info = validate_user(user)
        
        return jsonify({
            'success': True,
            'message': 'User information retrieved successfully',
            'data': user_info
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Async get current user error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to get user information: {str(e)}'
        }), 500

@async_auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
@async_route(timeout=5.0)
@performance_monitor(threshold=0.2)
def async_refresh():
    """Async refresh access token"""
    try:
        current_user_id = get_jwt_identity()
        new_access_token = create_access_token(identity=current_user_id)
        
        return jsonify({
            'success': True,
            'message': 'Token refreshed successfully',
            'data': {
                'access_token': new_access_token
            }
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Async refresh error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Token refresh failed: {str(e)}'
        }), 500

@async_auth_bp.route('/logout', methods=['POST'])
@jwt_required()
@async_route(timeout=5.0)
@performance_monitor(threshold=0.1)
def async_logout():
    """Async user logout endpoint"""
    try:
        # In a real application, you might want to blacklist the token
        return jsonify({
            'success': True,
            'message': 'Logout successful'
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Async logout error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Logout failed: {str(e)}'
        }), 500

@async_auth_bp.route('/health', methods=['GET'])
@cached_response(ttl=30)  # Cache health check for 30 seconds
def async_health_check():
    """Async health check endpoint"""
    try:
        # Parallel execution of health checks
        def check_database():
            try:
                mongo_db.users.find_one({})
                return True
            except:
                return False
        
        def check_async_system():
            from utils.async_processor import async_processor
            return async_processor.max_workers > 0
        
        def check_connection_pool():
            from utils.async_processor import db_pool
            return db_pool.connection_count > 0
        
        # Execute all checks in parallel
        results = parallel_execute([check_database, check_async_system, check_connection_pool], timeout=3.0)
        db_healthy, async_healthy, pool_healthy = results
        
        return jsonify({
            'success': True,
            'status': 'healthy' if all(results) else 'degraded',
            'checks': {
                'database': db_healthy,
                'async_system': async_healthy,
                'connection_pool': pool_healthy
            },
            'timestamp': '2024-01-01T00:00:00Z'
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Async health check error: {str(e)}")
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e)
        }), 500
