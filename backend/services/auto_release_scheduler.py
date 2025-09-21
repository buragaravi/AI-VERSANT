import threading
import time
from datetime import datetime, timedelta
from bson import ObjectId
import traceback

class AutoReleaseScheduler:
    def __init__(self, mongo_db):
        self.mongo_db = mongo_db
        self.running = False
        self.thread = None
        self.check_interval = 60  # Check every minute
        
    def start(self):
        """Start the auto-release scheduler"""
        if self.running:
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.thread.start()
        print("Auto-release scheduler started")
    
    def stop(self):
        """Stop the auto-release scheduler"""
        self.running = False
        if self.thread:
            self.thread.join()
        print("Auto-release scheduler stopped")
    
    def _run_scheduler(self):
        """Main scheduler loop"""
        while self.running:
            try:
                self._process_pending_jobs()
                time.sleep(self.check_interval)
            except Exception as e:
                print(f"Error in auto-release scheduler: {str(e)}")
                traceback.print_exc()
                time.sleep(self.check_interval)
    
    def _process_pending_jobs(self):
        """Process all pending auto-release jobs"""
        try:
            from models_results_release_settings import ResultsReleaseSettings
            service = ResultsReleaseSettings(self.mongo_db)
            
            pending_jobs = service.get_pending_jobs()
            
            for job in pending_jobs:
                try:
                    self._process_job(job, service)
                except Exception as e:
                    print(f"Error processing job {job['_id']}: {str(e)}")
                    service.mark_job_processed(str(job['_id']), False, str(e))
                    
        except Exception as e:
            print(f"Error getting pending jobs: {str(e)}")
    
    def _process_job(self, job, service):
        """Process a single auto-release job"""
        test_id = str(job['test_id'])
        test_type = job['test_type']
        
        print(f"Processing auto-release job for test {test_id}")
        
        # Check if test exists and is still online
        test_collection = self.mongo_db.tests
        test = test_collection.find_one({"_id": ObjectId(test_id)})
        
        if not test:
            print(f"Test {test_id} not found, marking job as failed")
            service.mark_job_processed(str(job['_id']), False, "Test not found")
            return
        
        if test.get('test_type') != 'online':
            print(f"Test {test_id} is not an online test, marking job as failed")
            service.mark_job_processed(str(job['_id']), False, "Test is not an online test")
            return
        
        # Check if results are already released
        if test.get('is_released', False):
            print(f"Test {test_id} results already released, marking job as completed")
            service.mark_job_processed(str(job['_id']), True, "Results already released")
            return
        
        # Release the results
        try:
            # Update the test document
            update_data = {
                "is_released": True,
                "released_at": datetime.utcnow(),
                "released_by": None,  # Auto-released
                "auto_released": True
            }
            
            result = test_collection.update_one(
                {"_id": ObjectId(test_id)},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                print(f"Successfully auto-released results for test {test_id}")
                
                # Log the release action
                service.log_release_action(
                    test_id=test_id,
                    action="auto_released",
                    auto_released=True,
                    job_id=str(job['_id'])
                )
                
                # Mark job as completed
                service.mark_job_processed(str(job['_id']), True)
                
            else:
                print(f"Failed to update test {test_id}, marking job as failed")
                service.mark_job_processed(str(job['_id']), False, "Failed to update test document")
                
        except Exception as e:
            print(f"Error releasing results for test {test_id}: {str(e)}")
            service.mark_job_processed(str(job['_id']), False, str(e))
    
    def create_schedule_for_test(self, test_id, test_type, created_at, end_date=None):
        """Create auto-release schedule for a new test"""
        try:
            from models_results_release_settings import ResultsReleaseSettings
            service = ResultsReleaseSettings(self.mongo_db)
            
            job_id = service.create_test_schedule(test_id, test_type, created_at, end_date)
            
            if job_id:
                print(f"Created auto-release schedule for test {test_id}: {job_id}")
            else:
                print(f"No auto-release schedule created for test {test_id} (disabled or no rules)")
                
            return job_id
            
        except Exception as e:
            print(f"Error creating schedule for test {test_id}: {str(e)}")
            return None
    
    def cancel_schedule_for_test(self, test_id):
        """Cancel auto-release schedule for a test"""
        try:
            from models_results_release_settings import ResultsReleaseSettings
            service = ResultsReleaseSettings(self.mongo_db)
            
            success = service.cancel_test_schedule(test_id)
            
            if success:
                print(f"Cancelled auto-release schedule for test {test_id}")
            else:
                print(f"No pending schedule found for test {test_id}")
                
            return success
            
        except Exception as e:
            print(f"Error cancelling schedule for test {test_id}: {str(e)}")
            return False

# Global scheduler instance
_scheduler_instance = None

def get_scheduler(mongo_db):
    """Get the global scheduler instance"""
    global _scheduler_instance
    if _scheduler_instance is None:
        _scheduler_instance = AutoReleaseScheduler(mongo_db)
    return _scheduler_instance

def start_scheduler(mongo_db):
    """Start the global scheduler"""
    scheduler = get_scheduler(mongo_db)
    scheduler.start()

def stop_scheduler():
    """Stop the global scheduler"""
    global _scheduler_instance
    if _scheduler_instance:
        _scheduler_instance.stop()
        _scheduler_instance = None
