"""
OneSignal Push Notification Routes
API endpoints for managing OneSignal push notifications
"""

import logging
import functools
from datetime import datetime
from flask import Blueprint, request, jsonify
from bson import ObjectId
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from utils.onesignal_service import get_onesignal_service
from utils.async_processor import submit_background_task
from mongo import mongo_db

logger = logging.getLogger(__name__)

# Create blueprint
onesignal_notifications_bp = Blueprint('onesignal_notifications', __name__)

# Authentication decorators
def token_required(f):
    """Decorator to require JWT token"""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Verify JWT token first
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return jsonify({
                    'success': False,
                    'message': 'Token is missing or invalid'
                }), 401
            
            user = mongo_db.find_user_by_id(current_user_id)
            if not user:
                return jsonify({
                    'success': False,
                    'message': 'User not found'
                }), 401
            
            # Add current_user to kwargs
            kwargs['current_user'] = user
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"❌ Authentication error: {e}")
            return jsonify({
                'success': False,
                'message': 'Authentication failed'
            }), 401
    return decorated_function

def role_required(allowed_roles):
    """Decorator to require specific roles"""
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                return jsonify({
                    'success': False,
                    'message': 'User not authenticated'
                }), 401
            
            user_role = current_user.get('role')
            if user_role not in allowed_roles:
                return jsonify({
                    'success': False,
                    'message': f'Access denied. Required roles: {allowed_roles}'
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@onesignal_notifications_bp.route('/status', methods=['GET'])
def get_onesignal_status():
    """Get OneSignal service status"""
    try:
        onesignal_service = get_onesignal_service()
        
        if not onesignal_service.is_configured():
            return jsonify({
                'success': False,
                'message': 'OneSignal not configured',
                'configured': False
            }), 400
        
        # Test connection
        connection_test = onesignal_service.test_connection()
        
        return jsonify({
            'success': True,
            'message': 'OneSignal status retrieved',
            'configured': True,
            'connection_test': connection_test
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error getting OneSignal status: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to get OneSignal status'
        }), 500

@onesignal_notifications_bp.route('/send', methods=['POST'])
@token_required
@role_required(['superadmin', 'campus_admin', 'course_admin'])
def send_onesignal_notification(current_user):
    """Send a OneSignal notification to specific users or roles"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Validate required fields
        target_type = data.get('target_type')  # 'user', 'role', 'segment', 'all'
        target_value = data.get('target_value')  # user_id, role, segment_name, or 'all'
        notification_data = data.get('notification_data', {})
        
        if not target_type or not notification_data:
            return jsonify({
                'success': False,
                'message': 'target_type and notification_data are required'
            }), 400
        
        # Get OneSignal service
        onesignal_service = get_onesignal_service()
        
        if not onesignal_service.is_configured():
            return jsonify({
                'success': False,
                'message': 'OneSignal not configured'
            }), 400
        
        # Send notification based on target type
        if target_type == 'user':
            # Send to specific user
            success = onesignal_service.send_notification(target_value, notification_data)
            if success:
                return jsonify({
                    'success': True,
                    'message': f'Notification sent to user {target_value}'
                })
            else:
                return jsonify({
                    'success': False,
                    'message': f'Failed to send notification to user {target_value}'
                }), 500
                
        elif target_type == 'role':
            # Send to all users with specific role
            users = list(mongo_db.users.find({'role': target_value, 'is_active': True}))
            user_ids = [str(user['_id']) for user in users]
            
            if not user_ids:
                return jsonify({
                    'success': False,
                    'message': f'No active users found with role {target_value}'
                }), 404
            
            success = onesignal_service.send_bulk_notification(user_ids, notification_data)
            if success:
                return jsonify({
                    'success': True,
                    'message': f'Notification sent to {len(user_ids)} users with role {target_value}',
                    'user_count': len(user_ids)
                })
            else:
                return jsonify({
                    'success': False,
                    'message': f'Failed to send notification to role {target_value}'
                }), 500
                
        elif target_type == 'segment':
            # Send to OneSignal segment
            success = onesignal_service.send_segment_notification(target_value, notification_data)
            if success:
                return jsonify({
                    'success': True,
                    'message': f'Notification sent to segment {target_value}'
                })
            else:
                return jsonify({
                    'success': False,
                    'message': f'Failed to send notification to segment {target_value}'
                }), 500
                
        elif target_type == 'all':
            # Send to all active users
            users = list(mongo_db.users.find({'is_active': True}))
            user_ids = [str(user['_id']) for user in users]
            
            if not user_ids:
                return jsonify({
                    'success': False,
                    'message': 'No active users found'
                }), 404
            
            success = onesignal_service.send_bulk_notification(user_ids, notification_data)
            if success:
                return jsonify({
                    'success': True,
                    'message': f'Notification sent to {len(user_ids)} users',
                    'user_count': len(user_ids)
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Failed to send notification to all users'
                }), 500
        
        else:
            return jsonify({
                'success': False,
                'message': 'Invalid target_type. Must be "user", "role", "segment", or "all"'
            }), 400
            
    except Exception as e:
        logger.error(f"❌ Error sending OneSignal notification: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to send OneSignal notification'
        }), 500

@onesignal_notifications_bp.route('/test', methods=['POST'])
@token_required
def test_onesignal_notification(current_user):
    """Send a test OneSignal notification to the current user"""
    try:
        data = request.get_json()
        
        # Get test message or use default
        test_message = data.get('message', 'This is a test notification from VERSANT')
        
        # Create test notification data
        notification_data = {
            'title': 'Test Notification',
            'message': test_message,
            'type': 'test',
            'url': '/',
            'priority': 10
        }
        
        # Get OneSignal service
        onesignal_service = get_onesignal_service()
        
        if not onesignal_service.is_configured():
            return jsonify({
                'success': False,
                'message': 'OneSignal not configured'
            }), 400
        
        # Send test notification to current user
        user_id = str(current_user['_id'])
        success = onesignal_service.send_notification(user_id, notification_data)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Test notification sent successfully',
                'user_id': user_id
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to send test notification'
            }), 500
            
    except Exception as e:
        logger.error(f"❌ Error sending test OneSignal notification: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to send test notification'
        }), 500

@onesignal_notifications_bp.route('/user/identify', methods=['POST'])
@token_required
def identify_user(current_user):
    """Identify user with OneSignal (set external user ID)"""
    try:
        data = request.get_json()
        onesignal_player_id = data.get('onesignal_player_id')
        
        if not onesignal_player_id:
            return jsonify({
                'success': False,
                'message': 'OneSignal player ID is required'
            }), 400
        
        # Update user with OneSignal player ID
        user_id = str(current_user['_id'])
        mongo_db.users.update_one(
            {'_id': ObjectId(user_id)},
            {
                '$set': {
                    'onesignal_player_id': onesignal_player_id,
                    'onesignal_identified_at': datetime.utcnow()
                }
            }
        )
        
        # Create user segment data
        onesignal_service = get_onesignal_service()
        segment_data = onesignal_service.create_user_segment(
            user_id=user_id,
            role=current_user.get('role', 'student'),
            campus_id=current_user.get('campus_id'),
            course_id=current_user.get('course_id')
        )
        
        return jsonify({
            'success': True,
            'message': 'User identified with OneSignal',
            'user_id': user_id,
            'onesignal_player_id': onesignal_player_id,
            'segment_data': segment_data
        })
        
    except Exception as e:
        logger.error(f"❌ Error identifying user with OneSignal: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to identify user with OneSignal'
        }), 500

@onesignal_notifications_bp.route('/user/segments', methods=['GET'])
@token_required
def get_user_segments(current_user):
    """Get user segments for OneSignal"""
    try:
        onesignal_service = get_onesignal_service()
        
        user_id = str(current_user['_id'])
        segment_data = onesignal_service.create_user_segment(
            user_id=user_id,
            role=current_user.get('role', 'student'),
            campus_id=current_user.get('campus_id'),
            course_id=current_user.get('course_id')
        )
        
        return jsonify({
            'success': True,
            'message': 'User segments retrieved',
            'segments': segment_data
        })
        
    except Exception as e:
        logger.error(f"❌ Error getting user segments: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to get user segments'
        }), 500

@onesignal_notifications_bp.route('/notifications/history', methods=['GET'])
@token_required
@role_required(['superadmin', 'campus_admin'])
def get_notification_history(current_user):
    """Get notification history (placeholder for future implementation)"""
    try:
        # This would typically query a notifications collection
        # For now, return a placeholder response
        return jsonify({
            'success': True,
            'message': 'Notification history retrieved',
            'notifications': [],
            'total': 0
        })
        
    except Exception as e:
        logger.error(f"❌ Error getting notification history: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to get notification history'
        }), 500

# Background task for sending notifications
def _send_onesignal_notification_background(target_type: str, target_value: str, notification_data: dict):
    """Background task for sending OneSignal notifications"""
    try:
        onesignal_service = get_onesignal_service()
        
        if target_type == 'user':
            success = onesignal_service.send_notification(target_value, notification_data)
            logger.info(f"📱 Background OneSignal notification sent to user {target_value}: {success}")
        elif target_type == 'role':
            users = list(mongo_db.users.find({'role': target_value, 'is_active': True}))
            user_ids = [str(user['_id']) for user in users]
            success = onesignal_service.send_bulk_notification(user_ids, notification_data)
            logger.info(f"📱 Background OneSignal notification sent to role {target_value}: {success}")
        elif target_type == 'segment':
            success = onesignal_service.send_segment_notification(target_value, notification_data)
            logger.info(f"📱 Background OneSignal notification sent to segment {target_value}: {success}")
        elif target_type == 'all':
            users = list(mongo_db.users.find({'is_active': True}))
            user_ids = [str(user['_id']) for user in users]
            success = onesignal_service.send_bulk_notification(user_ids, notification_data)
            logger.info(f"📱 Background OneSignal notification sent to all users: {success}")
            
    except Exception as e:
        logger.error(f"❌ Error in background OneSignal notification task: {e}")

def queue_onesignal_notification(target_type: str, target_value: str, notification_data: dict):
    """Queue OneSignal notification for background processing"""
    try:
        submit_background_task(
            _send_onesignal_notification_background,
            target_type,
            target_value,
            notification_data
        )
        logger.info(f"📱 OneSignal notification queued: {target_type} -> {target_value}")
    except Exception as e:
        logger.error(f"❌ Error queuing OneSignal notification: {e}")
