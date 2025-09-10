#!/usr/bin/env python3
"""
Test Reminder Scheduler for Study Edge Apex
Handles automated scheduling of SMS reminders
"""

import os
import time
import logging
from datetime import datetime, timedelta

# Make APScheduler import optional
try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.interval import IntervalTrigger
    from apscheduler.triggers.date import DateTrigger
    APSCHEDULER_AVAILABLE = True
except ImportError:
    APSCHEDULER_AVAILABLE = False
    logger.warning("APScheduler not available - reminder scheduling will be disabled")

from utils.test_reminder_system import reminder_system

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TestReminderScheduler:
    def __init__(self):
        if APSCHEDULER_AVAILABLE:
            self.scheduler = BackgroundScheduler()
            self.scheduler.start()
            logger.info("✅ Test Reminder Scheduler started")
        else:
            self.scheduler = None
            logger.warning("⚠️ Test Reminder Scheduler disabled - APScheduler not available")
    
    def schedule_test_reminders(self, test_id: str, start_time: datetime, end_time: datetime):
        """Schedule reminders for a specific test"""
        if not APSCHEDULER_AVAILABLE or not self.scheduler:
            logger.warning("APScheduler not available - cannot schedule reminders")
            return False
            
        try:
            # Schedule reminders at 6h, 12h, 24h after start
            reminder_times = [
                start_time + timedelta(hours=6),
                start_time + timedelta(hours=12),
                start_time + timedelta(hours=24)
            ]
            
            # Add recurring reminders every 6h after 24h until test ends
            current_time = start_time + timedelta(hours=30)  # Start recurring from 30h
            while current_time < end_time:
                reminder_times.append(current_time)
                current_time += timedelta(hours=6)
            
            # Schedule each reminder
            for i, reminder_time in enumerate(reminder_times):
                if reminder_time > datetime.now():  # Only schedule future reminders
                    job_id = f"test_reminder_{test_id}_{i}"
                    
                    self.scheduler.add_job(
                        func=self._send_reminder_job,
                        trigger=DateTrigger(run_date=reminder_time),
                        args=[test_id],
                        id=job_id,
                        replace_existing=True
                    )
                    
                    logger.info(f"📅 Scheduled reminder {i+1} for test {test_id} at {reminder_time}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error scheduling reminders for test {test_id}: {e}")
            return False
    
    def _send_reminder_job(self, test_id: str):
        """Job function to send reminders"""
        try:
            logger.info(f"🔄 Executing reminder job for test {test_id}")
            result = reminder_system.send_test_reminders(test_id)
            
            if result.get('success'):
                logger.info(f"✅ Reminder sent successfully for test {test_id}")
            else:
                logger.error(f"❌ Failed to send reminder for test {test_id}: {result.get('error')}")
                
        except Exception as e:
            logger.error(f"Error in reminder job for test {test_id}: {e}")
    
    def schedule_immediate_reminders(self, test_id: str):
        """Schedule immediate reminders for a test that's already started"""
        if not APSCHEDULER_AVAILABLE or not self.scheduler:
            logger.warning("APScheduler not available - cannot schedule immediate reminders")
            return False
            
        try:
            # Get test details
            from mongo import mongo_db
            online_exam = mongo_db.online_exams.find_one({'test_id': test_id})
            
            if not online_exam:
                logger.error(f"Online exam not found for test {test_id}")
                return False
            
            start_time = online_exam.get('start_date', datetime.now())
            end_time = online_exam.get('end_date', datetime.now())
            
            if isinstance(start_time, str):
                start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            if isinstance(end_time, str):
                end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            
            now = datetime.now()
            
            # If test has started, schedule immediate reminders
            if now >= start_time and now < end_time:
                # Schedule next reminder in 6 hours
                next_reminder = now + timedelta(hours=6)
                if next_reminder < end_time:
                    job_id = f"immediate_reminder_{test_id}"
                    
                    self.scheduler.add_job(
                        func=self._send_reminder_job,
                        trigger=DateTrigger(run_date=next_reminder),
                        args=[test_id],
                        id=job_id,
                        replace_existing=True
                    )
                    
                    logger.info(f"📅 Scheduled immediate reminder for test {test_id} at {next_reminder}")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error scheduling immediate reminders for test {test_id}: {e}")
            return False
    
    def cancel_test_reminders(self, test_id: str):
        """Cancel all reminders for a specific test"""
        if not APSCHEDULER_AVAILABLE or not self.scheduler:
            logger.warning("APScheduler not available - cannot cancel reminders")
            return False
            
        try:
            # Get all jobs for this test
            jobs = self.scheduler.get_jobs()
            cancelled_count = 0
            
            for job in jobs:
                if job.id.startswith(f"test_reminder_{test_id}") or job.id.startswith(f"immediate_reminder_{test_id}"):
                    self.scheduler.remove_job(job.id)
                    cancelled_count += 1
                    logger.info(f"🗑️ Cancelled reminder job: {job.id}")
            
            logger.info(f"✅ Cancelled {cancelled_count} reminder jobs for test {test_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error cancelling reminders for test {test_id}: {e}")
            return False
    
    def start_periodic_reminder_check(self):
        """Start periodic check for active tests that need reminders"""
        if not APSCHEDULER_AVAILABLE or not self.scheduler:
            logger.warning("APScheduler not available - cannot start periodic reminder check")
            return False
            
        try:
            # Check every hour for tests that need reminders
            self.scheduler.add_job(
                func=self._periodic_reminder_check,
                trigger=IntervalTrigger(hours=1),
                id="periodic_reminder_check",
                replace_existing=True
            )
            
            logger.info("✅ Started periodic reminder check (every hour)")
            return True
            
        except Exception as e:
            logger.error(f"Error starting periodic reminder check: {e}")
            return False
    
    def _periodic_reminder_check(self):
        """Periodic check for tests that need reminders"""
        try:
            logger.info("🔄 Running periodic reminder check...")
            result = reminder_system.process_all_active_tests()
            
            if result.get('success'):
                processed = result.get('processed_tests', 0)
                logger.info(f"✅ Processed {processed} tests for reminders")
            else:
                logger.error(f"❌ Periodic reminder check failed: {result.get('error')}")
                
        except Exception as e:
            logger.error(f"Error in periodic reminder check: {e}")
    
    def get_scheduled_jobs(self) -> list:
        """Get all scheduled reminder jobs"""
        if not APSCHEDULER_AVAILABLE or not self.scheduler:
            logger.warning("APScheduler not available - cannot get scheduled jobs")
            return []
            
        try:
            jobs = self.scheduler.get_jobs()
            reminder_jobs = []
            
            for job in jobs:
                if 'reminder' in job.id:
                    reminder_jobs.append({
                        'id': job.id,
                        'next_run': job.next_run_time,
                        'args': job.args
                    })
            
            return reminder_jobs
            
        except Exception as e:
            logger.error(f"Error getting scheduled jobs: {e}")
            return []
    
    def shutdown(self):
        """Shutdown the scheduler"""
        if not APSCHEDULER_AVAILABLE or not self.scheduler:
            logger.warning("APScheduler not available - nothing to shutdown")
            return
            
        try:
            self.scheduler.shutdown()
            logger.info("✅ Test Reminder Scheduler shutdown")
        except Exception as e:
            logger.error(f"Error shutting down scheduler: {e}")

# Global scheduler instance
reminder_scheduler = TestReminderScheduler()

def schedule_test_reminders(test_id: str, start_time: datetime, end_time: datetime) -> bool:
    """Schedule reminders for a test"""
    return reminder_scheduler.schedule_test_reminders(test_id, start_time, end_time)

def schedule_immediate_reminders(test_id: str) -> bool:
    """Schedule immediate reminders for an active test"""
    return reminder_scheduler.schedule_immediate_reminders(test_id)

def cancel_test_reminders(test_id: str) -> bool:
    """Cancel reminders for a test"""
    return reminder_scheduler.cancel_test_reminders(test_id)

def start_reminder_system() -> bool:
    """Start the complete reminder system"""
    return reminder_scheduler.start_periodic_reminder_check()

def get_scheduled_reminders() -> list:
    """Get all scheduled reminders"""
    return reminder_scheduler.get_scheduled_jobs()

if __name__ == "__main__":
    # Start the reminder system
    start_reminder_system()
    
    try:
        # Keep the scheduler running
        while True:
            time.sleep(60)  # Check every minute
    except KeyboardInterrupt:
        logger.info("🛑 Shutting down reminder scheduler...")
        reminder_scheduler.shutdown()
