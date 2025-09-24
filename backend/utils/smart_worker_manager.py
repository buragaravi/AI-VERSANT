#!/usr/bin/env python3
"""
Smart Worker Manager for VERSANT Backend
Implements task-aware worker recycling to prevent background task interruption
"""

import signal
import threading
import time
import uuid
import logging
from collections import defaultdict
from typing import Dict, Set, Optional, Any
from datetime import datetime, timedelta

# Configure logging
logger = logging.getLogger(__name__)

class SmartWorkerManager:
    """
    Manages worker lifecycle with task-aware recycling
    Prevents worker recycling when background tasks are active
    """
    
    def __init__(self):
        self.active_tasks = defaultdict(set)  # task_type -> set of task_ids
        self.task_details = {}  # task_id -> task_info
        self.task_lock = threading.Lock()
        self.recycling_requested = False
        self.recycling_delay = 5  # seconds to wait between checks
        self.max_wait_time = 300  # maximum 5 minutes to wait for tasks
        self.start_time = time.time()
        
        # Statistics
        self.stats = {
            'total_tasks_started': 0,
            'total_tasks_completed': 0,
            'total_tasks_failed': 0,
            'recycling_requests': 0,
            'recycling_delays': 0,
            'last_recycling_delay': None
        }
        
        logger.info("🔧 SmartWorkerManager initialized")
    
    def register_task(self, task_id: str, task_type: str, description: str = "", 
                     estimated_duration: int = 60) -> str:
        """
        Register a background task
        
        Args:
            task_id: Unique identifier for the task
            task_type: Type of task (e.g., 'notification', 'batch_processing')
            description: Human-readable description
            estimated_duration: Estimated duration in seconds
            
        Returns:
            task_id: The registered task ID
        """
        with self.task_lock:
            self.active_tasks[task_type].add(task_id)
            self.task_details[task_id] = {
                'task_type': task_type,
                'description': description,
                'started_at': datetime.now(),
                'estimated_duration': estimated_duration,
                'status': 'running'
            }
            self.stats['total_tasks_started'] += 1
            
        logger.info(f"🚀 Registered task: {task_type} - {description} (ID: {task_id})")
        return task_id
    
    def unregister_task(self, task_id: str, task_type: str, status: str = 'completed'):
        """
        Unregister a completed task
        
        Args:
            task_id: Task identifier
            task_type: Type of task
            status: 'completed' or 'failed'
        """
        with self.task_lock:
            self.active_tasks[task_type].discard(task_id)
            if task_id in self.task_details:
                task_info = self.task_details[task_id]
                task_info['completed_at'] = datetime.now()
                task_info['status'] = status
                task_info['actual_duration'] = (
                    task_info['completed_at'] - task_info['started_at']
                ).total_seconds()
                
                # Update statistics
                if status == 'completed':
                    self.stats['total_tasks_completed'] += 1
                else:
                    self.stats['total_tasks_failed'] += 1
                
                # Keep task details for a while for debugging
                # Will be cleaned up by cleanup_old_tasks()
        
        logger.info(f"✅ Unregistered task: {task_type} - {status} (ID: {task_id})")
    
    def has_active_tasks(self) -> bool:
        """Check if any background tasks are currently running"""
        with self.task_lock:
            total_tasks = sum(len(tasks) for tasks in self.active_tasks.values())
            return total_tasks > 0
    
    def get_active_task_count(self) -> int:
        """Get total number of active tasks"""
        with self.task_lock:
            return sum(len(tasks) for tasks in self.active_tasks.values())
    
    def get_task_count_by_type(self) -> Dict[str, int]:
        """Get count of active tasks by type"""
        with self.task_lock:
            return {task_type: len(tasks) for task_type, tasks in self.active_tasks.items()}
    
    def get_task_details(self) -> Dict[str, Any]:
        """Get detailed information about active tasks"""
        with self.task_lock:
            active_details = {}
            for task_id, task_info in self.task_details.items():
                if task_info['status'] == 'running':
                    active_details[task_id] = {
                        'task_type': task_info['task_type'],
                        'description': task_info['description'],
                        'started_at': task_info['started_at'].isoformat(),
                        'duration': (datetime.now() - task_info['started_at']).total_seconds(),
                        'estimated_duration': task_info['estimated_duration']
                    }
            return active_details
    
    def request_recycling(self) -> bool:
        """
        Request worker recycling when safe
        
        Returns:
            bool: True if recycling can proceed immediately, False if delayed
        """
        self.stats['recycling_requests'] += 1
        
        if not self.has_active_tasks():
            logger.info("✅ No active tasks, recycling can proceed immediately")
            return True
        
        logger.warning("⚠️ Active background tasks detected, delaying worker recycling...")
        return self._wait_for_tasks_completion()
    
    def _wait_for_tasks_completion(self) -> bool:
        """
        Wait for all tasks to complete before recycling
        
        Returns:
            bool: True if all tasks completed, False if timeout
        """
        start_wait_time = time.time()
        
        while self.has_active_tasks():
            current_wait_time = time.time() - start_wait_time
            
            if current_wait_time > self.max_wait_time:
                logger.error(f"❌ Timeout waiting for tasks to complete after {self.max_wait_time}s")
                self._log_active_tasks()
                return False
            
            task_count = self.get_active_task_count()
            task_types = self.get_task_count_by_type()
            
            logger.warning(f"⏳ Waiting for {task_count} active tasks to complete... "
                          f"({task_types}) - {current_wait_time:.1f}s elapsed")
            
            self.stats['recycling_delays'] += 1
            self.stats['last_recycling_delay'] = datetime.now()
            
            time.sleep(self.recycling_delay)
        
        wait_duration = time.time() - start_wait_time
        logger.info(f"✅ All tasks completed after {wait_duration:.1f}s, safe to recycle worker")
        return True
    
    def _log_active_tasks(self):
        """Log details of active tasks for debugging"""
        active_tasks = self.get_task_details()
        if active_tasks:
            logger.error("🔍 Active tasks at timeout:")
            for task_id, details in active_tasks.items():
                logger.error(f"  - {task_id}: {details['task_type']} - {details['description']} "
                           f"(running for {details['duration']:.1f}s)")
    
    def cleanup_old_tasks(self, max_age_hours: int = 24):
        """Clean up old task details to prevent memory leaks"""
        cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
        
        with self.task_lock:
            old_tasks = [
                task_id for task_id, task_info in self.task_details.items()
                if task_info.get('completed_at', datetime.now()) < cutoff_time
            ]
            
            for task_id in old_tasks:
                del self.task_details[task_id]
            
            if old_tasks:
                logger.info(f"🧹 Cleaned up {len(old_tasks)} old task records")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get worker manager statistics"""
        uptime = time.time() - self.start_time
        
        return {
            'uptime_seconds': uptime,
            'uptime_human': str(timedelta(seconds=int(uptime))),
            'active_tasks': self.get_active_task_count(),
            'active_tasks_by_type': self.get_task_count_by_type(),
            'stats': self.stats.copy(),
            'recycling_requested': self.recycling_requested
        }
    
    def force_recycling(self):
        """Force recycling (use with caution)"""
        logger.warning("🚨 Force recycling requested - this may interrupt active tasks!")
        self.recycling_requested = True
        return True

# Global instance
smart_worker_manager = SmartWorkerManager()

def register_background_task(task_type: str, description: str = "", 
                           estimated_duration: int = 60) -> str:
    """
    Convenience function to register a background task
    
    Args:
        task_type: Type of task
        description: Human-readable description
        estimated_duration: Estimated duration in seconds
        
    Returns:
        task_id: The registered task ID
    """
    task_id = str(uuid.uuid4())
    return smart_worker_manager.register_task(task_id, task_type, description, estimated_duration)

def unregister_background_task(task_id: str, task_type: str, status: str = 'completed'):
    """
    Convenience function to unregister a background task
    
    Args:
        task_id: Task identifier
        task_type: Type of task
        status: 'completed' or 'failed'
    """
    smart_worker_manager.unregister_task(task_id, task_type, status)

def run_background_task_with_tracking(task_func, task_type: str, description: str = "",
                                    estimated_duration: int = 60, *args, **kwargs):
    """
    Run a background task with worker management tracking
    
    Args:
        task_func: Function to execute
        task_type: Type of task
        description: Human-readable description
        estimated_duration: Estimated duration in seconds
        *args, **kwargs: Arguments for the task function
        
    Returns:
        Result of the task function
    """
    task_id = register_background_task(task_type, description, estimated_duration)
    
    try:
        logger.info(f"🚀 Starting background task: {task_type} - {description}")
        result = task_func(*args, **kwargs)
        logger.info(f"✅ Completed background task: {task_type} - {description}")
        return result
    except Exception as e:
        logger.error(f"❌ Failed background task: {task_type} - {description}: {e}")
        unregister_background_task(task_id, task_type, 'failed')
        raise
    finally:
        unregister_background_task(task_id, task_type, 'completed')

# Signal handlers for graceful shutdown
def setup_signal_handlers():
    """Setup signal handlers for graceful worker shutdown"""
    
    def signal_handler(signum, frame):
        signal_name = signal.Signals(signum).name
        logger.info(f"📡 Received {signal_name} signal")
        
        if smart_worker_manager.has_active_tasks():
            logger.warning("⚠️ Active background tasks detected, requesting graceful shutdown...")
            success = smart_worker_manager.request_recycling()
            
            if success:
                logger.info("✅ Graceful shutdown completed, exiting...")
                import sys
                sys.exit(0)
            else:
                logger.error("❌ Graceful shutdown failed, forcing exit...")
                import sys
                sys.exit(1)
        else:
            logger.info("✅ No active tasks, proceeding with immediate shutdown")
            import sys
            sys.exit(0)
    
    # Register signal handlers
    signal.signal(signal.SIGTERM, signal_handler)  # Termination signal
    signal.signal(signal.SIGINT, signal_handler)   # Interrupt signal (Ctrl+C)
    
    logger.info("🔧 Signal handlers registered for graceful shutdown")

# Auto-cleanup thread
def start_cleanup_thread():
    """Start background thread for periodic cleanup"""
    def cleanup_worker():
        while True:
            try:
                time.sleep(3600)  # Run every hour
                smart_worker_manager.cleanup_old_tasks()
            except Exception as e:
                logger.error(f"❌ Error in cleanup thread: {e}")
    
    cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
    cleanup_thread.start()
    logger.info("🧹 Cleanup thread started")

# Initialize on import
setup_signal_handlers()
start_cleanup_thread()
