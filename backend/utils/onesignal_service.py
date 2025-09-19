"""
OneSignal Push Notification Service
Handles OneSignal Web Push API integration for sending notifications
"""

import os
import json
import logging
import requests
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class OneSignalService:
    """Service for handling push notifications using OneSignal API"""
    
    def __init__(self):
        """Initialize OneSignal service with environment variables"""
        self.app_id = os.getenv('ONESIGNAL_APP_ID')
        self.rest_api_key = os.getenv('ONESIGNAL_REST_API_KEY')
        self.base_url = 'https://api.onesignal.com'
        
        # Log configuration status
        if self.app_id and self.rest_api_key:
            logger.info("✅ OneSignal service initialized successfully")
            logger.info(f"📱 App ID: {self.app_id[:8]}...")
        else:
            logger.warning("⚠️ OneSignal not configured - missing APP_ID or REST_API_KEY")
    
    def is_configured(self) -> bool:
        """Check if OneSignal is properly configured"""
        return bool(self.app_id and self.rest_api_key)
    
    def send_notification(self, user_id: str, notification_data: Dict[str, Any]) -> bool:
        """
        Send notification to specific user via OneSignal
        
        Args:
            user_id: External user ID (MongoDB user ID)
            notification_data: Notification payload data
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if not self.is_configured():
                logger.error("❌ OneSignal not configured")
                return False

            # Build the notification payload according to OneSignal documentation
            payload = {
                "app_id": self.app_id,
                "include_external_user_ids": [str(user_id)],
                "headings": {"en": notification_data.get('title', 'New Notification')},
                "contents": {"en": notification_data.get('message', 'You have a new notification')},
                "url": notification_data.get('url', '/'),
                "data": {
                    "type": notification_data.get('type', 'general'),
                    "id": notification_data.get('id'),
                    "relatedId": notification_data.get('relatedId'),
                    **notification_data.get('data', {})
                },
                # Web push specific parameters
                "chrome_web_image": notification_data.get('image'),
                "chrome_web_icon": notification_data.get('icon', 'https://hms.pydahsoft.in/PYDAH_LOGO_PHOTO.jpg'),
                # Priority and TTL
                "priority": notification_data.get('priority', 10),
                "ttl": notification_data.get('ttl', 86400),  # 24 hours
                # Collapse and topic
                "collapse_id": notification_data.get('collapseId'),
                "web_push_topic": notification_data.get('topic'),
                # Platform targeting - ensure web push is enabled
                "isAnyWeb": True,
                # Additional required parameters
                "channel_for_external_user_ids": "push",
                # Enable frequency capping
                "enable_frequency_cap": True
            }

            # Remove None values
            payload = {k: v for k, v in payload.items() if v is not None}

            response = requests.post(
                f'{self.base_url}/notifications',
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Basic {self.rest_api_key}'
                },
                timeout=30
            )

            if response.status_code == 200:
                logger.info(f"✅ OneSignal notification sent to user {user_id}")
                return True
            else:
                logger.error(f"❌ OneSignal API error: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            logger.error(f"❌ Error sending OneSignal notification: {e}")
            return False

    def send_bulk_notification(self, user_ids: List[str], notification_data: Dict[str, Any]) -> bool:
        """
        Send notification to multiple users via OneSignal
        
        Args:
            user_ids: List of external user IDs
            notification_data: Notification payload data
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if not self.is_configured():
                logger.error("❌ OneSignal not configured")
                return False

            if not user_ids or len(user_ids) == 0:
                logger.warning("⚠️ No user IDs provided for bulk notification")
                return False

            payload = {
                "app_id": self.app_id,
                "include_external_user_ids": [str(uid) for uid in user_ids],
                "headings": {"en": notification_data.get('title', 'New Notification')},
                "contents": {"en": notification_data.get('message', 'You have a new notification')},
                "url": notification_data.get('url', '/'),
                "data": {
                    "type": notification_data.get('type', 'general'),
                    "id": notification_data.get('id'),
                    "relatedId": notification_data.get('relatedId'),
                    **notification_data.get('data', {})
                },
                # Web push specific parameters
                "chrome_web_image": notification_data.get('image'),
                "chrome_web_icon": notification_data.get('icon', 'https://hms.pydahsoft.in/PYDAH_LOGO_PHOTO.jpg'),
                # Priority and TTL
                "priority": notification_data.get('priority', 10),
                "ttl": notification_data.get('ttl', 86400),
                # Collapse and topic
                "collapse_id": notification_data.get('collapseId'),
                "web_push_topic": notification_data.get('topic'),
                # Platform targeting - ensure web push is enabled
                "isAnyWeb": True,
                # Additional required parameters
                "channel_for_external_user_ids": "push",
                # Enable frequency capping
                "enable_frequency_cap": True
            }

            # Remove None values
            payload = {k: v for k, v in payload.items() if v is not None}

            logger.info(f"🔔 Sending OneSignal bulk notification to {len(user_ids)} users")

            response = requests.post(
                f'{self.base_url}/notifications',
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Basic {self.rest_api_key}'
                },
                timeout=30
            )

            if response.status_code == 200:
                logger.info(f"✅ OneSignal bulk notification sent to {len(user_ids)} users")
                return True
            else:
                logger.error(f"❌ OneSignal API error: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            logger.error(f"❌ Error sending OneSignal bulk notification: {e}")
            return False

    def send_segment_notification(self, segment: str, notification_data: Dict[str, Any]) -> bool:
        """
        Send notification to segment via OneSignal
        
        Args:
            segment: OneSignal segment name
            notification_data: Notification payload data
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if not self.is_configured():
                logger.error("❌ OneSignal not configured")
                return False

            logger.info(f"🔔 Sending OneSignal segment notification to: {segment}")

            payload = {
                "app_id": self.app_id,
                "included_segments": [segment],
                "headings": {"en": notification_data.get('title', 'New Notification')},
                "contents": {"en": notification_data.get('message', 'You have a new notification')},
                "url": notification_data.get('url', '/'),
                "data": {
                    "type": notification_data.get('type', 'general'),
                    "id": notification_data.get('id'),
                    "relatedId": notification_data.get('relatedId'),
                    **notification_data.get('data', {})
                },
                # Web push specific parameters
                "chrome_web_image": notification_data.get('image'),
                "chrome_web_icon": notification_data.get('icon', 'https://hms.pydahsoft.in/PYDAH_LOGO_PHOTO.jpg'),
                # Priority and TTL
                "priority": notification_data.get('priority', 10),
                "ttl": notification_data.get('ttl', 86400),
                # Collapse and topic
                "collapse_id": notification_data.get('collapseId'),
                "web_push_topic": notification_data.get('topic'),
                # Platform targeting - ensure web push is enabled
                "isAnyWeb": True,
                # Enable frequency capping
                "enable_frequency_cap": True
            }

            # Remove None values
            payload = {k: v for k, v in payload.items() if v is not None}

            response = requests.post(
                f'{self.base_url}/notifications',
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Basic {self.rest_api_key}'
                },
                timeout=30
            )

            if response.status_code == 200:
                logger.info(f"✅ OneSignal segment notification sent to {segment}")
                return True
            else:
                logger.error(f"❌ OneSignal API error: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            logger.error(f"❌ Error sending OneSignal segment notification: {e}")
            return False

    def get_notification_payload(self, notification_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get notification payload based on type
        
        Args:
            notification_type: Type of notification
            data: Notification data
            
        Returns:
            dict: Formatted notification payload
        """
        base_payload = {
            "title": data.get('title', 'New Notification'),
            "message": data.get('message', 'You have a new notification'),
            "type": notification_type,
            "id": data.get('id'),
            "relatedId": data.get('relatedId')
        }

        if notification_type == 'test_created':
            return {
                **base_payload,
                "title": data.get('title', 'New Test Available'),
                "url": f"/student/online-exams/{data.get('relatedId')}",
                "collapseId": f"test-{data.get('relatedId')}",
                "priority": 10
            }
        
        elif notification_type == 'test_submitted':
            return {
                **base_payload,
                "title": data.get('title', 'Test Submitted'),
                "url": f"/test-management/results/{data.get('relatedId')}",
                "collapseId": f"submission-{data.get('relatedId')}",
                "priority": 9
            }
        
        elif notification_type == 'form_submitted':
            return {
                **base_payload,
                "title": data.get('title', 'Form Submission Received'),
                "url": f"/form-submissions/{data.get('relatedId')}",
                "collapseId": f"form-{data.get('relatedId')}",
                "priority": 8
            }
        
        elif notification_type == 'announcement':
            return {
                **base_payload,
                "title": data.get('title', 'New Announcement'),
                "url": f"/announcements/{data.get('relatedId')}",
                "collapseId": f"announcement-{data.get('relatedId')}",
                "priority": 8
            }
        
        elif notification_type == 'system':
            return {
                **base_payload,
                "title": data.get('title', 'System Notification'),
                "url": data.get('url', '/'),
                "priority": 7
            }
        
        else:
            return {
                **base_payload,
                "url": data.get('url', '/'),
                "priority": 8
            }

    def test_connection(self) -> Dict[str, Any]:
        """
        Test OneSignal connection
        
        Returns:
            dict: Connection test result
        """
        try:
            if not self.is_configured():
                return {
                    "success": False,
                    "message": "OneSignal not configured"
                }

            response = requests.get(
                f'{self.base_url}/apps/{self.app_id}',
                headers={
                    'Authorization': f'Basic {self.rest_api_key}'
                },
                timeout=10
            )

            if response.status_code == 200:
                return {
                    "success": True,
                    "message": "OneSignal connection successful",
                    "app": response.json()
                }
            else:
                return {
                    "success": False,
                    "message": "OneSignal connection failed",
                    "error": response.text
                }

        except Exception as e:
            return {
                "success": False,
                "message": "OneSignal connection failed",
                "error": str(e)
            }

    def create_user_segment(self, user_id: str, role: str, campus_id: str = None, course_id: str = None) -> Dict[str, Any]:
        """
        Create user segment data for OneSignal
        
        Args:
            user_id: User ID
            role: User role
            campus_id: Campus ID (optional)
            course_id: Course ID (optional)
            
        Returns:
            dict: User segment data
        """
        return {
            "external_user_id": str(user_id),
            "tags": {
                "role": role,
                "campus_id": campus_id or "",
                "course_id": course_id or ""
            }
        }

# Global OneSignal service instance
onesignal_service = OneSignalService()

def get_onesignal_service() -> OneSignalService:
    """Get OneSignal service instance"""
    return onesignal_service
