"""
Production monitoring and logging utilities for student progress management
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from bson import ObjectId
from flask import current_app

class ProgressMonitoring:
    """Monitor and log student progress system health and performance"""
    
    def __init__(self, mongo_db):
        self.mongo_db = mongo_db
        self.logger = logging.getLogger(__name__)
        
    def log_progress_event(self, event_type: str, student_id: ObjectId, 
                          level_id: str, details: Dict = None):
        """Log progress-related events for monitoring"""
        try:
            event_doc = {
                'event_type': event_type,  # 'unlock', 'authorize', 'test_complete', 'error'
                'student_id': student_id,
                'level_id': level_id,
                'timestamp': datetime.utcnow(),
                'details': details or {},
                'source': 'progress_system'
            }
            
            # Store in monitoring collection
            self.mongo_db.progress_events.insert_one(event_doc)
            
            # Also log to application logger
            self.logger.info(f"Progress Event: {event_type} for student {student_id}, level {level_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to log progress event: {e}")
    
    def get_system_health_metrics(self) -> Dict:
        """Get system health metrics for monitoring dashboard"""
        try:
            # Get recent events (last 24 hours)
            since = datetime.utcnow() - timedelta(hours=24)
            
            # Count events by type
            event_counts = {}
            for event_type in ['unlock', 'authorize', 'test_complete', 'error']:
                count = self.mongo_db.progress_events.count_documents({
                    'event_type': event_type,
                    'timestamp': {'$gte': since}
                })
                event_counts[event_type] = count
            
            # Get students with recent activity
            active_students = self.mongo_db.students.count_documents({
                'module_progress': {'$exists': True, '$ne': {}}
            })
            
            # Get total students
            total_students = self.mongo_db.students.count_documents({})
            
            # Get recent errors
            recent_errors = list(self.mongo_db.progress_events.find({
                'event_type': 'error',
                'timestamp': {'$gte': since}
            }).sort('timestamp', -1).limit(10))
            
            return {
                'timestamp': datetime.utcnow(),
                'event_counts_24h': event_counts,
                'active_students': active_students,
                'total_students': total_students,
                'recent_errors': recent_errors,
                'health_status': 'healthy' if len(recent_errors) < 5 else 'warning'
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get system health metrics: {e}")
            return {
                'timestamp': datetime.utcnow(),
                'error': str(e),
                'health_status': 'error'
            }
    
    def get_student_progress_analytics(self, days: int = 30) -> Dict:
        """Get analytics on student progress patterns"""
        try:
            since = datetime.utcnow() - timedelta(days=days)
            
            # Get progress events in time range
            events = list(self.mongo_db.progress_events.find({
                'timestamp': {'$gte': since}
            }))
            
            # Analyze unlock patterns
            unlock_events = [e for e in events if e['event_type'] == 'unlock']
            admin_authorizations = [e for e in events if e['event_type'] == 'authorize']
            
            # Get module distribution
            module_unlocks = {}
            for event in unlock_events:
                level_id = event.get('level_id', '')
                module = level_id.split('_')[0] if '_' in level_id else 'unknown'
                module_unlocks[module] = module_unlocks.get(module, 0) + 1
            
            # Get daily activity
            daily_activity = {}
            for event in events:
                date = event['timestamp'].date()
                daily_activity[date] = daily_activity.get(date, 0) + 1
            
            return {
                'period_days': days,
                'total_events': len(events),
                'unlock_events': len(unlock_events),
                'admin_authorizations': len(admin_authorizations),
                'module_unlocks': module_unlocks,
                'daily_activity': {str(k): v for k, v in daily_activity.items()},
                'auto_unlock_rate': len(unlock_events) / max(len(events), 1) * 100
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get progress analytics: {e}")
            return {'error': str(e)}
    
    def cleanup_old_events(self, days_to_keep: int = 90):
        """Clean up old monitoring events to prevent database bloat"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
            
            result = self.mongo_db.progress_events.delete_many({
                'timestamp': {'$lt': cutoff_date}
            })
            
            self.logger.info(f"Cleaned up {result.deleted_count} old progress events")
            return result.deleted_count
            
        except Exception as e:
            self.logger.error(f"Failed to cleanup old events: {e}")
            return 0
    
    def validate_student_progress_integrity(self) -> Dict:
        """Validate data integrity of student progress records"""
        try:
            issues = []
            
            # Check for students with inconsistent authorized_levels
            students_with_levels = list(self.mongo_db.students.find({
                'authorized_levels': {'$exists': True, '$ne': []}
            }))
            
            for student in students_with_levels:
                authorized_levels = student.get('authorized_levels', [])
                module_progress = student.get('module_progress', {})
                
                # Check for orphaned levels (in authorized_levels but not in module_progress)
                for level in authorized_levels:
                    if isinstance(level, dict):
                        level_id = level['level_id']
                    else:
                        level_id = level
                    
                    module = level_id.split('_')[0] if '_' in level_id else 'unknown'
                    
                    if module not in module_progress:
                        issues.append({
                            'type': 'orphaned_level',
                            'student_id': student['_id'],
                            'level_id': level_id,
                            'module': module
                        })
            
            # Check for students with module_progress but no authorized_levels
            students_with_progress = list(self.mongo_db.students.find({
                'module_progress': {'$exists': True, '$ne': {}},
                'authorized_levels': {'$exists': False}
            }))
            
            for student in students_with_progress:
                issues.append({
                    'type': 'missing_authorized_levels',
                    'student_id': student['_id'],
                    'modules': list(student.get('module_progress', {}).keys())
                })
            
            return {
                'timestamp': datetime.utcnow(),
                'total_issues': len(issues),
                'issues': issues,
                'status': 'healthy' if len(issues) == 0 else 'issues_found'
            }
            
        except Exception as e:
            self.logger.error(f"Failed to validate progress integrity: {e}")
            return {
                'timestamp': datetime.utcnow(),
                'error': str(e),
                'status': 'error'
            }

def setup_progress_logging():
    """Setup logging configuration for progress monitoring"""
    
    # Create a dedicated logger for progress monitoring
    progress_logger = logging.getLogger('progress_monitoring')
    progress_logger.setLevel(logging.INFO)
    
    # Create file handler for progress logs
    file_handler = logging.FileHandler('logs/progress_monitoring.log')
    file_handler.setLevel(logging.INFO)
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    file_handler.setFormatter(formatter)
    
    # Add handler to logger
    progress_logger.addHandler(file_handler)
    
    return progress_logger
