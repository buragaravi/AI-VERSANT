#!/usr/bin/env python3
"""
Push Notification Helper - Utility functions for sending push notifications
Integrates with existing operations to send contextual notifications
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from bson import ObjectId
from utils.push_service_final import get_push_service
from mongo import mongo_db

# Configure logging
logger = logging.getLogger(__name__)

class PushNotificationHelper:
    """Helper class for sending push notifications in various contexts"""
    
    def __init__(self):
        self.push_service = get_push_service()
    
    def send_form_submission_notification(self, form_id: str, student_id: str, form_title: str, status: str = 'submitted'):
        """Send notification when a form is submitted"""
        try:
            # Get student details
            student = mongo_db.find_user_by_id(student_id)
            if not student:
                logger.warning(f"Student not found for ID: {student_id}")
                return False
            
            # Prepare notification payload
            payload = {
                'title': 'Form Submission Update',
                'body': f'Your form "{form_title}" has been {status} successfully!',
                'icon': '/favicon.ico',
                'tag': f'form-submission-{form_id}',
                'data': {
                    'url': '/student/forms',
                    'form_id': form_id,
                    'status': status,
                    'timestamp': datetime.utcnow().isoformat()
                }
            }
            
            # Send to student
            success = self.push_service.send_to_user(student_id, payload, mongo_db.db)
            if success:
                logger.info(f"📱 Form submission notification sent to student {student_id}")
            else:
                logger.warning(f"❌ Failed to send form submission notification to student {student_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Error sending form submission notification: {e}")
            return False
    
    def send_test_creation_notification(self, test_id: str, test_name: str, target_students: List[str] = None):
        """Send notification when a new test is created"""
        try:
            # Prepare notification payload
            payload = {
                'title': 'New Test Available',
                'body': f'A new test "{test_name}" is now available for you!',
                'icon': '/favicon.ico',
                'tag': f'test-creation-{test_id}',
                'data': {
                    'url': '/student/exams',
                    'test_id': test_id,
                    'test_name': test_name,
                    'timestamp': datetime.utcnow().isoformat()
                }
            }
            
            if target_students:
                # Send to specific students
                results = []
                for student_id in target_students:
                    success = self.push_service.send_to_user(student_id, payload, mongo_db.db)
                    results.append({'student_id': student_id, 'success': success})
                
                successful = sum(1 for r in results if r['success'])
                logger.info(f"📱 Test creation notification sent to {successful}/{len(target_students)} students")
                return results
            else:
                # Send to all students
                subscriptions = list(mongo_db.push_subscriptions.find({'active': True, 'user_role': 'student'}))
                results = self.push_service.send_bulk_notifications(subscriptions, payload)
                logger.info(f"📱 Test creation notification sent to all students: {results}")
                return results
                
        except Exception as e:
            logger.error(f"❌ Error sending test creation notification: {e}")
            return False
    
    def send_test_completion_notification(self, test_id: str, student_id: str, test_name: str, score: int = None, total_marks: int = None):
        """Send notification when a test is completed"""
        try:
            # Get student details
            student = mongo_db.find_user_by_id(student_id)
            if not student:
                logger.warning(f"Student not found for ID: {student_id}")
                return False
            
            # Prepare notification payload
            score_text = ""
            if score is not None and total_marks is not None:
                percentage = (score / total_marks) * 100
                score_text = f" You scored {score}/{total_marks} ({percentage:.1f}%)"
            
            payload = {
                'title': 'Test Completed',
                'body': f'You have completed "{test_name}"!{score_text}',
                'icon': '/favicon.ico',
                'tag': f'test-completion-{test_id}',
                'data': {
                    'url': '/student/history',
                    'test_id': test_id,
                    'test_name': test_name,
                    'score': score,
                    'total_marks': total_marks,
                    'timestamp': datetime.utcnow().isoformat()
                }
            }
            
            # Send to student
            success = self.push_service.send_to_user(student_id, payload, mongo_db.db)
            if success:
                logger.info(f"📱 Test completion notification sent to student {student_id}")
            else:
                logger.warning(f"❌ Failed to send test completion notification to student {student_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Error sending test completion notification: {e}")
            return False
    
    def send_reminder_notification(self, reminder_type: str, title: str, message: str, target_students: List[str] = None):
        """Send reminder notifications"""
        try:
            # Prepare notification payload
            payload = {
                'title': title,
                'body': message,
                'icon': '/favicon.ico',
                'tag': f'reminder-{reminder_type}',
                'data': {
                    'url': '/student',
                    'reminder_type': reminder_type,
                    'timestamp': datetime.utcnow().isoformat()
                }
            }
            
            if target_students:
                # Send to specific students
                results = []
                for student_id in target_students:
                    success = self.push_service.send_to_user(student_id, payload, mongo_db.db)
                    results.append({'student_id': student_id, 'success': success})
                
                successful = sum(1 for r in results if r['success'])
                logger.info(f"📱 Reminder notification sent to {successful}/{len(target_students)} students")
                return results
            else:
                # Send to all students
                subscriptions = list(mongo_db.push_subscriptions.find({'active': True, 'user_role': 'student'}))
                results = self.push_service.send_bulk_notifications(subscriptions, payload)
                logger.info(f"📱 Reminder notification sent to all students: {results}")
                return results
                
        except Exception as e:
            logger.error(f"❌ Error sending reminder notification: {e}")
            return False
    
    def send_batch_creation_notification(self, batch_name: str, campus_name: str, course_name: str, target_students: List[str] = None):
        """Send notification when a new batch is created"""
        try:
            # Prepare notification payload
            payload = {
                'title': 'New Batch Created',
                'body': f'You have been added to batch "{batch_name}" for {course_name} at {campus_name}',
                'icon': '/favicon.ico',
                'tag': f'batch-creation-{batch_name}',
                'data': {
                    'url': '/student',
                    'batch_name': batch_name,
                    'campus_name': campus_name,
                    'course_name': course_name,
                    'timestamp': datetime.utcnow().isoformat()
                }
            }
            
            if target_students:
                # Send to specific students
                results = []
                for student_id in target_students:
                    success = self.push_service.send_to_user(student_id, payload, mongo_db.db)
                    results.append({'student_id': student_id, 'success': success})
                
                successful = sum(1 for r in results if r['success'])
                logger.info(f"📱 Batch creation notification sent to {successful}/{len(target_students)} students")
                return results
            else:
                # Send to all students
                subscriptions = list(mongo_db.push_subscriptions.find({'active': True, 'user_role': 'student'}))
                results = self.push_service.send_bulk_notifications(subscriptions, payload)
                logger.info(f"📱 Batch creation notification sent to all students: {results}")
                return results
                
        except Exception as e:
            logger.error(f"❌ Error sending batch creation notification: {e}")
            return False
    
    def send_admin_notification(self, title: str, message: str, admin_role: str = 'superadmin'):
        """Send notification to admins"""
        try:
            # Prepare notification payload
            payload = {
                'title': title,
                'body': message,
                'icon': '/favicon.ico',
                'tag': f'admin-{admin_role}',
                'data': {
                    'url': '/superadmin' if admin_role == 'superadmin' else '/campus-admin',
                    'admin_role': admin_role,
                    'timestamp': datetime.utcnow().isoformat()
                }
            }
            
            # Send to admins with specific role
            subscriptions = list(mongo_db.push_subscriptions.find({'active': True, 'user_role': admin_role}))
            results = self.push_service.send_bulk_notifications(subscriptions, payload)
            logger.info(f"📱 Admin notification sent to {admin_role} role: {results}")
            return results
            
        except Exception as e:
            logger.error(f"❌ Error sending admin notification: {e}")
            return False

# Global instance
push_notification_helper = PushNotificationHelper()
