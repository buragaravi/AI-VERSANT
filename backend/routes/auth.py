from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
import bcrypt
from mongo import mongo_db
from config.constants import ROLES

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({
                'success': False,
                'message': 'Username and password are required'
            }), 400
        
        username = data['username']
        password = data['password']
        
        # Find user by username
        user = mongo_db.find_user_by_username(username)
        
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
            import sys
            print(f"CRITICAL: User document missing 'password_hash'. User object: {user}", file=sys.stderr)
            return jsonify({
                'success': False,
                'message': 'Login failed: Critical server error - missing user credentials.'
            }), 500

        if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            return jsonify({
                'success': False,
                'message': 'Invalid username or password'
            }), 401
        
        # Create tokens
        access_token = create_access_token(identity=str(user['_id']))
        refresh_token = create_refresh_token(identity=str(user['_id']))
        
        # Get additional user info
        user_info = {
            'id': str(user['_id']),
            'username': user['username'],
            'email': user['email'],
            'name': user['name'],
            'role': user['role'],
            'campus_id': str(user['campus_id']) if user.get('campus_id') else None,
            'course_id': str(user['course_id']) if user.get('course_id') else None,
            'batch_id': str(user['batch_id']) if user.get('batch_id') else None
        }
        
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
        return jsonify({
            'success': False,
            'message': f'Login failed: {str(e)}'
        }), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """User logout endpoint"""
    try:
        # In a real application, you might want to blacklist the token
        # For now, we'll just return a success message
        return jsonify({
            'success': True,
            'message': 'Logout successful'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Logout failed: {str(e)}'
        }), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
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
        return jsonify({
            'success': False,
            'message': f'Token refresh failed: {str(e)}'
        }), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user information"""
    try:
        import sys
        print('--- /auth/me DEBUG ---', file=sys.stderr)
        print('Headers:', dict(request.headers), file=sys.stderr)
        print('Authorization:', request.headers.get('Authorization'), file=sys.stderr)
        current_user_id = get_jwt_identity()
        print('JWT Identity:', current_user_id, file=sys.stderr)
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        user_info = {
            'id': str(user['_id']),
            'username': user['username'],
            'email': user['email'],
            'name': user['name'],
            'role': user['role'],
            'campus_id': str(user['campus_id']) if user.get('campus_id') else None,
            'course_id': str(user['course_id']) if user.get('course_id') else None,
            'batch_id': str(user['batch_id']) if user.get('batch_id') else None,
            'is_active': user.get('is_active', True)
        }
        
        return jsonify({
            'success': True,
            'message': 'User information retrieved successfully',
            'data': user_info
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get user information: {str(e)}'
        }), 500

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Send password reset email"""
    try:
        data = request.get_json()
        
        if not data or not data.get('email'):
            return jsonify({
                'success': False,
                'message': 'Email is required'
            }), 400
        
        email = data['email']
        user = mongo_db.find_user_by_email(email)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'If the email exists, a password reset link has been sent'
            }), 200
        
        # In a real application, you would send an email with a reset link
        # For now, we'll just return a success message
        
        return jsonify({
            'success': True,
            'message': 'If the email exists, a password reset link has been sent'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Password reset request failed: {str(e)}'
        }), 500

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password with token"""
    try:
        data = request.get_json()
        
        if not data or not data.get('token') or not data.get('new_password'):
            return jsonify({
                'success': False,
                'message': 'Token and new password are required'
            }), 400
        
        # In a real application, you would verify the token
        # For now, we'll just return a success message
        
        return jsonify({
            'success': True,
            'message': 'Password reset successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Password reset failed: {str(e)}'
        }), 500 