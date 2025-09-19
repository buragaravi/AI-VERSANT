"""
Database Setup for Push Notifications
Creates necessary collections and indexes for push notification system
"""

import logging
from datetime import datetime
from utils.connection_manager import get_mongo_database

logger = logging.getLogger(__name__)

def setup_push_database():
    """Set up database collections and indexes for push notifications"""
    try:
        db = get_mongo_database()
        
        # Create push_subscriptions collection
        push_subscriptions = db.push_subscriptions
        
        # Create indexes for push_subscriptions
        push_subscriptions.create_index("user_id")
        push_subscriptions.create_index("endpoint")
        push_subscriptions.create_index("active")
        push_subscriptions.create_index([("user_id", 1), ("active", 1)])
        
        logger.info("✅ Created push_subscriptions collection with indexes")
        
        # Create notifications collection for logging
        notifications = db.notifications
        
        # Create indexes for notifications
        notifications.create_index("target")
        notifications.create_index("timestamp")
        notifications.create_index("status")
        notifications.create_index([("target", 1), ("timestamp", -1)])
        
        logger.info("✅ Created notifications collection with indexes")
        
        # Create notification_preferences collection
        notification_preferences = db.notification_preferences
        
        # Create indexes for notification_preferences
        notification_preferences.create_index("user_id", unique=True)
        notification_preferences.create_index("preferences.notification_types")
        
        logger.info("✅ Created notification_preferences collection with indexes")
        
        # Insert default notification preferences for existing users
        setup_default_preferences(db)
        
        logger.info("🎉 Push notification database setup completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error setting up push notification database: {e}")
        return False

def setup_default_preferences(db):
    """Set up default notification preferences for existing users"""
    try:
        # Get all users
        users = db.users.find({}, {'_id': 1, 'role': 1})
        
        default_preferences = {
            'test_created': True,
            'test_submitted': True,
            'test_reminder': True,
            'test_deadline': True,
            'test_results': True,
            'system_alerts': True,
            'background_tasks': False  # Only for admins
        }
        
        for user in users:
            user_id = str(user['_id'])
            role = user.get('role', 'student')
            
            # Check if preferences already exist
            existing = db.notification_preferences.find_one({'user_id': user_id})
            if existing:
                continue
            
            # Set role-specific preferences
            preferences = default_preferences.copy()
            if role in ['admin', 'superadmin', 'campus_admin', 'course_admin']:
                preferences['background_tasks'] = True
                preferences['test_submitted'] = True  # Admins get notified of submissions
            
            # Insert default preferences
            db.notification_preferences.insert_one({
                'user_id': user_id,
                'role': role,
                'preferences': preferences,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            })
        
        logger.info(f"✅ Set up default notification preferences for users")
        
    except Exception as e:
        logger.error(f"❌ Error setting up default preferences: {e}")

def get_notification_preferences(user_id: str, db):
    """Get notification preferences for a user"""
    try:
        preferences = db.notification_preferences.find_one({'user_id': user_id})
        if preferences:
            return preferences['preferences']
        else:
            # Return default preferences if none found
            return {
                'test_created': True,
                'test_submitted': True,
                'test_reminder': True,
                'test_deadline': True,
                'test_results': True,
                'system_alerts': True,
                'background_tasks': False
            }
    except Exception as e:
        logger.error(f"❌ Error getting notification preferences: {e}")
        return {}

def update_notification_preferences(user_id: str, preferences: dict, db):
    """Update notification preferences for a user"""
    try:
        result = db.notification_preferences.update_one(
            {'user_id': user_id},
            {
                '$set': {
                    'preferences': preferences,
                    'updated_at': datetime.utcnow()
                }
            },
            upsert=True
        )
        
        if result.upserted_id:
            logger.info(f"✅ Created notification preferences for user {user_id}")
        else:
            logger.info(f"✅ Updated notification preferences for user {user_id}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error updating notification preferences: {e}")
        return False

if __name__ == "__main__":
    setup_push_database()
