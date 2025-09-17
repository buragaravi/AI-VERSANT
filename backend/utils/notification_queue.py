#!/usr/bin/env python3
"""
Notification Queue System - Background SMS and Email Processing
Uses existing async processor for non-blocking notifications
"""

import logging
import time
from typing import Dict, List, Optional, Any
from utils.async_processor import submit_background_task
from utils.email_service import send_email, render_template
from utils.sms_service import send_student_credentials_sms, send_custom_sms
from utils.resilient_services import create_resilient_services

# Configure logging
logger = logging.getLogger(__name__)

class NotificationQueue:
    """Background notification queue using existing async system"""
    
    def __init__(self):
        self.resilient_services = create_resilient_services()
        self.queue_stats = {
            'total_queued': 0,
            'total_processed': 0,
            'total_failed': 0,
            'sms_queued': 0,
            'email_queued': 0,
            'sms_processed': 0,
            'email_processed': 0,
            'sms_failed': 0,
            'email_failed': 0
        }
    
    def queue_sms_notification(self, phone: str, message: str, notification_type: str = 'custom', 
                             student_name: str = None, username: str = None, password: str = None) -> str:
        """Queue SMS notification for background processing"""
        try:
            task_id = submit_background_task(
                self._process_sms_notification,
                phone=phone,
                message=message,
                notification_type=notification_type,
                student_name=student_name,
                username=username,
                password=password
            )
            
            self.queue_stats['total_queued'] += 1
            self.queue_stats['sms_queued'] += 1
            
            logger.info(f"📱 SMS queued for {phone} (Task ID: {task_id})")
            return task_id
            
        except Exception as e:
            logger.error(f"❌ Failed to queue SMS for {phone}: {e}")
            return None
    
    def queue_email_notification(self, email: str, subject: str, content: str, 
                                template_name: str = None, template_params: Dict = None) -> str:
        """Queue email notification for background processing"""
        try:
            task_id = submit_background_task(
                self._process_email_notification,
                email=email,
                subject=subject,
                content=content,
                template_name=template_name,
                template_params=template_params
            )
            
            self.queue_stats['total_queued'] += 1
            self.queue_stats['email_queued'] += 1
            
            logger.info(f"📧 Email queued for {email} (Task ID: {task_id})")
            return task_id
            
        except Exception as e:
            logger.error(f"❌ Failed to queue email for {email}: {e}")
            return None
    
    def queue_student_credentials(self, student_data: Dict) -> Dict:
        """Queue student credentials (both SMS and email) for background processing"""
        results = {
            'sms_task_id': None,
            'email_task_id': None,
            'success': False,
            'errors': []
        }
        
        try:
            # Extract student data
            name = student_data.get('name', 'Student')
            email = student_data.get('email')
            phone = student_data.get('mobile_number') or student_data.get('phone_number')
            username = student_data.get('username')
            password = student_data.get('password')
            
            # Queue email if email exists
            if email:
                email_task_id = self.queue_email_notification(
                    email=email,
                    subject=f"Welcome to VERSANT - Your Student Credentials",
                    content="",  # Will be generated from template
                    template_name="student_credentials.html",
                    template_params={
                        'name': name,
                        'username': username,
                        'email': email,
                        'password': password,
                        'login_url': 'https://crt.pydahsoft.in/login'
                    }
                )
                results['email_task_id'] = email_task_id
            
            # Queue SMS if phone exists
            if phone:
                sms_task_id = self.queue_sms_notification(
                    phone=phone,
                    message="",  # Will use template
                    notification_type='student_credentials',
                    student_name=name,
                    username=username,
                    password=password
                )
                results['sms_task_id'] = sms_task_id
            
            results['success'] = True
            logger.info(f"✅ Student credentials queued for {name}")
            
        except Exception as e:
            logger.error(f"❌ Failed to queue student credentials: {e}")
            results['errors'].append(str(e))
        
        return results
    
    def queue_batch_notifications(self, students: List[Dict], notification_type: str = 'welcome') -> Dict:
        """Queue notifications for multiple students"""
        results = {
            'total_students': len(students),
            'queued_sms': 0,
            'queued_email': 0,
            'failed': 0,
            'task_ids': []
        }
        
        for student in students:
            try:
                if notification_type == 'welcome':
                    student_result = self.queue_student_credentials(student)
                    if student_result['success']:
                        if student_result['sms_task_id']:
                            results['queued_sms'] += 1
                        if student_result['email_task_id']:
                            results['queued_email'] += 1
                        results['task_ids'].extend([
                            student_result['sms_task_id'],
                            student_result['email_task_id']
                        ])
                    else:
                        results['failed'] += 1
                        
            except Exception as e:
                logger.error(f"❌ Failed to queue notification for student {student.get('name', 'Unknown')}: {e}")
                results['failed'] += 1
        
        logger.info(f"📊 Batch notifications queued: {results['queued_sms']} SMS, {results['queued_email']} Email, {results['failed']} Failed")
        return results
    
    def _process_sms_notification(self, phone: str, message: str, notification_type: str = 'custom',
                                 student_name: str = None, username: str = None, password: str = None):
        """Process SMS notification in background"""
        try:
            logger.info(f"📱 Processing SMS for {phone} (Type: {notification_type})")
            
            if notification_type == 'student_credentials' and username and password:
                # Use student credentials SMS function
                result = self.resilient_services['sms'].send_sms_resilient(
                    phone=phone,
                    student_name=student_name or 'Student',
                    username=username,
                    password=password,
                    login_url="https://crt.pydahsoft.in/login"
                )
            else:
                # Use custom SMS function
                result = send_custom_sms(phone, message)
            
            if result.get('success', False):
                self.queue_stats['total_processed'] += 1
                self.queue_stats['sms_processed'] += 1
                logger.info(f"✅ SMS sent successfully to {phone}")
            else:
                self.queue_stats['total_failed'] += 1
                self.queue_stats['sms_failed'] += 1
                logger.error(f"❌ SMS failed for {phone}: {result.get('error', 'Unknown error')}")
                
        except Exception as e:
            self.queue_stats['total_failed'] += 1
            self.queue_stats['sms_failed'] += 1
            logger.error(f"❌ SMS processing error for {phone}: {e}")
    
    def _process_email_notification(self, email: str, subject: str, content: str,
                                   template_name: str = None, template_params: Dict = None):
        """Process email notification in background"""
        try:
            logger.info(f"📧 Processing email for {email}")
            
            # Generate content from template if provided
            if template_name and template_params:
                try:
                    content = render_template(template_name, template_params)
                except Exception as e:
                    logger.warning(f"⚠️ Template rendering failed, using provided content: {e}")
            
            # Send email using resilient service
            result = self.resilient_services['email'].send_email_resilient(
                to_email=email,
                to_name=template_params.get('name', 'Student') if template_params else 'Student',
                subject=subject,
                html_content=content
            )
            
            if result:
                self.queue_stats['total_processed'] += 1
                self.queue_stats['email_processed'] += 1
                logger.info(f"✅ Email sent successfully to {email}")
            else:
                self.queue_stats['total_failed'] += 1
                self.queue_stats['email_failed'] += 1
                logger.error(f"❌ Email failed for {email}")
                
        except Exception as e:
            self.queue_stats['total_failed'] += 1
            self.queue_stats['email_failed'] += 1
            logger.error(f"❌ Email processing error for {email}: {e}")
    
    def get_queue_stats(self) -> Dict:
        """Get current queue statistics"""
        return {
            'queue_stats': self.queue_stats.copy(),
            'timestamp': time.time(),
            'status': 'active'
        }
    
    def reset_stats(self):
        """Reset queue statistics"""
        self.queue_stats = {
            'total_queued': 0,
            'total_processed': 0,
            'total_failed': 0,
            'sms_queued': 0,
            'email_queued': 0,
            'sms_processed': 0,
            'email_processed': 0,
            'sms_failed': 0,
            'email_failed': 0
        }
        logger.info("📊 Queue statistics reset")

# Global notification queue instance
notification_queue = NotificationQueue()

# Convenience functions for easy import
def queue_sms(phone: str, message: str, notification_type: str = 'custom', **kwargs) -> str:
    """Queue SMS notification"""
    return notification_queue.queue_sms_notification(phone, message, notification_type, **kwargs)

def queue_email(email: str, subject: str, content: str, template_name: str = None, **kwargs) -> str:
    """Queue email notification"""
    return notification_queue.queue_email_notification(email, subject, content, template_name, **kwargs)

def queue_student_credentials(student_data: Dict) -> Dict:
    """Queue student credentials notifications"""
    return notification_queue.queue_student_credentials(student_data)

def queue_batch_notifications(students: List[Dict], notification_type: str = 'welcome') -> Dict:
    """Queue batch notifications"""
    return notification_queue.queue_batch_notifications(students, notification_type)

def get_notification_stats() -> Dict:
    """Get notification queue statistics"""
    return notification_queue.get_queue_stats()

def reset_notification_stats():
    """Reset notification queue statistics"""
    notification_queue.reset_stats()
