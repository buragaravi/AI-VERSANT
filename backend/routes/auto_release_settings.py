from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
from datetime import datetime, timedelta
import traceback
from mongo import mongo_db

auto_release_settings_bp = Blueprint('auto_release_settings', __name__)

def get_release_settings_service():
    """Get the release settings service instance"""
    from models_results_release_settings import ResultsReleaseSettings
    return ResultsReleaseSettings(mongo_db)

@auto_release_settings_bp.route('/settings', methods=['GET'])
def get_settings():
    """Get global release settings"""
    try:
        current_app.logger.info("Getting release settings service...")
        service = get_release_settings_service()
        current_app.logger.info("Service created, getting global settings...")
        settings = service.get_global_settings()
        current_app.logger.info(f"Settings retrieved: {settings}")
        
        # Convert ObjectId to string for JSON serialization
        if '_id' in settings:
            settings['_id'] = str(settings['_id'])
        
        return jsonify({
            "success": True,
            "settings": settings
        })
    except Exception as e:
        current_app.logger.error(f"Error getting release settings: {str(e)}")
        import traceback
        current_app.logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            "success": False,
            "error": f"Failed to get release settings: {str(e)}"
        }), 500

@auto_release_settings_bp.route('/settings', methods=['POST'])
def update_settings():
    """Update global release settings"""
    try:
        data = request.get_json()
        service = get_release_settings_service()
        
        # Validate the settings data
        required_fields = ['enabled', 'rules']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "success": False,
                    "error": f"Missing required field: {field}"
                }), 400
        
        # Validate rules
        rules = data.get('rules', {})
        if rules.get('days_after_creation') is not None and rules['days_after_creation'] < 0:
            return jsonify({
                "success": False,
                "error": "Days after creation must be non-negative"
            }), 400
        
        if rules.get('days_after_end_date') is not None and rules['days_after_end_date'] < 0:
            return jsonify({
                "success": False,
                "error": "Days after end date must be non-negative"
            }), 400
        
        if rules.get('specific_time'):
            specific_time = rules['specific_time']
            if not isinstance(specific_time, dict) or 'hour' not in specific_time or 'minute' not in specific_time:
                return jsonify({
                    "success": False,
                    "error": "Specific time must have hour and minute"
                }), 400
            
            if not (0 <= specific_time['hour'] <= 23) or not (0 <= specific_time['minute'] <= 59):
                return jsonify({
                    "success": False,
                    "error": "Invalid time format"
                }), 400
        
        # Update settings
        success = service.update_global_settings(data)
        
        if success:
            return jsonify({
                "success": True,
                "message": "Settings updated successfully"
            })
        else:
            return jsonify({
                "success": False,
                "error": "Failed to update settings"
            }), 500
            
    except Exception as e:
        current_app.logger.error(f"Error updating release settings: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to update settings"
        }), 500

@auto_release_settings_bp.route('/test-schedule/<test_id>', methods=['GET'])
def get_test_schedule(test_id):
    """Get auto-release schedule for a specific test"""
    try:
        service = get_release_settings_service()
        schedule = service.get_test_schedule(test_id)
        
        if not schedule:
            return jsonify({
                "success": True,
                "schedule": None
            })
        
        # Convert ObjectId to string
        schedule['_id'] = str(schedule['_id'])
        schedule['test_id'] = str(schedule['test_id'])
        
        return jsonify({
            "success": True,
            "schedule": schedule
        })
    except Exception as e:
        current_app.logger.error(f"Error getting test schedule: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to get test schedule"
        }), 500

@auto_release_settings_bp.route('/test-schedule/<test_id>', methods=['DELETE'])
def cancel_test_schedule(test_id):
    """Cancel auto-release schedule for a test"""
    try:
        service = get_release_settings_service()
        success = service.cancel_test_schedule(test_id)
        
        if success:
            return jsonify({
                "success": True,
                "message": "Schedule cancelled successfully"
            })
        else:
            return jsonify({
                "success": False,
                "error": "No pending schedule found for this test"
            }), 404
            
    except Exception as e:
        current_app.logger.error(f"Error cancelling test schedule: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to cancel schedule"
        }), 500

@auto_release_settings_bp.route('/history', methods=['GET'])
def get_release_history():
    """Get release history for audit trail"""
    try:
        test_id = request.args.get('test_id')
        limit = int(request.args.get('limit', 50))
        
        service = get_release_settings_service()
        history = service.get_release_history(test_id, limit)
        
        # Convert ObjectIds to strings
        for entry in history:
            entry['_id'] = str(entry['_id'])
            entry['test_id'] = str(entry['test_id'])
            if entry.get('admin_id'):
                entry['admin_id'] = str(entry['admin_id'])
            if entry.get('job_id'):
                entry['job_id'] = str(entry['job_id'])
        
        return jsonify({
            "success": True,
            "history": history
        })
    except Exception as e:
        current_app.logger.error(f"Error getting release history: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to get release history"
        }), 500

@auto_release_settings_bp.route('/test-schedule', methods=['POST'])
def create_test_schedule():
    """Manually create auto-release schedule for a test"""
    try:
        data = request.get_json()
        test_id = data.get('test_id')
        test_type = data.get('test_type')
        created_at_str = data.get('created_at')
        end_date_str = data.get('end_date')
        
        if not all([test_id, test_type, created_at_str]):
            return jsonify({
                "success": False,
                "error": "Missing required fields: test_id, test_type, created_at"
            }), 400
        
        # Parse dates
        created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
        end_date = None
        if end_date_str:
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
        
        service = get_release_settings_service()
        job_id = service.create_test_schedule(test_id, test_type, created_at, end_date)
        
        if job_id:
            return jsonify({
                "success": True,
                "job_id": job_id,
                "message": "Schedule created successfully"
            })
        else:
            return jsonify({
                "success": False,
                "error": "Auto-release is disabled or no valid rules configured"
            }), 400
            
    except Exception as e:
        current_app.logger.error(f"Error creating test schedule: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to create schedule"
        }), 500

@auto_release_settings_bp.route('/pending-jobs', methods=['GET'])
def get_pending_jobs():
    """Get all pending auto-release jobs (admin only)"""
    try:
        service = get_release_settings_service()
        jobs = service.get_pending_jobs()
        
        # Convert ObjectIds to strings
        for job in jobs:
            job['_id'] = str(job['_id'])
            job['test_id'] = str(job['test_id'])
        
        return jsonify({
            "success": True,
            "jobs": jobs
        })
    except Exception as e:
        current_app.logger.error(f"Error getting pending jobs: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to get pending jobs"
        }), 500
