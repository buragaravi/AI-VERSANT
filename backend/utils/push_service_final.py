"""
Final Working Push Notification Service
Simplified implementation that focuses on getting basic functionality working
"""

import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from mongo import mongo_db
from pywebpush import webpush, WebPushException
from py_vapid import Vapid
from cryptography.hazmat.primitives import serialization

logger = logging.getLogger(__name__)

class FinalPushService:
    """Final working push notification service with simplified implementation"""
    
    def __init__(self, vapid_private_key: str, vapid_public_key: str, vapid_email: str):
        """
        Initialize the push notification service
        
        Args:
            vapid_private_key: VAPID private key (PEM format)
            vapid_public_key: VAPID public key (base64url format)
            vapid_email: VAPID email contact
        """
        self.vapid_private_key = vapid_private_key
        self.vapid_public_key = vapid_public_key
        self.vapid_email = vapid_email
        
        # Initialize VAPID object for claims
        try:
            # Clean the private key
            cleaned_key = vapid_private_key.replace('\\n', '\n')
            if not cleaned_key.startswith('-----BEGIN'):
                cleaned_key = f"-----BEGIN PRIVATE KEY-----\n{cleaned_key}\n-----END PRIVATE KEY-----"
            
            # Create VAPID object
            self.vapid = Vapid.from_pem(cleaned_key.encode('utf-8'))
            logger.info("✅ VAPID object created successfully")
        except Exception as e:
            logger.error(f"❌ Error creating VAPID object: {e}")
            self.vapid = None
        
        logger.info("🔧 Final Push Notification Service initialized")
        logger.info(f"📧 VAPID Email: {vapid_email}")
        logger.info(f"🔑 Public Key: {vapid_public_key[:50]}...")
    
    def send_notification(self, subscription: Dict[str, Any], payload: Dict[str, Any]) -> bool:
        """
        Send a push notification to a specific subscription
        
        Args:
            subscription: Push subscription object from frontend
            payload: Notification payload data
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            endpoint = subscription.get('endpoint')
            keys = subscription.get('keys', {})
            p256dh = keys.get('p256dh')
            auth = keys.get('auth')
            
            if not all([endpoint, p256dh, auth]):
                logger.error("❌ Invalid subscription data")
                return False
            
            # Prepare notification data
            notification_data = {
                'title': payload.get('title', 'VERSANT Notification'),
                'body': payload.get('body', 'You have a new notification'),
                'icon': payload.get('icon', '/favicon.ico'),
                'badge': payload.get('badge', '/favicon.ico'),
                'tag': payload.get('tag', 'versant-notification'),
                'data': payload.get('data', {}),
                'actions': payload.get('actions', []),
                'requireInteraction': payload.get('requireInteraction', False),
                'silent': payload.get('silent', False)
            }
            
            # Send actual push notification using pywebpush
            try:
                if self.vapid is None:
                    logger.error("❌ VAPID object is not initialized")
                    return False
                
                # Convert PEM to DER format for pywebpush
                from cryptography.hazmat.primitives import serialization
                from cryptography.hazmat.primitives.serialization import load_pem_private_key
                import base64
                
                # Load the private key from PEM
                private_key = load_pem_private_key(
                    self.vapid_private_key.encode('utf-8'),
                    password=None
                )
                
                # Convert to DER format
                der_key = private_key.private_bytes(
                    encoding=serialization.Encoding.DER,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                )
                
                # Convert to base64url format for pywebpush
                vapid_private_key_der = base64.urlsafe_b64encode(der_key).decode('utf-8').rstrip('=')
                
                # Prepare subscription info for pywebpush
                subscription_info = {
                    'endpoint': endpoint,
                    'keys': {
                        'p256dh': p256dh,
                        'auth': auth
                    }
                }
                
                # Send the notification
                # For FCM, the audience should be the FCM endpoint
                if 'fcm.googleapis.com' in endpoint:
                    audience = "https://fcm.googleapis.com"
                else:
                    # For other push services, use the origin
                    audience = "https://crt.pydahsoft.in"
                
                response = webpush(
                    subscription_info=subscription_info,
                    data=json.dumps(notification_data),
                    vapid_private_key=vapid_private_key_der,
                    vapid_claims={
                        "sub": f"mailto:{self.vapid_email}",
                        "aud": audience
                    }
                )
                
                logger.info(f"📱 Push notification sent successfully to {endpoint}")
                logger.info(f"📝 Notification: {notification_data['title']} - {notification_data['body']}")
                logger.info(f"📊 Response status: {response.status_code}")
                
                return True
                
            except WebPushException as e:
                logger.error(f"❌ WebPush error: {e}")
                if e.response:
                    logger.error(f"❌ Response status: {e.response.status_code}")
                    logger.error(f"❌ Response text: {e.response.text}")
                return False
            except Exception as e:
                logger.error(f"❌ Error in pywebpush: {e}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error sending push notification: {e}")
            return False
    
    def send_bulk_notifications(self, subscriptions: List[Dict[str, Any]], payload: Dict[str, Any]) -> Dict[str, int]:
        """
        Send push notifications to multiple subscriptions
        
        Args:
            subscriptions: List of push subscription objects
            payload: Notification payload data
            
        Returns:
            Dict with counts of successful and failed notifications
        """
        successful = 0
        failed = 0
        
        logger.info(f"📱 Sending bulk notifications to {len(subscriptions)} subscriptions")
        
        for subscription in subscriptions:
            try:
                if self.send_notification(subscription, payload):
                    successful += 1
                else:
                    failed += 1
            except Exception as e:
                logger.error(f"❌ Error processing subscription: {e}")
                failed += 1
        
        logger.info(f"📊 Bulk notification results: {successful} success, {failed} failed")
        return {"successful": successful, "failed": failed}
    
    def send_to_user(self, user_id: str, payload: Dict[str, Any], db) -> bool:
        """
        Send push notification to a specific user
        
        Args:
            user_id: User ID to send notification to
            payload: Notification payload data
            db: Database connection
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Get user's push subscriptions
            subscriptions = db.push_subscriptions.find({'user_id': user_id, 'active': True})
            subscriptions_list = list(subscriptions)
            
            if not subscriptions_list:
                logger.warn(f"⚠️ No active subscriptions found for user {user_id}")
                return False
            
            # Send to all user's subscriptions
            results = self.send_bulk_notifications(subscriptions_list, payload)
            
            # Log notification to database
            self._log_notification(user_id, payload, results, db)
            
            return results['successful'] > 0
            
        except Exception as e:
            logger.error(f"❌ Error sending notification to user {user_id}: {e}")
            return False
    
    def send_to_role(self, role: str, payload: Dict[str, Any], db) -> Dict[str, int]:
        """
        Send push notification to all users with a specific role
        
        Args:
            role: User role (admin, student, superadmin)
            payload: Notification payload data
            db: Database connection
            
        Returns:
            Dict with counts of successful and failed notifications
        """
        try:
            # Get all users with the specified role
            users = db.users.find({'role': role}, {'_id': 1})
            user_ids = [str(user['_id']) for user in users]
            
            if not user_ids:
                logger.warn(f"⚠️ No users found with role {role}")
                return {"successful": 0, "failed": 0}
            
            # Get all subscriptions for these users
            subscriptions = db.push_subscriptions.find({
                'user_id': {'$in': user_ids},
                'active': True
            })
            subscriptions_list = list(subscriptions)
            
            if not subscriptions_list:
                logger.warn(f"⚠️ No active subscriptions found for role {role}")
                return {"successful": 0, "failed": 0}
            
            # Send notifications
            results = self.send_bulk_notifications(subscriptions_list, payload)
            
            # Log notification to database
            self._log_notification(f"role:{role}", payload, results, db)
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Error sending notification to role {role}: {e}")
            return {"successful": 0, "failed": 0}
    
    def _log_notification(self, target: str, payload: Dict[str, Any], results: Dict[str, int], db):
        """
        Log notification to database
        
        Args:
            target: Target user ID or role
            payload: Notification payload data
            results: Results of sending notifications
            db: Database connection
        """
        try:
            notification_log = {
                'target': target,
                'payload': payload,
                'results': results,
                'timestamp': datetime.utcnow(),
                'successful': results.get('successful', 0),
                'failed': results.get('failed', 0)
            }
            
            db.notifications.insert_one(notification_log)
            logger.info(f"📝 Notification logged for target: {target}")
            
        except Exception as e:
            logger.error(f"❌ Error logging notification: {e}")

# Global instance
_push_service_instance = None

def initialize_push_service(vapid_private_key: str, vapid_public_key: str, vapid_email: str):
    """Initialize the global push service instance"""
    global _push_service_instance
    _push_service_instance = FinalPushService(vapid_private_key, vapid_public_key, vapid_email)
    logger.info("🚀 Global final push service initialized")

def get_push_service() -> FinalPushService:
    """Get the global push service instance"""
    if _push_service_instance is None:
        raise Exception("Push service not initialized. Call initialize_push_service() first.")
    return _push_service_instance
