"""
Enhanced Student Progress Management System
Handles score-based unlocking, admin overrides, and progress tracking
"""

from datetime import datetime
from bson import ObjectId
from config.constants import MODULES, LEVELS
import logging
from .progress_monitoring import ProgressMonitoring

class StudentProgressManager:
    def __init__(self, mongo_db):
        self.mongo_db = mongo_db
        self.logger = logging.getLogger(__name__)
        self.monitoring = ProgressMonitoring(mongo_db)
    
    def update_student_progress_on_test_completion(self, student_id, level_id, score, test_id=None):
        """
        Update student progress when they complete a test
        This is the main function called after test submission
        """
        try:
            student = self.mongo_db.students.find_one({'_id': ObjectId(student_id)})
            if not student:
                self.logger.error(f"Student not found: {student_id}")
                return False
            
            # Get current authorized levels
            current_authorized = self._get_current_authorized_levels(student)
            
            # Check if this score unlocks new levels
            new_unlocked_levels = self._check_dependencies_and_thresholds(level_id, score, current_authorized)
            
            # Update authorized_levels with score-based unlocks
            for new_level in new_unlocked_levels:
                if new_level not in current_authorized:
                    self._add_authorized_level(
                        student_id, 
                        new_level, 
                        'score', 
                        score_unlocked=score,
                        test_id=test_id
                    )
            
            # Update module progress
            self._update_module_progress(student_id, level_id, score)
            
            # Add to unlock history
            self._add_unlock_history(student_id, level_id, score, 'score', test_id)
            
            self.logger.info(f"Updated progress for student {student_id}: unlocked {len(new_unlocked_levels)} new levels")
            
            # Monitor the progress update
            for level_id in new_unlocked_levels:
                self.monitoring.log_progress_event(
                    event_type='unlock',
                    student_id=student_id,
                    level_id=level_id,
                    details={
                        'score': score,
                        'test_id': str(test_id) if test_id else None,
                        'unlock_type': 'score_based'
                    }
                )
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error updating student progress: {e}")
            
            # Monitor the error
            self.monitoring.log_progress_event(
                event_type='error',
                student_id=student_id,
                level_id=level_id,
                details={
                    'error_type': 'progress_update_failed',
                    'error_message': str(e),
                    'score': score
                }
            )
            
            return False
    
    def admin_authorize_module(self, student_id, module_id, admin_user_id, reason=None):
        """
        Admin authorizes entire module regardless of score
        """
        try:
            # Get all levels for this module
            module_levels = self._get_module_levels(module_id)
            if not module_levels:
                return False, "No levels found for this module"
            
            # Add to authorized_levels with admin flag
            for level_id in module_levels:
                self._add_authorized_level(
                    student_id,
                    level_id,
                    'admin',
                    authorized_by_user=admin_user_id,
                    reason=reason
                )
            
            # Update module progress with admin override
            self._update_module_progress_admin_override(student_id, module_id)
            
            # Add to unlock history
            for level_id in module_levels:
                self._add_unlock_history(student_id, level_id, None, 'admin', None, admin_user_id, reason)
            
            self.logger.info(f"Admin {admin_user_id} authorized module {module_id} for student {student_id}")
            
            # Monitor the admin authorization
            for level_id in module_levels:
                self.monitoring.log_progress_event(
                    event_type='authorize',
                    student_id=student_id,
                    level_id=level_id,
                    details={
                        'admin_user_id': str(admin_user_id),
                        'module_id': module_id,
                        'reason': reason,
                        'authorization_type': 'admin_override'
                    }
                )
            
            return True, f"Module {module_id} authorized successfully"
            
        except Exception as e:
            self.logger.error(f"Error in admin authorize module: {e}")
            return False, str(e)
    
    def admin_authorize_level(self, student_id, level_id, admin_user_id, reason=None):
        """
        Admin authorizes individual level regardless of score
        """
        try:
            # Add to authorized_levels with admin flag
            self._add_authorized_level(
                student_id,
                level_id,
                'admin',
                authorized_by_user=admin_user_id,
                reason=reason
            )
            
            # Update module progress
            module_id = self._get_level_module(level_id)
            if module_id:
                self._update_module_progress_admin_override(student_id, module_id)
            
            # Add to unlock history
            self._add_unlock_history(student_id, level_id, None, 'admin', None, admin_user_id, reason)
            
            self.logger.info(f"Admin {admin_user_id} authorized level {level_id} for student {student_id}")
            return True, f"Level {level_id} authorized successfully"
            
        except Exception as e:
            self.logger.error(f"Error in admin authorize level: {e}")
            return False, str(e)
    
    def admin_lock_module(self, student_id, module_id, admin_user_id, reason=None):
        """
        Admin locks entire module
        """
        try:
            # Get all levels for this module
            module_levels = self._get_module_levels(module_id)
            if not module_levels:
                return False, "No levels found for this module"
            
            # Remove from authorized_levels
            self.mongo_db.students.update_one(
                {'_id': ObjectId(student_id)},
                {'$pull': {'authorized_levels': {'level_id': {'$in': module_levels}}}}
            )
            
            # Update module progress
            self._update_module_progress_lock(student_id, module_id)
            
            # Add to lock history
            self._add_lock_history(student_id, module_id, admin_user_id, reason)
            
            self.logger.info(f"Admin {admin_user_id} locked module {module_id} for student {student_id}")
            return True, f"Module {module_id} locked successfully"
            
        except Exception as e:
            self.logger.error(f"Error in admin lock module: {e}")
            return False, str(e)
    
    def get_student_detailed_insights(self, student_id):
        """
        Get comprehensive student insights for admin dashboard
        """
        try:
            student = self.mongo_db.students.find_one({'_id': ObjectId(student_id)})
            if not student:
                return None
            
            # Get test attempts and scores
            attempts = list(self.mongo_db.student_test_attempts.find({
                'student_id': str(student_id),
                'test_type': 'practice'
            }))
            
            # Analyze progress
            insights = {
                'student_info': {
                    'name': student.get('name', 'Unknown'),
                    'roll_number': student.get('roll_number', 'Unknown'),
                    'email': student.get('email', 'Unknown'),
                    'student_id': str(student_id)
                },
                'module_analysis': {},
                'unlock_recommendations': [],
                'admin_actions_taken': [],
                'overall_stats': {
                    'total_attempts': len(attempts),
                    'average_score': 0,
                    'modules_accessed': 0,
                    'levels_unlocked': 0
                }
            }
            
            # Analyze each module
            total_score = 0
            score_count = 0
            
            for module_id in ['GRAMMAR', 'VOCABULARY', 'LISTENING', 'SPEAKING', 'READING', 'WRITING']:
                module_data = self._analyze_module_progress(student_id, module_id, attempts)
                insights['module_analysis'][module_id] = module_data
                
                if module_data['total_score'] > 0:
                    total_score += module_data['total_score']
                    score_count += 1
                    insights['overall_stats']['modules_accessed'] += 1
                
                insights['overall_stats']['levels_unlocked'] += module_data['levels_unlocked']
                
                # Generate recommendations
                if module_data['current_score'] >= 60 and not module_data['next_level_unlocked']:
                    insights['unlock_recommendations'].append({
                        'module': module_id,
                        'level': module_data['next_level'],
                        'action': 'auto_unlock',
                        'reason': f"Score {module_data['current_score']} meets threshold",
                        'priority': 'high'
                    })
                elif module_data['current_score'] < 60 and module_data['current_score'] > 30:
                    insights['unlock_recommendations'].append({
                        'module': module_id,
                        'level': module_data['next_level'],
                        'action': 'admin_override',
                        'reason': f"Score {module_data['current_score']} below threshold but shows potential",
                        'priority': 'medium'
                    })
            
            # Calculate overall average
            if score_count > 0:
                insights['overall_stats']['average_score'] = total_score / score_count
            
            # Get admin actions history
            insights['admin_actions_taken'] = self._get_admin_actions_history(student_id)
            
            return insights
            
        except Exception as e:
            self.logger.error(f"Error getting student insights: {e}")
            return None
    
    def _get_current_authorized_levels(self, student):
        """Get current authorized levels as a set"""
        authorized_levels = student.get('authorized_levels', [])
        if isinstance(authorized_levels, list) and len(authorized_levels) > 0:
            # Handle both old format (strings) and new format (objects)
            if isinstance(authorized_levels[0], str):
                return set(authorized_levels)
            else:
                return set([level['level_id'] for level in authorized_levels])
        return set()
    
    def _check_dependencies_and_thresholds(self, completed_level_id, score, current_authorized):
        """Check if completing this level unlocks new levels"""
        new_unlocked = []
        
        # Find levels that depend on this completed level
        for level_id, level_info in LEVELS.items():
            if isinstance(level_info, dict):
                depends_on = level_info.get('depends_on')
                if depends_on == completed_level_id:
                    # Check if already authorized
                    if level_id not in current_authorized:
                        # Check threshold
                        threshold = level_info.get('unlock_threshold', 60)
                        if score >= threshold:
                            new_unlocked.append(level_id)
        
        return new_unlocked
    
    def _add_authorized_level(self, student_id, level_id, authorized_by, score_unlocked=None, 
                            authorized_by_user=None, test_id=None, reason=None):
        """Add a level to authorized_levels with metadata"""
        
        # Ensure authorized_levels exists and is in new format
        student = self.mongo_db.students.find_one({'_id': ObjectId(student_id)})
        if not student.get('authorized_levels'):
            self.mongo_db.students.update_one(
                {'_id': ObjectId(student_id)},
                {'$set': {'authorized_levels': []}}
            )
        
        # Check if level already exists
        existing_levels = student.get('authorized_levels', [])
        level_exists = False
        
        for level in existing_levels:
            if isinstance(level, dict) and level.get('level_id') == level_id:
                level_exists = True
                break
            elif isinstance(level, str) and level == level_id:
                level_exists = True
                break
        
        if not level_exists:
            level_data = {
                'level_id': level_id,
                'authorized_by': authorized_by,
                'authorized_at': datetime.utcnow(),
                'is_admin_override': authorized_by == 'admin'
            }
            
            if score_unlocked is not None:
                level_data['score_unlocked'] = score_unlocked
            
            if authorized_by_user:
                level_data['authorized_by_user'] = authorized_by_user
            
            if test_id:
                level_data['test_id'] = test_id
            
            if reason:
                level_data['reason'] = reason
            
            self.mongo_db.students.update_one(
                {'_id': ObjectId(student_id)},
                {'$push': {'authorized_levels': level_data}}
            )
    
    def _update_module_progress(self, student_id, level_id, score):
        """Update module progress tracking"""
        module_id = self._get_level_module(level_id)
        if not module_id:
            return
        
        # Initialize module_progress if it doesn't exist
        student = self.mongo_db.students.find_one({'_id': ObjectId(student_id)})
        if not student.get('module_progress'):
            self.mongo_db.students.update_one(
                {'_id': ObjectId(student_id)},
                {'$set': {'module_progress': {}}}
            )
        
        # Update specific module progress
        update_data = {
            f'module_progress.{module_id}.last_attempt': datetime.utcnow(),
            f'module_progress.{module_id}.last_score': score
        }
        
        # Update highest score if this is higher
        current_highest = student.get('module_progress', {}).get(module_id, {}).get('highest_score', 0)
        if score > current_highest:
            update_data[f'module_progress.{module_id}.highest_score'] = score
        
        # Update total score
        current_total = student.get('module_progress', {}).get(module_id, {}).get('total_score', 0)
        update_data[f'module_progress.{module_id}.total_score'] = current_total + score
        
        # Update attempts count
        current_attempts = student.get('module_progress', {}).get(module_id, {}).get('attempts_count', 0)
        update_data[f'module_progress.{module_id}.attempts_count'] = current_attempts + 1
        
        self.mongo_db.students.update_one(
            {'_id': ObjectId(student_id)},
            {'$set': update_data}
        )
    
    def _update_module_progress_admin_override(self, student_id, module_id):
        """Update module progress when admin overrides"""
        update_data = {
            f'module_progress.{module_id}.unlock_status': 'admin_override',
            f'module_progress.{module_id}.admin_override_at': datetime.utcnow()
        }
        
        self.mongo_db.students.update_one(
            {'_id': ObjectId(student_id)},
            {'$set': update_data}
        )
    
    def _update_module_progress_lock(self, student_id, module_id):
        """Update module progress when admin locks"""
        update_data = {
            f'module_progress.{module_id}.unlock_status': 'locked',
            f'module_progress.{module_id}.locked_at': datetime.utcnow()
        }
        
        self.mongo_db.students.update_one(
            {'_id': ObjectId(student_id)},
            {'$set': update_data}
        )
    
    def _add_unlock_history(self, student_id, level_id, score, unlock_type, test_id=None, 
                          admin_user_id=None, reason=None):
        """Add entry to unlock history"""
        # Initialize unlock_history if it doesn't exist
        student = self.mongo_db.students.find_one({'_id': ObjectId(student_id)})
        if not student.get('unlock_history'):
            self.mongo_db.students.update_one(
                {'_id': ObjectId(student_id)},
                {'$set': {'unlock_history': []}}
            )
        
        history_entry = {
            'level_id': level_id,
            'unlocked_at': datetime.utcnow(),
            'unlocked_by': unlock_type,
            'score': score
        }
        
        if test_id:
            history_entry['test_id'] = test_id
        
        if admin_user_id:
            history_entry['unlocked_by_user'] = admin_user_id
        
        if reason:
            history_entry['reason'] = reason
        
        self.mongo_db.students.update_one(
            {'_id': ObjectId(student_id)},
            {'$push': {'unlock_history': history_entry}}
        )
    
    def _add_lock_history(self, student_id, module_id, admin_user_id, reason=None):
        """Add entry to lock history"""
        # Initialize lock_history if it doesn't exist
        student = self.mongo_db.students.find_one({'_id': ObjectId(student_id)})
        if not student.get('lock_history'):
            self.mongo_db.students.update_one(
                {'_id': ObjectId(student_id)},
                {'$set': {'lock_history': []}}
            )
        
        history_entry = {
            'module_id': module_id,
            'locked_at': datetime.utcnow(),
            'locked_by_user': admin_user_id
        }
        
        if reason:
            history_entry['reason'] = reason
        
        self.mongo_db.students.update_one(
            {'_id': ObjectId(student_id)},
            {'$push': {'lock_history': history_entry}}
        )
    
    def _get_module_levels(self, module_id):
        """Get all level IDs for a module"""
        return [level_id for level_id, level in LEVELS.items() 
                if isinstance(level, dict) and level.get('module_id') == module_id]
    
    def _get_level_module(self, level_id):
        """Get module ID for a level"""
        level_info = LEVELS.get(level_id, {})
        if isinstance(level_info, dict):
            return level_info.get('module_id')
        return None
    
    def _analyze_module_progress(self, student_id, module_id, attempts):
        """Analyze progress for a specific module"""
        student = self.mongo_db.students.find_one({'_id': ObjectId(student_id)})
        module_progress = student.get('module_progress', {}).get(module_id, {})
        authorized_levels = self._get_current_authorized_levels(student)
        
        # Get module levels
        module_levels = self._get_module_levels(module_id)
        
        # Calculate current score and progress
        current_score = module_progress.get('highest_score', 0)
        total_score = module_progress.get('total_score', 0)
        attempts_count = module_progress.get('attempts_count', 0)
        
        # Find current level (highest unlocked)
        current_level = None
        levels_unlocked = 0
        
        for level_id in module_levels:
            if level_id in authorized_levels:
                levels_unlocked += 1
                current_level = level_id
        
        # Find next level to unlock
        next_level = None
        if current_level:
            for level_id, level_info in LEVELS.items():
                if isinstance(level_info, dict) and level_info.get('depends_on') == current_level:
                    if level_id not in authorized_levels:
                        next_level = level_id
                        break
        
        # Check if next level is unlocked
        next_level_unlocked = next_level in authorized_levels if next_level else False
        
        return {
            'current_level': current_level,
            'next_level': next_level,
            'current_score': current_score,
            'total_score': total_score,
            'attempts_count': attempts_count,
            'levels_unlocked': levels_unlocked,
            'total_levels': len(module_levels),
            'next_level_unlocked': next_level_unlocked,
            'unlock_status': module_progress.get('unlock_status', 'score_based'),
            'last_attempt': module_progress.get('last_attempt'),
            'admin_override_available': current_score < 60 and current_score > 30
        }
    
    def _get_admin_actions_history(self, student_id):
        """Get history of admin actions for this student"""
        student = self.mongo_db.students.find_one({'_id': ObjectId(student_id)})
        
        actions = []
        
        # Get unlock history
        unlock_history = student.get('unlock_history', [])
        for entry in unlock_history:
            if entry.get('unlocked_by') == 'admin':
                actions.append({
                    'type': 'unlock',
                    'level_id': entry.get('level_id'),
                    'timestamp': entry.get('unlocked_at'),
                    'admin_user': entry.get('unlocked_by_user'),
                    'reason': entry.get('reason')
                })
        
        # Get lock history
        lock_history = student.get('lock_history', [])
        for entry in lock_history:
            actions.append({
                'type': 'lock',
                'module_id': entry.get('module_id'),
                'timestamp': entry.get('locked_at'),
                'admin_user': entry.get('locked_by_user'),
                'reason': entry.get('reason')
            })
        
        # Sort by timestamp
        actions.sort(key=lambda x: x.get('timestamp', datetime.min), reverse=True)
        
        return actions[:10]  # Return last 10 actions

