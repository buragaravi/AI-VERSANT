"""
Push Notification Routes
API endpoints for managing push notification subscriptions and sending notifications
"""

import logging
import functools
from datetime import datetime
from flask import Blueprint, request, jsonify
from bson import ObjectId
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from utils.push_service_final import get_push_service
from utils.async_processor import submit_background_task
from mongo import mongo_db

logger = logging.getLogger(__name__)

# Create blueprint
push_notifications_bp = Blueprint('push_notifications', __name__)

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
            try:
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
                
                if user.get('role') not in allowed_roles:
                    return jsonify({
                        'success': False,
                        'message': f'Access denied. Required roles: {allowed_roles}'
                    }), 403
                
                # Add current_user to kwargs
                kwargs['current_user'] = user
                return f(*args, **kwargs)
            except Exception as e:
                logger.error(f"❌ Role authentication error: {e}")
                return jsonify({
                    'success': False,
                    'message': 'Authentication failed'
                }), 401
        return decorated_function
    return decorator

@push_notifications_bp.route('/subscribe', methods=['POST'])
@jwt_required()
def subscribe_to_push():
    """Subscribe user to push notifications"""
    try:
        data = request.get_json()
        
        if not data or 'subscription' not in data:
            return jsonify({
                'success': False,
                'message': 'Subscription data is required'
            }), 400
        
        subscription = data['subscription']
        user_agent = data.get('userAgent', '')
        timestamp = data.get('timestamp', datetime.utcnow().isoformat())
        
        # Validate subscription data
        required_fields = ['endpoint', 'keys']
        if not all(field in subscription for field in required_fields):
            return jsonify({
                'success': False,
                'message': 'Invalid subscription data'
            }), 400
        
        # Get current user
        current_user_id = get_jwt_identity()
        if not current_user_id:
            return jsonify({
                'success': False,
                'message': 'User not authenticated'
            }), 401
        
        # Get user from database
        current_user = mongo_db.find_user_by_id(current_user_id)
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 401
        
        # Store subscription in database
        subscription_doc = {
            'user_id': str(current_user['_id']),
            'endpoint': subscription['endpoint'],
            'keys': subscription['keys'],
            'user_agent': user_agent,
            'timestamp': datetime.fromisoformat(timestamp.replace('Z', '+00:00')),
            'active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        # Check if subscription already exists
        existing = mongo_db.push_subscriptions.find_one({
            'user_id': str(current_user['_id']),
            'endpoint': subscription['endpoint']
        })
        
        if existing:
            # Update existing subscription
            mongo_db.push_subscriptions.update_one(
                {'_id': existing['_id']},
                {'$set': {
                    'keys': subscription['keys'],
                    'user_agent': user_agent,
                    'timestamp': datetime.fromisoformat(timestamp.replace('Z', '+00:00')),
                    'active': True,
                    'updated_at': datetime.utcnow()
                }}
            )
            logger.info(f"✅ Updated push subscription for user {current_user['_id']}")
        else:
            # Create new subscription
            mongo_db.push_subscriptions.insert_one(subscription_doc)
            logger.info(f"✅ Created new push subscription for user {current_user['_id']}")
        
        return jsonify({
            'success': True,
            'message': 'Successfully subscribed to push notifications'
        })
        
    except Exception as e:
        logger.error(f"❌ Error subscribing to push notifications: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to subscribe to push notifications'
        }), 500

@push_notifications_bp.route('/unsubscribe', methods=['POST'])
@jwt_required()
def unsubscribe_from_push():
    """Unsubscribe user from push notifications"""
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        current_user = mongo_db.find_user_by_id(current_user_id)
        
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 401
        
        # Deactivate all subscriptions for the user
        result = mongo_db.push_subscriptions.update_many(
            {'user_id': str(current_user['_id'])},
            {'$set': {'active': False, 'updated_at': datetime.utcnow()}}
        )
        
        logger.info(f"✅ Deactivated {result.modified_count} push subscriptions for user {current_user['_id']}")
        
        return jsonify({
            'success': True,
            'message': 'Successfully unsubscribed from push notifications'
        })
        
    except Exception as e:
        logger.error(f"❌ Error unsubscribing from push notifications: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to unsubscribe from push notifications'
        }), 500

@push_notifications_bp.route('/status', methods=['GET'])
@token_required
def get_push_status(current_user):
    """Get user's push notification status"""
    try:
        # Get active subscriptions for the user
        subscriptions = list(mongo_db.push_subscriptions.find({
            'user_id': str(current_user['_id']),
            'active': True
        }))
        
        return jsonify({
            'success': True,
            'subscribed': len(subscriptions) > 0,
            'subscription_count': len(subscriptions),
            'subscriptions': subscriptions
        })
        
    except Exception as e:
        logger.error(f"❌ Error getting push status: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to get push notification status'
        }), 500

@push_notifications_bp.route('/send', methods=['POST'])
@token_required
@role_required(['admin', 'superadmin'])
def send_push_notification(current_user):
    """Send a push notification to specific users or roles"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request data is required'
            }), 400
        
        target_type = data.get('target_type')  # 'user', 'role', 'all'
        target_value = data.get('target_value')  # user_id, role, or 'all'
        payload = data.get('payload', {})
        
        if not target_type or not target_value:
            return jsonify({
                'success': False,
                'message': 'target_type and target_value are required'
            }), 400
        
        # Validate payload
        if not payload.get('title'):
            return jsonify({
                'success': False,
                'message': 'Notification title is required'
            }), 400
        
        # Get push service
        push_service = get_push_service()
        
        # Send notification based on target type
        if target_type == 'user':
            # Send to specific user
            success = push_service.send_to_user(target_value, payload, request.app.db)
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
            results = push_service.send_to_role(target_value, payload, request.app.db)
            return jsonify({
                'success': True,
                'message': f'Notification sent to role {target_value}',
                'results': results
            })
            
        elif target_type == 'all':
            # Send to all active subscriptions
            subscriptions = list(mongo_db.push_subscriptions.find({'active': True}))
            results = push_service.send_bulk_notifications(subscriptions, payload)
            return jsonify({
                'success': True,
                'message': 'Notification sent to all users',
                'results': results
            })
        
        else:
            return jsonify({
                'success': False,
                'message': 'Invalid target_type. Must be "user", "role", or "all"'
            }), 400
            
    except Exception as e:
        logger.error(f"❌ Error sending push notification: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to send push notification'
        }), 500

@push_notifications_bp.route('/test', methods=['POST'])
@jwt_required()
def test_push_notification():
    """Send a test push notification to the current user"""
    try:
        data = request.get_json()
        message = data.get('message', 'This is a test notification from VERSANT')
        
        # Log JWT token for debugging
        auth_header = request.headers.get('Authorization', '')
        logger.info(f"🔍 JWT Token (first 50 chars): {auth_header[:50]}...")
        
        payload = {
            'title': 'Test Notification',
            'body': message,
            'icon': '/favicon.ico',
            'tag': 'test-notification',
            'data': {
                'url': '/dashboard',
                'timestamp': datetime.utcnow().isoformat()
            }
        }
        
        # Get current user
        current_user_id = get_jwt_identity()
        logger.info(f"🔍 Current User ID: {current_user_id}")
        current_user = mongo_db.find_user_by_id(current_user_id)
        
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 401
        
        # Send to current user
        push_service = get_push_service()
        success = push_service.send_to_user(str(current_user['_id']), payload, mongo_db.db)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Test notification sent successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to send test notification'
            }), 500
            
    except Exception as e:
        logger.error(f"❌ Error sending test notification: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to send test notification'
        }), 500

@push_notifications_bp.route('/stats', methods=['GET'])
@token_required
@role_required(['admin', 'superadmin'])
def get_push_stats(current_user):
    """Get push notification statistics"""
    try:
        days = request.args.get('days', 7, type=int)
        
        push_service = get_push_service()
        stats = push_service.get_notification_stats(request.app.db, days)
        
        return jsonify({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        logger.error(f"❌ Error getting push stats: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to get push notification statistics'
        }), 500

@push_notifications_bp.route('/subscriptions', methods=['GET'])
@token_required
@role_required(['admin', 'superadmin'])
def get_all_subscriptions(current_user):
    """Get all push notification subscriptions (admin only)"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        skip = (page - 1) * limit
        
        # Get subscriptions with pagination
        subscriptions = list(mongo_db.push_subscriptions.find(
            {'active': True}
        ).skip(skip).limit(limit))
        
        # Get total count
        total = mongo_db.push_subscriptions.count_documents({'active': True})
        
        # Get user details for each subscription
        for subscription in subscriptions:
            user = mongo_db.users.find_one(
                {'_id': ObjectId(subscription['user_id'])},
                {'name': 1, 'email': 1, 'role': 1}
            )
            subscription['user'] = user
        
        return jsonify({
            'success': True,
            'subscriptions': subscriptions,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Error getting subscriptions: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to get push notification subscriptions'
        }), 500

# Background task for sending notifications
def _send_notification_background(target_type: str, target_value: str, payload: dict, db):
    """Background task for sending push notifications"""
    try:
        push_service = get_push_service()
        
        if target_type == 'user':
            success = push_service.send_to_user(target_value, payload, db)
            logger.info(f"📱 Background notification sent to user {target_value}: {success}")
        elif target_type == 'role':
            results = push_service.send_to_role(target_value, payload, db)
            logger.info(f"📱 Background notification sent to role {target_value}: {results}")
        elif target_type == 'all':
            subscriptions = list(db.push_subscriptions.find({'active': True}))
            results = push_service.send_bulk_notifications(subscriptions, payload)
            logger.info(f"📱 Background notification sent to all users: {results}")
            
    except Exception as e:
        logger.error(f"❌ Error in background notification task: {e}")

def queue_push_notification(target_type: str, target_value: str, payload: dict, db):
    """Queue a push notification for background processing"""
    try:
        task_id = submit_background_task(
            _send_notification_background,
            target_type,
            target_value,
            payload,
            db
        )
        logger.info(f"📱 Push notification queued (Task ID: {task_id})")
        return task_id
    except Exception as e:
        logger.error(f"❌ Error queuing push notification: {e}")
        return None
