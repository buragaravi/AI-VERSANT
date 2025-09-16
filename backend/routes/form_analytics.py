from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime, timedelta
import logging
from collections import defaultdict

from config.database import DatabaseConfig
from routes.test_management import require_superadmin

form_analytics_bp = Blueprint('form_analytics', __name__)
mongo_db = DatabaseConfig.get_database()
logger = logging.getLogger(__name__)

@form_analytics_bp.route('/overview', methods=['GET'])
@jwt_required()
@require_superadmin
def get_analytics_overview():
    """Get overall form analytics"""
    try:
        # Get total forms
        total_forms = mongo_db['forms'].count_documents({})
        active_forms = mongo_db['forms'].count_documents({'settings.isActive': True})
        
        # Get total submissions
        total_submissions = mongo_db['form_submissions'].count_documents({})
        submitted_count = mongo_db['form_submissions'].count_documents({'status': 'submitted'})
        draft_count = mongo_db['form_submissions'].count_documents({'status': 'draft'})
        
        # Get unique students who submitted forms
        unique_students = len(mongo_db['form_submissions'].distinct('student_id', {'status': 'submitted'}))
        
        # Get submissions in last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_submissions = mongo_db['form_submissions'].count_documents({
            'submitted_at': {'$gte': thirty_days_ago},
            'status': 'submitted'
        })
        
        # Get most popular forms
        pipeline = [
            {'$match': {'status': 'submitted'}},
            {'$group': {'_id': '$form_id', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}},
            {'$limit': 5}
        ]
        
        popular_forms = list(mongo_db['form_submissions'].aggregate(pipeline))
        
        # Get form details for popular forms
        for form_stat in popular_forms:
            form = mongo_db['forms'].find_one({'_id': form_stat['_id']})
            if form:
                form_stat['title'] = form['title']
                form_stat['template_type'] = form.get('template_type', 'custom')
            else:
                form_stat['title'] = 'Unknown Form'
                form_stat['template_type'] = 'unknown'
        
        return jsonify({
            "success": True,
            "data": {
                "overview": {
                    "total_forms": total_forms,
                    "active_forms": active_forms,
                    "total_submissions": total_submissions,
                    "submitted_count": submitted_count,
                    "draft_count": draft_count,
                    "unique_students": unique_students,
                    "recent_submissions": recent_submissions
                },
                "popular_forms": popular_forms
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching analytics overview: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch analytics overview"
        }), 500

@form_analytics_bp.route('/forms/<form_id>/stats', methods=['GET'])
@jwt_required()
@require_superadmin
def get_form_stats(form_id):
    """Get detailed statistics for a specific form"""
    try:
        if not ObjectId.is_valid(form_id):
            return jsonify({
                "success": False,
                "message": "Invalid form ID"
            }), 400
        
        # Get form details
        form = mongo_db['forms'].find_one({'_id': ObjectId(form_id)})
        if not form:
            return jsonify({
                "success": False,
                "message": "Form not found"
            }), 404
        
        # Get submission statistics (form_id is stored as ObjectId)
        total_submissions = mongo_db['form_submissions'].count_documents({'form_id': ObjectId(form_id)})
        submitted_count = mongo_db['form_submissions'].count_documents({
            'form_id': ObjectId(form_id),
            'status': 'submitted'
        })
        draft_count = mongo_db['form_submissions'].count_documents({
            'form_id': ObjectId(form_id),
            'status': 'draft'
        })
        
        # Get unique students who submitted this form
        unique_students = len(mongo_db['form_submissions'].distinct('student_id', {
            'form_id': ObjectId(form_id),
            'status': 'submitted'
        }))
        
        # Get submission timeline (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        timeline_data = []
        
        for i in range(30):
            date = thirty_days_ago + timedelta(days=i)
            start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = start_of_day + timedelta(days=1)
            
            count = mongo_db['form_submissions'].count_documents({
                'form_id': ObjectId(form_id),
                'status': 'submitted',
                'submitted_at': {'$gte': start_of_day, '$lt': end_of_day}
            })
            
            timeline_data.append({
                'date': start_of_day.strftime('%Y-%m-%d'),
                'count': count
            })
        
        # Get field response statistics
        field_stats = []
        for field in form['fields']:
            field_id = field['field_id']
            field_type = field['type']
            
            # Get responses for this field
            pipeline = [
                {'$match': {'form_id': ObjectId(form_id), 'status': 'submitted'}},
                {'$unwind': '$responses'},
                {'$match': {'responses.field_id': field_id}},
                {'$group': {'_id': '$responses.value', 'count': {'$sum': 1}}},
                {'$sort': {'count': -1}}
            ]
            
            field_responses = list(mongo_db['form_submissions'].aggregate(pipeline))
            
            # Calculate statistics based on field type
            if field_type in ['dropdown', 'radio']:
                # For choice fields, show option distribution
                total_responses = sum(response['count'] for response in field_responses)
                option_distribution = []
                
                for option in field.get('options', []):
                    count = next((r['count'] for r in field_responses if r['_id'] == option), 0)
                    percentage = (count / total_responses * 100) if total_responses > 0 else 0
                    option_distribution.append({
                        'option': option,
                        'count': count,
                        'percentage': round(percentage, 2)
                    })
                
                field_stats.append({
                    'field_id': field_id,
                    'field_label': field['label'],
                    'field_type': field_type,
                    'total_responses': total_responses,
                    'option_distribution': option_distribution
                })
            
            elif field_type == 'checkbox':
                # For checkbox fields, show selected options
                total_responses = sum(response['count'] for response in field_responses)
                option_distribution = []
                
                for option in field.get('options', []):
                    count = sum(r['count'] for r in field_responses if option in r['_id'])
                    percentage = (count / total_responses * 100) if total_responses > 0 else 0
                    option_distribution.append({
                        'option': option,
                        'count': count,
                        'percentage': round(percentage, 2)
                    })
                
                field_stats.append({
                    'field_id': field_id,
                    'field_label': field['label'],
                    'field_type': field_type,
                    'total_responses': total_responses,
                    'option_distribution': option_distribution
                })
            
            else:
                # For text fields, show basic statistics
                total_responses = sum(response['count'] for response in field_responses)
                field_stats.append({
                    'field_id': field_id,
                    'field_label': field['label'],
                    'field_type': field_type,
                    'total_responses': total_responses
                })
        
        return jsonify({
            "success": True,
            "data": {
                "form_title": form['title'],
                "form_description": form['description'],
                "template_type": form.get('template_type', 'custom'),
                "statistics": {
                    "total_submissions": total_submissions,
                    "submitted_count": submitted_count,
                    "draft_count": draft_count,
                    "unique_students": unique_students,
                    "completion_rate": round((submitted_count / unique_students * 100), 2) if unique_students > 0 else 0
                },
                "timeline": timeline_data,
                "field_stats": field_stats
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching form stats: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch form statistics"
        }), 500

@form_analytics_bp.route('/students/<student_id>/submissions', methods=['GET'])
@jwt_required()
@require_superadmin
def get_student_submissions(student_id):
    """Get all form submissions by a specific student"""
    try:
        if not ObjectId.is_valid(student_id):
            return jsonify({
                "success": False,
                "message": "Invalid student ID"
            }), 400
        
        # Get student details
        student = mongo_db['students'].find_one({'_id': ObjectId(student_id)})
        if not student:
            return jsonify({
                "success": False,
                "message": "Student not found"
            }), 404
        
        # Get all submissions by this student
        submissions = list(mongo_db['form_submissions'].find({
            'student_id': ObjectId(student_id)
        }).sort('submitted_at', -1))
        
        # Add form details to each submission
        for submission in submissions:
            submission['_id'] = str(submission['_id'])
            submission['form_id'] = str(submission['form_id'])
            submission['student_id'] = str(submission['student_id'])
            
            # Get form details
            form = mongo_db['forms'].find_one({'_id': ObjectId(submission['form_id'])})
            if form:
                submission['form_title'] = form['title']
                submission['form_template_type'] = form.get('template_type', 'custom')
        
        # Get course, batch, and campus details
        course = mongo_db['courses'].find_one({'_id': student.get('course_id')})
        course_name = course.get('name', 'Unknown') if course else 'Unknown'
        
        batch = mongo_db['batches'].find_one({'_id': student.get('batch_id')})
        batch_name = batch.get('name', 'Unknown') if batch else 'Unknown'
        
        campus = mongo_db['campuses'].find_one({'_id': student.get('campus_id')})
        campus_name = campus.get('name', 'Unknown') if campus else 'Unknown'
        
        return jsonify({
            "success": True,
            "data": {
                "student": {
                    "name": student.get('name', 'Unknown'),
                    "email": student.get('email', 'Unknown'),
                    "phone": student.get('mobile_number', 'Unknown'),
                    "roll_number": student.get('roll_number', 'Unknown'),
                    "course": course_name,
                    "batch": batch_name,
                    "campus": campus_name
                },
                "submissions": submissions,
                "total_submissions": len(submissions)
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching student submissions: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch student submissions"
        }), 500

@form_analytics_bp.route('/completion-rates', methods=['GET'])
@jwt_required()
@require_superadmin
def get_completion_rates():
    """Get completion rates for all forms"""
    try:
        # Get all active forms
        forms = list(mongo_db['forms'].find({'settings.isActive': True}))
        
        completion_rates = []
        
        for form in forms:
            form_id = form['_id']
            form_title = form['title']
            
            # Get total submissions for this form (form_id is stored as ObjectId)
            total_submissions = mongo_db['form_submissions'].count_documents({
                'form_id': ObjectId(form_id),
                'status': 'submitted'
            })
            
            # Get unique students who submitted this form
            unique_students = len(mongo_db['form_submissions'].distinct('student_id', {
                'form_id': ObjectId(form_id),
                'status': 'submitted'
            }))
            
            # Get total number of students (approximate - using total student count)
            total_students = mongo_db['students'].count_documents({})
            
            # Calculate completion rate
            completion_rate = (unique_students / total_students * 100) if total_students > 0 else 0
            
            completion_rates.append({
                'form_id': str(form_id),
                'form_title': form_title,
                'template_type': form.get('template_type', 'custom'),
                'total_submissions': total_submissions,
                'unique_students': unique_students,
                'total_students': total_students,
                'completion_rate': round(completion_rate, 2)
            })
        
        # Sort by completion rate descending
        completion_rates.sort(key=lambda x: x['completion_rate'], reverse=True)
        
        return jsonify({
            "success": True,
            "data": {
                "completion_rates": completion_rates
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching completion rates: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch completion rates"
        }), 500

@form_analytics_bp.route('/export/analytics', methods=['GET'])
@jwt_required()
@require_superadmin
def export_analytics():
    """Export analytics data"""
    try:
        # Get date range from query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build date filter
        date_filter = {}
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date)
                date_filter['$gte'] = start_dt
            except ValueError:
                return jsonify({
                    "success": False,
                    "message": "Invalid start_date format. Use YYYY-MM-DD"
                }), 400
        
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date)
                date_filter['$lt'] = end_dt
            except ValueError:
                return jsonify({
                    "success": False,
                    "message": "Invalid end_date format. Use YYYY-MM-DD"
                }), 400
        
        # Get submissions in date range
        query = {'status': 'submitted'}
        if date_filter:
            query['submitted_at'] = date_filter
        
        submissions = list(mongo_db['form_submissions'].find(query).sort('submitted_at', -1))
        
        # Prepare export data
        export_data = []
        for submission in submissions:
            # Get form details
            form = mongo_db['forms'].find_one({'_id': submission['form_id']})
            form_title = form['title'] if form else 'Unknown Form'
            
            # Get student details
            student = mongo_db['students'].find_one({'_id': submission['student_id']})
            student_name = student.get('name', 'Unknown') if student else 'Unknown'
            student_email = student.get('email', 'Unknown') if student else 'Unknown'
            
            # Create row data
            row = {
                'Form Title': form_title,
                'Student Name': student_name,
                'Student Email': student_email,
                'Submission Date': submission['submitted_at'].strftime('%Y-%m-%d %H:%M:%S') if submission['submitted_at'] else 'N/A',
                'IP Address': submission.get('ip_address', 'N/A')
            }
            
            # Add form field responses
            for response in submission['responses']:
                field_id = response['field_id']
                value = response['value']
                
                # Find field label
                field_label = field_id
                if form:
                    for field in form['fields']:
                        if field['field_id'] == field_id:
                            field_label = field['label']
                            break
                
                # Format value
                if isinstance(value, list):
                    row[field_label] = ', '.join(str(v) for v in value)
                else:
                    row[field_label] = str(value) if value is not None else ''
            
            export_data.append(row)
        
        return jsonify({
            "success": True,
            "data": {
                "submissions": export_data,
                "total_submissions": len(export_data),
                "date_range": {
                    "start_date": start_date,
                    "end_date": end_date
                }
            }
        })
        
    except Exception as e:
        logger.error(f"Error exporting analytics: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to export analytics data"
        }), 500
