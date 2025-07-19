from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
import csv
import io
import os
import uuid
from datetime import datetime, timezone
import boto3
import threading
# Make audio processing packages optional
try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False
    print("Warning: pydub package not available. Audio processing will not work.")

try:
    from gtts import gTTS
    GTTS_AVAILABLE = True
except ImportError:
    GTTS_AVAILABLE = False
    print("Warning: gTTS package not available. Audio generation will not work.")

# Make speech_recognition optional
try:
    import speech_recognition as sr
    SPEECH_RECOGNITION_AVAILABLE = True
except ImportError:
    SPEECH_RECOGNITION_AVAILABLE = False
    print("Warning: speech_recognition package not available. Audio transcription will not work.")
from difflib import SequenceMatcher
import json
from mongo import mongo_db
from config.constants import ROLES, MODULES, LEVELS, TEST_TYPES, GRAMMAR_CATEGORIES, CRT_CATEGORIES, QUESTION_TYPES, TEST_CATEGORIES, MODULE_CATEGORIES
from config.aws_config import s3_client, S3_BUCKET_NAME
from utils.audio_generator import generate_audio_from_text, calculate_similarity_score, transcribe_audio
import functools
import string
import random
from dateutil import tz
from pymongo import DESCENDING
from collections import defaultdict
from utils.email_service import send_email, render_template
import requests
import pytz
from routes.access_control import require_permission
from models import Test

# OneCompiler API Configuration
ONECOMPILER_API_KEY = 'f744734571mshb636ee6aecb15e3p16c0e7jsnd142c0e341e6'
ONECOMPILER_API_HOST = 'onecompiler-apis.p.rapidapi.com'

test_management_bp = Blueprint('test_management', __name__)

# ==================== SHARED UTILITY FUNCTIONS ====================

def generate_unique_test_id(length=6):
    """Generates a unique 6-character alphanumeric ID for tests."""
    while True:
        test_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
        if mongo_db.tests.find_one({'test_id': test_id}) is None:
            return test_id

def require_superadmin(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        allowed_roles = [ROLES.get('SUPER_ADMIN', 'super_admin'), 'superadmin']
        if not user or user.get('role') not in allowed_roles:
            return jsonify({
                'success': False,
                'message': 'Access denied. Super admin privileges required.'
            }), 403
        return f(*args, **kwargs)
    return decorated_function

def is_mcq_module(module_id):
    """Check if the module requires MCQ questions"""
    module_name = MODULES.get(module_id, '')
    return module_name in ['Grammar', 'Vocabulary']

def convert_objectids(obj):
    """Convert ObjectIds to strings recursively"""
    if obj is None:
        return None
    elif isinstance(obj, dict):
        return {k: convert_objectids(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_objectids(i) for i in obj]
    elif isinstance(obj, ObjectId):
        return str(obj)
    else:
        return obj

def generate_audio_from_text(text, accent='en', speed=1.0):
    """Generate audio from text using gTTS with custom accent and speed"""
    if not GTTS_AVAILABLE or not PYDUB_AVAILABLE:
        current_app.logger.warning("Audio generation SKIPPED: gTTS or pydub package not available.")
        return None
    
    # Map the accent code from frontend to lang/tld for gTTS
    lang = 'en'
    tld = 'com' # Default to US accent
    if 'en-GB' in accent:
        tld = 'co.uk'
    elif 'en-AU' in accent:
        tld = 'com.au'
    elif 'en-US' in accent:
        tld = 'com'
    
    current_app.logger.info(f"Initiating audio generation for text: '{text[:30]}...' with lang: {lang}, tld: {tld}, speed: {speed}")
    
    try:
        # 1. Generate audio with gTTS
        temp_filename = f"temp_{uuid.uuid4()}.mp3"
        tts = gTTS(text=text, lang=lang, tld=tld, slow=(speed < 1.0))
        tts.save(temp_filename)
        current_app.logger.info(f"STEP 1 SUCCESS: gTTS saved to '{temp_filename}'")
        
        # 2. Load audio with pydub
        current_app.logger.info(f"STEP 2: Loading '{temp_filename}' with pydub...")
        audio = AudioSegment.from_mp3(temp_filename)
        current_app.logger.info("STEP 2 SUCCESS: pydub loaded the audio file.")

        # 3. Adjust speed if necessary and export
        if speed != 1.0:
            current_app.logger.info(f"STEP 3: Adjusting speed to {speed}x...")
            audio = audio.speedup(playback_speed=speed)
            current_app.logger.info("STEP 3 SUCCESS: Speed adjusted.")

        adjusted_filename = f"adjusted_{uuid.uuid4()}.mp3"
        audio.export(adjusted_filename, format="mp3")
        current_app.logger.info(f"STEP 4 SUCCESS: Exported final audio to '{adjusted_filename}'")
        
        # 4. Upload to S3
        s3_key = f"audio/practice_tests/{uuid.uuid4()}.mp3"
        current_app.logger.info(f"STEP 5: Uploading '{adjusted_filename}' to S3 as '{s3_key}'...")
        s3_client.upload_file(adjusted_filename, S3_BUCKET_NAME, s3_key)
        current_app.logger.info("STEP 5 SUCCESS: Uploaded to S3.")
        
        # 5. Clean up temporary files
        os.remove(temp_filename)
        os.remove(adjusted_filename)
        current_app.logger.info("STEP 6 SUCCESS: Cleaned up temporary files.")
        
        return s3_key
    except Exception as e:
        current_app.logger.error(f"AUDIO GENERATION FAILED: {str(e)}", exc_info=True)
        # Clean up any partial files
        if 'temp_filename' in locals() and os.path.exists(temp_filename):
            os.remove(temp_filename)
        if 'adjusted_filename' in locals() and os.path.exists(adjusted_filename):
            os.remove(adjusted_filename)
        return None

def audio_generation_worker(app, test_id, questions, audio_config):
    """Background worker for generating audio for test questions"""
    with app.app_context():
        try:
            current_app.logger.info(f"Starting audio generation for test {test_id}")
            
            for i, question in enumerate(questions):
                question_text = question.get('question', '')
                if not question_text:
                    continue
                
                # Generate audio
                accent = audio_config.get('accent', 'en-US')
                speed = audio_config.get('speed', 1.0)
                audio_url = generate_audio_from_text(question_text, accent, speed)
                
                if audio_url:
                    # Update the question with audio URL
                    mongo_db.tests.update_one(
                        {'_id': ObjectId(test_id)},
                        {'$set': {f'questions.{i}.audio_url': audio_url}}
                    )
                    current_app.logger.info(f"Generated audio for question {i+1}")
                else:
                    current_app.logger.error(f"Failed to generate audio for question {i+1}")
            
            current_app.logger.info(f"Completed audio generation for test {test_id}")
        except Exception as e:
            current_app.logger.error(f"Error in audio generation worker: {str(e)}")

# ==================== ROUTING ENDPOINTS ====================

@test_management_bp.route('/create-test', methods=['POST'])
@jwt_required()
@require_permission(module='test_management', action='manage_tests')
def create_test_with_instances():
    """Route to appropriate test creation endpoint based on module type"""
    try:
        data = request.get_json()
        module_id = data.get('module_id')
        
        # Route to appropriate test creation endpoint based on module type
        if module_id in ['GRAMMAR', 'VOCABULARY', 'READING']:
            # Redirect to MCQ test creation
            from routes.test_management_mcq import create_mcq_test
            return create_mcq_test()
        elif module_id in ['LISTENING', 'SPEAKING']:
            # Redirect to audio test creation
            from routes.test_management_audio import create_audio_test
            return create_audio_test()
        elif module_id == 'WRITING':
            # Redirect to writing test creation
            from routes.test_management_writing import create_writing_test
            return create_writing_test()
        elif module_id == 'CRT_TECHNICAL' or data.get('level_id') == 'TECHNICAL':
            # Redirect to technical test creation
            from routes.test_management_technical import create_technical_test
            return create_technical_test()
        else:
            return jsonify({'success': False, 'message': f'Unsupported module type: {module_id}'}), 400

    except Exception as e:
        current_app.logger.error(f"Error routing test creation: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@test_management_bp.route('/tests/<test_id>', methods=['GET'])
@jwt_required()
@require_superadmin
def get_single_test(test_id):
    """Route to appropriate test retrieval endpoint based on module type"""
    try:
        current_app.logger.info(f"Fetching full details for test_id: {test_id}")
        test = mongo_db.tests.find_one({'_id': ObjectId(test_id)})
        if not test:
            current_app.logger.warning(f"Test not found for id: {test_id}")
            return jsonify({'success': False, 'message': 'Test not found'}), 404

        module_id = test.get('module_id')
        
        # Route to appropriate test retrieval based on module type
        if module_id in ['GRAMMAR', 'VOCABULARY', 'READING']:
            # Redirect to MCQ test retrieval
            from routes.test_management_mcq import get_mcq_test
            return get_mcq_test(test_id)
        elif module_id in ['LISTENING', 'SPEAKING']:
            # Redirect to audio test retrieval
            from routes.test_management_audio import get_audio_test
            return get_audio_test(test_id)
        elif module_id == 'WRITING':
            # Redirect to writing test retrieval
            from routes.test_management_writing import get_writing_test
            return get_writing_test(test_id)
        elif module_id == 'CRT_TECHNICAL' or test.get('level_id') == 'TECHNICAL':
            # Redirect to technical test retrieval
            from routes.test_management_technical import get_technical_test
            return get_technical_test(test_id)
        else:
            # Fallback to original implementation for unknown modules
            current_app.logger.info(f"Test found. Processing {len(test.get('questions', []))} questions for presigned URLs.")
            # Generate presigned URLs for audio files
            for question in test.get('questions', []):
                if 'audio_url' in question and question['audio_url']:
                    try:
                        url = s3_client.generate_presigned_url(
                            'get_object',
                            Params={'Bucket': S3_BUCKET_NAME, 'Key': question['audio_url']},
                            ExpiresIn=3600  # URL expires in 1 hour
                        )
                        question['audio_presigned_url'] = url
                        current_app.logger.info(f"Generated presigned URL for question_id: {question.get('question_id')}")
                    except Exception as e:
                        current_app.logger.error(f"Error generating presigned URL for {question['audio_url']}: {e}")
                        question['audio_presigned_url'] = None
                else:
                    current_app.logger.warning(f"Question_id {question.get('question_id')} is missing 'audio_url' or it is empty.")
            test['_id'] = str(test['_id'])
            # Convert all ObjectIds in the test document to strings
            test = convert_objectids(test)
            current_app.logger.info(f"Successfully processed test {test_id}. Sending to frontend.")
            return jsonify({'success': True, 'data': test}), 200
            
    except Exception as e:
        import traceback
        current_app.logger.error(f"Error fetching test {test_id}: {e}\n{traceback.format_exc()}")
        return jsonify({'success': False, 'message': f'An error occurred while fetching the test: {e}'}), 500

# ==================== SHARED ENDPOINTS ====================

@test_management_bp.route('/get-test-data', methods=['GET'])
@jwt_required()
@require_superadmin
def get_test_data():
    """Get campuses, courses, and batches for dropdowns"""
    try:
        # Get campuses
        campuses = list(mongo_db.campuses.find({}, {'name': 1, '_id': 1}))
        
        # Get courses
        courses = list(mongo_db.courses.find({}, {'name': 1, '_id': 1}))
        
        # Get batches
        batches = list(mongo_db.batches.find({}, {'name': 1, '_id': 1}))
        
        # Use the imported constants directly
        try:
            grammar_categories = GRAMMAR_CATEGORIES
        except NameError:
            current_app.logger.warning("GRAMMAR_CATEGORIES not found, using default values")
            grammar_categories = {
                'NOUN': 'Noun',
                'PRONOUN': 'Pronoun',
                'ADJECTIVE': 'Adjective',
                'VERB': 'Verb',
                'ADVERB': 'Adverb',
                'CONJUNCTION': 'Conjunction'
            }
            
        try:
            crt_categories = CRT_CATEGORIES
        except NameError:
            current_app.logger.warning("CRT_CATEGORIES not found, using default values")
            crt_categories = {
                'CRT_APTITUDE': 'Aptitude',
                'CRT_REASONING': 'Reasoning', 
                'CRT_TECHNICAL': 'Technical'
            }
        
        # Get CRT topics with progress
        crt_topics = []
        try:
            topics = list(mongo_db.crt_topics.find({}).sort('created_at', -1))
            for topic in topics:
                topic_id = topic['_id']
                
                # Count total questions for this topic
                total_questions = mongo_db.question_bank.count_documents({
                    'topic_id': topic_id,
                    'module_id': {'$in': ['CRT_APTITUDE', 'CRT_REASONING', 'CRT_TECHNICAL']}
                })
                
                # Count questions used in tests
                used_questions = mongo_db.question_bank.count_documents({
                    'topic_id': topic_id,
                    'module_id': {'$in': ['CRT_APTITUDE', 'CRT_REASONING', 'CRT_TECHNICAL']},
                    'used_count': {'$gt': 0}
                })
                
                # Calculate completion percentage
                completion_percentage = (used_questions / total_questions * 100) if total_questions > 0 else 0
                
                topic['_id'] = str(topic['_id'])
                topic['total_questions'] = total_questions
                topic['used_questions'] = used_questions
                topic['completion_percentage'] = round(completion_percentage, 1)
                topic['created_at'] = topic['created_at'].isoformat() if topic['created_at'] else None
                
                crt_topics.append(topic)
        except Exception as e:
            current_app.logger.error(f"Error fetching CRT topics: {e}")
        
        # Convert ObjectIds to strings
        for campus in campuses:
            campus['_id'] = str(campus['_id'])
        for course in courses:
            course['_id'] = str(course['_id'])
        for batch in batches:
            batch['_id'] = str(batch['_id'])
        
        return jsonify({
            'success': True,
            'data': {
                'campuses': campuses,
                'courses': courses,
                'batches': batches,
                'modules': MODULES,
                'levels': LEVELS,
                'test_types': TEST_TYPES,
                'grammar_categories': grammar_categories,
                'crt_categories': crt_categories,
                'crt_topics': crt_topics
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching test data: {e}")
        return jsonify({'success': False, 'message': f'Failed to fetch test data: {e}'}), 500

@test_management_bp.route('/tests', methods=['GET'])
@jwt_required()
@require_superadmin
def get_all_tests():
    """Get all created tests with detailed information."""
    try:
        pipeline = [
            {
                '$lookup': {
                    'from': 'campuses',
                    'localField': 'campus_ids',
                    'foreignField': '_id',
                    'as': 'campus_info'
                }
            },
            {
                '$lookup': {
                    'from': 'batches',
                    'localField': 'batch_ids',
                    'foreignField': '_id',
                    'as': 'batch_info'
                }
            },
            {
                '$lookup': {
                    'from': 'courses',
                    'localField': 'course_ids',
                    'foreignField': '_id',
                    'as': 'course_info'
                }
            },
            {
                '$project': {
                    '_id': 1,
                    'name': 1,
                    'test_type': 1,
                    'status': 1,
                    'created_at': 1,
                    'question_count': {'$size': '$questions'},
                    'module_id': 1,
                    'level_id': 1,
                    'subcategory': 1,
                    'campus_names': '$campus_info.name',
                    'batches': '$batch_info.name',
                    'courses': '$course_info.name'
                }
            },
            {'$sort': {'created_at': -1}}
        ]

        tests = list(mongo_db.tests.aggregate(pipeline))

        tests_data = []
        for test in tests:
            test['_id'] = str(test['_id'])
            test['created_at'] = test['created_at'].isoformat() if test['created_at'] else None
            tests_data.append(test)

        return jsonify({'success': True, 'data': tests_data}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching all tests: {e}")
        return jsonify({'success': False, 'message': f'Failed to fetch tests: {e}'}), 500

@test_management_bp.route('/tests/<test_id>', methods=['DELETE'])
@jwt_required()
@require_superadmin
def delete_test(test_id):
    """Delete a test and its associated S3 audio files (if any)."""
    try:
        test_to_delete = mongo_db.tests.find_one({'_id': ObjectId(test_id)})
        if not test_to_delete:
            return jsonify({'success': False, 'message': 'Test not found'}), 404

        # Only delete S3 audio files when the test is actually deleted
        # This ensures audio files persist until test deletion
        module_id = test_to_delete.get('module_id')
        mcq_modules = ['GRAMMAR', 'VOCABULARY', 'READING']
        if module_id not in mcq_modules:
            questions = test_to_delete.get('questions', [])
            objects_to_delete = [{'Key': q['audio_url']} for q in questions if 'audio_url' in q and q['audio_url']]
            if objects_to_delete and s3_client:
                try:
                    s3_client.delete_objects(
                        Bucket=S3_BUCKET_NAME,
                        Delete={'Objects': objects_to_delete}
                    )
                    current_app.logger.info(f"Deleted {len(objects_to_delete)} audio files for test {test_id}")
                except Exception as e:
                    current_app.logger.error(f"Error deleting audio files for test {test_id}: {e}")
                    # Continue with test deletion even if audio deletion fails

        # Delete the test from the database
        mongo_db.tests.delete_one({'_id': ObjectId(test_id)})

        return jsonify({'success': True, 'message': 'Test deleted successfully'}), 200
    except Exception as e:
        current_app.logger.error(f"Error deleting test {test_id}: {e}")
        return jsonify({'success': False, 'message': 'An error occurred while deleting the test.'}), 500

@test_management_bp.route('/check-test-name', methods=['POST'])
@jwt_required()
@require_superadmin
def check_test_name():
    """Check if a test name already exists."""
    try:
        data = request.get_json()
        test_name = data.get('name')
        if not test_name:
            return jsonify({'success': False, 'message': 'Test name is required.'}), 400

        if mongo_db.tests.find_one({'name': test_name}):
            return jsonify({'exists': True}), 200
        else:
            return jsonify({'exists': False}), 200
    except Exception as e:
        current_app.logger.error(f"Error checking test name: {e}")
        return jsonify({'success': False, 'message': 'An error occurred while checking the test name.'}), 500

@test_management_bp.route('/notify-students/<test_id>', methods=['POST'])
@jwt_required()
@require_superadmin
def notify_students(test_id):
    """Notify all students assigned to a test by email with test details."""
    try:
        # Fetch test details
        test = mongo_db.tests.find_one({'_id': ObjectId(test_id)})
        if not test:
            return jsonify({'success': False, 'message': 'Test not found.'}), 404

        # Fetch all assigned students
        from routes.student import get_students_for_test_ids
        if test.get('assigned_student_ids'):
            student_list = get_students_for_test_ids([test_id], assigned_student_ids=test['assigned_student_ids'])
        else:
            student_list = get_students_for_test_ids([test_id])
        
        if not student_list:
            return jsonify({'success': False, 'message': 'No students found for this test.'}), 404

        # Send notifications
        results = []
        for student in student_list:
            try:
                # Send email notification
                email_sent = send_email(
                    to_email=student['email'],
                    subject=f"New Test Available: {test['name']}",
                    template='test_notification.html',
                    context={
                        'student_name': student['name'],
                        'test_name': test['name'],
                        'test_type': test.get('test_type', 'Practice'),
                        'module_id': test.get('module_id', 'Unknown'),
                        'level_id': test.get('level_id', 'Unknown'),
                        'start_date': test.get('startDateTime', 'Not specified'),
                        'end_date': test.get('endDateTime', 'Not specified'),
                        'duration': test.get('duration', 'Not specified')
                    }
                )
                
                results.append({
                    'student_id': student['_id'],
                    'student_name': student['name'],
                    'email': student['email'],
                    'email_sent': email_sent,
                    'status': 'success' if email_sent else 'failed'
                })
            except Exception as e:
                current_app.logger.error(f"Failed to notify student {student['_id']}: {e}")
                results.append({
                    'student_id': student['_id'],
                    'student_name': student['name'],
                    'email': student['email'],
                    'email_sent': False,
                    'status': 'failed',
                    'error': str(e)
                })

        return jsonify({
            'success': True,
            'message': f'Notification sent to {len(results)} students',
            'results': results
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error notifying students: {e}")
        return jsonify({'success': False, 'message': f'Failed to send notification: {e}'}), 500

# ==================== QUESTION BANK ENDPOINTS ====================

@test_management_bp.route('/module-question-bank/upload', methods=['POST'])
@jwt_required()
@require_superadmin
def upload_module_questions():
    try:
        data = request.get_json()
        module_id = data.get('module_id')
        level_id = data.get('level_id')
        questions = data.get('questions')
        topic_id = data.get('topic_id')  # Optional topic_id for CRT modules
        
        if not module_id or not questions:
            return jsonify({'success': False, 'message': 'module_id and questions are required.'}), 400
        
        # For non-CRT modules, level_id is required
        if not module_id.startswith('CRT_') and not level_id:
            return jsonify({'success': False, 'message': 'level_id is required for non-CRT modules.'}), 400
        
        # Generate upload session ID
        upload_session_id = str(uuid.uuid4())
        
        # Store each question in a question_bank collection
        inserted = []
        for q in questions:
            doc = {
                'module_id': module_id,
                'level_id': level_id,
                'question': q.get('question'),
                'optionA': q.get('options', [])[0] if q.get('options') else q.get('optionA', ''),
                'optionB': q.get('options', [])[1] if q.get('options') and len(q.get('options')) > 1 else q.get('optionB', ''),
                'optionC': q.get('options', [])[2] if q.get('options') and len(q.get('options')) > 2 else q.get('optionC', ''),
                'optionD': q.get('options', [])[3] if q.get('options') and len(q.get('options')) > 3 else q.get('optionD', ''),
                'answer': q.get('answer', ''),
                'instructions': q.get('instructions', ''),
                'used_in_tests': [], # Track test_ids where used
                'used_count': 0,
                'last_used': None,
                'created_at': datetime.utcnow(),
                'upload_session_id': upload_session_id
            }
            
            # Add topic_id if provided (for CRT modules)
            if topic_id:
                doc['topic_id'] = ObjectId(topic_id)
            
            # Handle different question types based on module
            if module_id == 'CRT_TECHNICAL' or level_id == 'CRT_TECHNICAL':
                doc['testCases'] = q.get('testCases', '')
                doc['expectedOutput'] = q.get('expectedOutput', '')
                doc['language'] = q.get('language', 'python')
                doc['question_type'] = 'technical'
            elif module_id in ['LISTENING', 'SPEAKING']:
                # For listening and speaking, handle sentence-type questions
                doc['question_type'] = 'sentence'
                # Add sentence-specific fields
                doc['sentence'] = q.get('question') or q.get('sentence', '')
                doc['audio_url'] = q.get('audio_url')
                doc['audio_config'] = q.get('audio_config')
                doc['transcript_validation'] = q.get('transcript_validation')
                doc['has_audio'] = q.get('has_audio', False)
                # For speaking module
                if module_id == 'SPEAKING':
                    doc['question_type'] = 'speaking'
            else:
                doc['question_type'] = 'mcq'
            
            # Support sublevel/subcategory for grammar
            if 'subcategory' in q:
                doc['subcategory'] = q['subcategory']
                
            mongo_db.question_bank.insert_one(doc)
            inserted.append(doc['question'])
        
        return jsonify({'success': True, 'message': f'Uploaded {len(inserted)} questions to module bank.'}), 201
    except Exception as e:
        current_app.logger.error(f"Error uploading module questions: {e}")
        return jsonify({'success': False, 'message': f'Upload failed: {e}'}), 500

@test_management_bp.route('/existing-questions', methods=['GET'])
@jwt_required()
@require_superadmin
def get_existing_questions():
    """Get existing questions for duplicate checking"""
    try:
        module_id = request.args.get('module_id')
        level_id = request.args.get('level_id')
        topic_id = request.args.get('topic_id')  # New parameter for CRT topics
        
        if not module_id:
            return jsonify({'success': False, 'message': 'module_id is required'}), 400
        
        # Build query based on module type
        if module_id.startswith('CRT_'):
            # For CRT modules, we can filter by topic_id if provided
            query = {'module_id': module_id}
            if topic_id:
                query['topic_id'] = ObjectId(topic_id)
        else:
            # For other modules, require level_id
            if not level_id:
                return jsonify({'success': False, 'message': 'level_id is required for non-CRT modules'}), 400
            query = {'module_id': module_id, 'level_id': level_id}
        
        # Build projection based on module type
        if module_id in ['LISTENING', 'SPEAKING']:
            projection = {
                'sentence': 1,
                'question': 1,
                'audio_url': 1,
                'audio_config': 1,
                'transcript_validation': 1,
                'has_audio': 1,
                'question_type': 1,
                'used_count': 1
            }
        else:
            projection = {
                'question': 1,
                'optionA': 1,
                'optionB': 1,
                'optionC': 1,
                'optionD': 1,
                'answer': 1,
                'topic_id': 1,
                'used_count': 1
            }
        
        questions = list(mongo_db.question_bank.find(query, projection))
        
        # Convert ObjectIds to strings
        for q in questions:
            q['_id'] = str(q['_id'])
            if 'topic_id' in q and q['topic_id']:
                q['topic_id'] = str(q['topic_id'])
        
        return jsonify({'success': True, 'data': questions}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching existing questions: {e}")
        return jsonify({'success': False, 'message': f'Failed to fetch existing questions: {e}'}), 500

@test_management_bp.route('/question-bank/fetch-for-test', methods=['POST'])
@jwt_required()
@require_superadmin
def fetch_questions_for_test():
    data = request.get_json()
    module_id = data.get('module_id')
    level_id = data.get('level_id')
    subcategory = data.get('subcategory')  # For grammar
    n = int(data.get('count', 20))
    
    # Build query based on module type
    query = {'module_id': module_id}
    
    if module_id == 'GRAMMAR':
        # For Grammar, use level_id (which contains the grammar category like 'NOUN', 'VERB', etc.)
        query['level_id'] = level_id
        # Don't add subcategory to query as it's not used in the stored data
    elif module_id == 'CRT':
        # For CRT modules, level_id contains the category (e.g., CRT_APTITUDE, CRT_TECHNICAL)
        query['level_id'] = level_id
    else:
        # For other modules (VOCABULARY, READING, etc.)
        query['level_id'] = level_id
    
    current_app.logger.info(f"Fetching questions with query: {query}")
    
    # Build projection based on module type
    if module_id in ['LISTENING', 'SPEAKING']:
        projection = {
            'sentence': 1,
            'question': 1,
            'audio_url': 1,
            'audio_config': 1,
            'transcript_validation': 1,
            'has_audio': 1,
            'question_type': 1,
            'used_count': 1,
            'last_used': 1
        }
    else:
        projection = {
            'question': 1,
            'optionA': 1,
            'optionB': 1,
            'optionC': 1,
            'optionD': 1,
            'answer': 1,
            'used_count': 1,
            'last_used': 1
        }
    
    questions = list(mongo_db.question_bank.find(query, projection).sort([
        ('used_count', 1),
        ('last_used', 1)
    ]).limit(n))
    
    for q in questions:
        q['_id'] = str(q['_id'])
    
    current_app.logger.info(f"Found {len(questions)} questions for module {module_id}, level {level_id}")
    
    return jsonify({'success': True, 'questions': questions}), 200

# ==================== RANDOM QUESTION SELECTION FOR ONLINE TESTS ====================

@test_management_bp.route('/question-bank/random-selection', methods=['POST'])
@jwt_required()
@require_superadmin
def get_random_questions_for_online_test():
    """Get random questions from question bank for online test creation"""
    try:
        data = request.get_json()
        module_id = data.get('module_id')
        level_id = data.get('level_id')
        subcategory = data.get('subcategory')  # For grammar
        question_count = int(data.get('question_count', 20))
        student_count = int(data.get('student_count', 1))  # Number of students to generate questions for
        
        if not module_id or not level_id:
            return jsonify({'success': False, 'message': 'module_id and level_id are required'}), 400
        
        # Build query based on module type
        query = {'module_id': module_id}
        
        if module_id == 'GRAMMAR':
            query['level_id'] = level_id
        elif module_id == 'CRT':
            query['level_id'] = level_id
        else:
            query['level_id'] = level_id
        
        current_app.logger.info(f"Fetching random questions with query: {query}")
        
        # Get all available questions for this module/level
        all_questions = list(mongo_db.question_bank.find(query))
        
        if not all_questions:
            return jsonify({'success': False, 'message': 'No questions found for the specified criteria'}), 404
        
        # Calculate total questions needed (question_count per student)
        total_questions_needed = question_count * student_count
        
        if len(all_questions) < total_questions_needed:
            return jsonify({
                'success': False, 
                'message': f'Not enough questions available. Need {total_questions_needed}, but only {len(all_questions)} found.'
            }), 400
        
        # Shuffle all questions and select the required number
        import random
        random.shuffle(all_questions)
        selected_questions = all_questions[:total_questions_needed]
        
        # Group questions for each student
        student_question_sets = []
        for i in range(student_count):
            start_idx = i * question_count
            end_idx = start_idx + question_count
            student_questions = selected_questions[start_idx:end_idx]
            
            # Process questions for this student (shuffle options for MCQ)
            processed_questions = []
            for j, question in enumerate(student_questions):
                processed_question = {
                    'question_id': f'q_{j+1}',
                    'question': question.get('question', ''),
                    'question_type': question.get('question_type', 'mcq'),
                    'module_id': question.get('module_id'),
                    'level_id': question.get('level_id'),
                    'created_at': question.get('created_at'),
                    '_id': str(question['_id'])
                }
                
                # Handle MCQ questions with option shuffling
                if question.get('question_type') == 'mcq' or module_id in ['GRAMMAR', 'VOCABULARY', 'READING']:
                    options = {
                        'A': question.get('optionA', ''),
                        'B': question.get('optionB', ''),
                        'C': question.get('optionC', ''),
                        'D': question.get('optionD', '')
                    }
                    
                    # Remove empty options
                    options = {k: v for k, v in options.items() if v.strip()}
                    
                    # Shuffle options
                    option_items = list(options.items())
                    random.shuffle(option_items)
                    
                    # Create new options dict with shuffled order
                    shuffled_options = {}
                    answer_mapping = {}
                    
                    for idx, (old_key, value) in enumerate(option_items):
                        new_key = chr(ord('A') + idx)
                        shuffled_options[new_key] = value
                        answer_mapping[old_key] = new_key
                    
                    processed_question['options'] = shuffled_options
                    processed_question['correct_answer'] = answer_mapping.get(question.get('answer', 'A'), 'A')
                    processed_question['original_answer'] = question.get('answer', 'A')
                    
                # Handle audio questions (Listening/Speaking)
                elif module_id in ['LISTENING', 'SPEAKING']:
                    processed_question.update({
                        'sentence': question.get('sentence', ''),
                        'audio_url': question.get('audio_url'),
                        'audio_config': question.get('audio_config'),
                        'transcript_validation': question.get('transcript_validation'),
                        'has_audio': question.get('has_audio', False)
                    })
                
                # Handle writing questions
                elif module_id == 'WRITING':
                    processed_question.update({
                        'paragraph': question.get('paragraph', ''),
                        'instructions': question.get('instructions', ''),
                        'min_words': question.get('min_words', 50),
                        'max_words': question.get('max_words', 500),
                        'min_characters': question.get('min_characters', 200),
                        'max_characters': question.get('max_characters', 2000)
                    })
                
                processed_questions.append(processed_question)
            
            student_question_sets.append({
                'student_index': i,
                'questions': processed_questions
            })
        
        # Update usage statistics for selected questions
        question_ids = [q['_id'] for q in selected_questions]
        mongo_db.question_bank.update_many(
            {'_id': {'$in': question_ids}},
            {
                '$inc': {'used_count': 1},
                '$set': {'last_used': datetime.utcnow()}
            }
        )
        
        return jsonify({
            'success': True,
            'message': f'Generated {len(student_question_sets)} question sets for {student_count} students',
            'data': {
                'student_question_sets': student_question_sets,
                'total_questions_used': len(selected_questions),
                'questions_per_student': question_count
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in random question selection: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to generate random questions: {str(e)}'
        }), 500

@test_management_bp.route('/create-online-test-with-random-questions', methods=['POST'])
@jwt_required()
@require_superadmin
def create_online_test_with_random_questions():
    """Create an online test with random questions assigned to each student"""
    try:
        data = request.get_json()
        test_name = data.get('test_name')
        test_type = data.get('test_type', 'online')
        module_id = data.get('module_id')
        level_id = data.get('level_id')
        subcategory = data.get('subcategory')
        campus_id = data.get('campus_id')
        course_ids = data.get('course_ids', [])
        batch_ids = data.get('batch_ids', [])
        assigned_student_ids = data.get('assigned_student_ids', [])
        question_count = int(data.get('question_count', 20))
        startDateTime = data.get('startDateTime')
        endDateTime = data.get('endDateTime')
        duration = data.get('duration')
        
        # Validate required fields
        if not all([test_name, module_id, level_id, campus_id, course_ids, batch_ids, assigned_student_ids]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        if test_type.lower() != 'online':
            return jsonify({'success': False, 'message': 'This endpoint is for online tests only'}), 400
        
        if not all([startDateTime, endDateTime, duration]):
            return jsonify({'success': False, 'message': 'Start date, end date, and duration are required for online tests'}), 400
        
        # Get student count
        student_count = len(assigned_student_ids)
        if student_count == 0:
            return jsonify({'success': False, 'message': 'No students assigned to test'}), 400
        
        # Generate random questions for all students
        random_questions_payload = {
            'module_id': module_id,
            'level_id': level_id,
            'subcategory': subcategory,
            'question_count': question_count,
            'student_count': student_count
        }
        
        # Call the random question selection endpoint
        from flask import current_app
        with current_app.test_client() as client:
            response = client.post('/test-management/question-bank/random-selection', 
                                 json=random_questions_payload)
            
            if response.status_code != 200:
                return jsonify({'success': False, 'message': 'Failed to generate random questions'}), 500
            
            random_questions_data = response.get_json()
            student_question_sets = random_questions_data['data']['student_question_sets']
        
        # Generate unique test ID
        test_id = generate_unique_test_id()
        
        # Create base test document
        test_doc = {
            'test_id': test_id,
            'name': test_name,
            'test_type': test_type.lower(),
            'module_id': module_id,
            'level_id': level_id,
            'subcategory': subcategory,
            'campus_ids': [ObjectId(campus_id)],
            'course_ids': [ObjectId(cid) for cid in course_ids],
            'batch_ids': [ObjectId(bid) for bid in batch_ids],
            'assigned_student_ids': [ObjectId(sid) for sid in assigned_student_ids],
            'created_by': ObjectId(get_jwt_identity()),
            'created_at': datetime.utcnow(),
            'status': 'active',
            'is_active': True,
            'startDateTime': datetime.fromisoformat(startDateTime.replace('Z', '+00:00')),
            'endDateTime': datetime.fromisoformat(endDateTime.replace('Z', '+00:00')),
            'duration': int(duration),
            'question_count': question_count,
            'student_count': student_count,
            'has_random_questions': True  # Flag to indicate this test uses random questions
        }
        
        # Insert the base test
        test_result = mongo_db.tests.insert_one(test_doc)
        test_object_id = test_result.inserted_id
        
        # Create student-specific test assignments
        student_assignments = []
        for i, student_id in enumerate(assigned_student_ids):
            if i < len(student_question_sets):
                question_set = student_question_sets[i]
                
                assignment_doc = {
                    'test_id': test_object_id,
                    'student_id': ObjectId(student_id),
                    'questions': question_set['questions'],
                    'assigned_at': datetime.utcnow(),
                    'status': 'assigned',
                    'attempted': False,
                    'started_at': None,
                    'completed_at': None,
                    'score': 0,
                    'total_marks': question_count
                }
                
                student_assignments.append(assignment_doc)
        
        # Insert all student assignments
        if student_assignments:
            mongo_db.student_test_assignments.insert_many(student_assignments)
        
        return jsonify({
            'success': True,
            'message': f'Online test created successfully with random questions for {student_count} students',
            'data': {
                'test_id': str(test_object_id),
                'test_name': test_name,
                'student_count': student_count,
                'question_count': question_count,
                'assignments_created': len(student_assignments)
            }
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error creating online test with random questions: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to create online test: {str(e)}'
        }), 500

# ==================== STUDENT TEST SUBMISSION ENDPOINTS ====================

@test_management_bp.route('/submit-practice-test', methods=['POST'])
@jwt_required()
def submit_practice_test():
    """Submit practice test with student audio recordings or MCQ answers"""
    try:
        current_user_id = get_jwt_identity()
        data = request.form.to_dict()
        files = request.files
        
        # Validate required fields
        if not data.get('test_id'):
            return jsonify({
                'success': False,
                'message': 'Test ID is required'
            }), 400
        
        test_id = ObjectId(data['test_id'])
        test = mongo_db.tests.find_one({'_id': test_id})
        
        if not test:
            return jsonify({
                'success': False,
                'message': 'Test not found'
            }), 404
        
        # Check if student has access to this test
        student = mongo_db.students.find_one({'user_id': current_user_id})
        if not student:
            return jsonify({
                'success': False,
                'message': 'Student profile not found'
            }), 404
        
        # Validate access based on campus, course, batch
        has_access = False
        if test.get('campus_ids') and student.get('campus_id') in test['campus_ids']:
            has_access = True
        if test.get('course_ids') and student.get('course_id') in test['course_ids']:
            has_access = True
        if test.get('batch_ids') and student.get('batch_id') in test['batch_ids']:
            has_access = True
        
        if not has_access:
            return jsonify({
                'success': False,
                'message': 'Access denied to this test'
            }), 403
        
        # Process questions and calculate results
        results = []
        total_score = 0
        correct_answers = 0
        
        for i, question in enumerate(test['questions']):
            if question.get('question_type') == 'mcq':
                # Handle MCQ question
                answer_key = f'answer_{i}'
                if answer_key in data:
                    student_answer = data[answer_key]
                    correct_answer = question.get('correct_answer', '')
                    is_correct = student_answer == correct_answer
                    score = 1 if is_correct else 0
                    
                    if is_correct:
                        correct_answers += 1
                    total_score += score
                    
                    results.append({
                        'question_index': i,
                        'question': question['question'],
                        'question_type': 'mcq',
                        'student_answer': student_answer,
                        'correct_answer': correct_answer,
                        'is_correct': is_correct,
                        'score': score
                    })
            else:
                # Handle audio question (Listening or Speaking)
                audio_key = f'question_{i}'
                if audio_key not in files:
                    return jsonify({
                        'success': False,
                        'message': f'Audio recording for question {i+1} is required'
                    }), 400
                
                audio_file = files[audio_key]
                
                # Save student audio to S3
                student_audio_key = f"student_audio/{current_user_id}/{test_id}/{uuid.uuid4()}.wav"
                s3_client.upload_fileobj(audio_file, S3_BUCKET_NAME, student_audio_key)
                
                # Download for transcription
                temp_audio_path = f"temp_student_{uuid.uuid4()}.wav"
                s3_client.download_file(S3_BUCKET_NAME, student_audio_key, temp_audio_path)
                
                # Transcribe student audio
                student_text = transcribe_audio(temp_audio_path)
                os.remove(temp_audio_path)
                
                # Get the original text to compare against
                original_text = question.get('question') or question.get('sentence', '')
                
                # Calculate similarity score
                similarity_score = calculate_similarity_score(original_text, student_text)
                
                # Determine if answer is correct based on module type
                is_correct = False
                score = 0
                
                if test.get('module_id') == 'LISTENING':
                    # For listening, check if similarity is above threshold
                    threshold = question.get('transcript_validation', {}).get('tolerance', 0.8)
                    is_correct = similarity_score >= threshold
                    score = similarity_score
                elif test.get('module_id') == 'SPEAKING':
                    # For speaking, similar logic but with different threshold
                    threshold = question.get('transcript_validation', {}).get('tolerance', 0.7)
                    is_correct = similarity_score >= threshold
                    score = similarity_score
                
                if is_correct:
                    correct_answers += 1
                total_score += score
                
                results.append({
                    'question_index': i,
                    'question': question['question'],
                    'question_type': 'audio',
                    'student_audio_url': student_audio_key,
                    'student_text': student_text,
                    'original_text': original_text,
                    'similarity_score': similarity_score,
                    'is_correct': is_correct,
                    'score': score
                })
        
        # Calculate average score
        average_score = total_score / len(test['questions']) if test['questions'] else 0
        
        # Save test result
        result_doc = {
            'test_id': test_id,
            'student_id': current_user_id,
            'results': results,
            'total_score': total_score,
            'average_score': average_score,
            'correct_answers': correct_answers,
            'total_questions': len(test['questions']),
            'submitted_at': datetime.utcnow(),
            'test_type': 'practice'
        }
        
        mongo_db.student_test_attempts.insert_one(result_doc)
        
        return jsonify({
            'success': True,
            'message': 'Test submitted successfully',
            'data': {
                'total_score': total_score,
                'average_score': average_score,
                'correct_answers': correct_answers,
                'total_questions': len(test['questions'])
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error submitting practice test: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to submit test: {str(e)}'
        }), 500

# ==================== TECHNICAL TEST ENDPOINTS ====================

@test_management_bp.route('/run-code', methods=['POST'])
@jwt_required()
def run_code():
    """Run code using OneCompiler API"""
    try:
        data = request.get_json()
        code = data.get('code')
        language = data.get('language', 'python')
        test_cases = data.get('test_cases', [])
        
        if not code:
            return jsonify({'success': False, 'message': 'Code is required'}), 400
        
        # Prepare the request for OneCompiler API
        headers = {
            'X-RapidAPI-Key': ONECOMPILER_API_KEY,
            'X-RapidAPI-Host': ONECOMPILER_API_HOST,
            'Content-Type': 'application/json'
        }
        
        # Create the request body
        request_body = {
            'language': language,
            'stdin': '',
            'files': [{'name': f'main.{get_file_extension(language)}', 'content': code}]
        }
        
        # Add test cases if provided
        if test_cases:
            stdin_data = '\n'.join(test_cases)
            request_body['stdin'] = stdin_data
        
        # Make the API call
        response = requests.post(
            'https://onecompiler-apis.p.rapidapi.com/api/v1/run',
            headers=headers,
            json=request_body
        )
        
        if response.status_code == 200:
            result = response.json()
            return jsonify({
                'success': True,
                'data': result
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': f'Code execution failed: {response.text}'
            }), 500
            
    except Exception as e:
        current_app.logger.error(f"Error running code: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to run code: {str(e)}'
        }), 500

def get_file_extension(language):
    """Get file extension for programming language"""
    extensions = {
        'python': 'py',
        'javascript': 'js',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c'
    }
    return extensions.get(language.lower(), 'txt')

# ==================== TRANSCRIPT VALIDATION ENDPOINTS ====================

@test_management_bp.route('/validate-transcript', methods=['POST'])
@jwt_required()
def validate_transcript():
    """Validate student transcript against original text"""
    try:
        data = request.get_json()
        original_text = data.get('original_text')
        student_text = data.get('student_text')
        tolerance = data.get('tolerance', 0.8)
        
        if not original_text or not student_text:
            return jsonify({
                'success': False,
                'message': 'Original text and student text are required'
            }), 400
        
        # Calculate similarity score
        similarity_score = calculate_similarity_score(original_text, student_text)
        
        # Determine if transcript is valid
        is_valid = similarity_score >= tolerance
        
        return jsonify({
            'success': True,
            'data': {
                'similarity_score': similarity_score,
                'is_valid': is_valid,
                'tolerance': tolerance,
                'original_text': original_text,
                'student_text': student_text
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error validating transcript: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to validate transcript: {str(e)}'
        }), 500

@test_management_bp.route('/transcribe-audio', methods=['POST'])
@jwt_required()
def transcribe_audio():
    """Transcribe uploaded audio file"""
    try:
        if 'audio' not in request.files:
            return jsonify({
                'success': False,
                'message': 'Audio file is required'
            }), 400
        
        audio_file = request.files['audio']
        
        # Save audio file temporarily
        temp_path = f"temp_audio_{uuid.uuid4()}.wav"
        audio_file.save(temp_path)
        
        try:
            # Transcribe the audio
            transcribed_text = transcribe_audio(temp_path)
            
            return jsonify({
                'success': True,
                'data': {
                    'transcribed_text': transcribed_text
                }
            }), 200
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
        
    except Exception as e:
        current_app.logger.error(f"Error transcribing audio: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to transcribe audio: {str(e)}'
        }), 500

# ==================== CRT TOPICS ENDPOINTS ====================

@test_management_bp.route('/crt-topics', methods=['GET'])
@jwt_required()
@require_superadmin
def get_crt_topics():
    """Get all CRT topics with completion statistics"""
    try:
        topics = list(mongo_db.crt_topics.find({}).sort('created_at', -1))
        
        for topic in topics:
            topic_id = topic['_id']
            
            # Count total questions for this topic
            total_questions = mongo_db.question_bank.count_documents({
                'topic_id': topic_id,
                'module_id': {'$in': ['CRT_APTITUDE', 'CRT_REASONING', 'CRT_TECHNICAL']}
            })
            
            # Count questions used in tests
            used_questions = mongo_db.question_bank.count_documents({
                'topic_id': topic_id,
                'module_id': {'$in': ['CRT_APTITUDE', 'CRT_REASONING', 'CRT_TECHNICAL']},
                'used_count': {'$gt': 0}
            })
            
            # Calculate completion percentage
            completion_percentage = (used_questions / total_questions * 100) if total_questions > 0 else 0
            
            topic['_id'] = str(topic['_id'])
            topic['total_questions'] = total_questions
            topic['used_questions'] = used_questions
            topic['completion_percentage'] = round(completion_percentage, 1)
            topic['created_at'] = topic['created_at'].isoformat() if topic['created_at'] else None
        
        return jsonify({
            'success': True,
            'data': topics
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching CRT topics: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch CRT topics: {str(e)}'
        }), 500

@test_management_bp.route('/crt-topics', methods=['POST'])
@jwt_required()
@require_superadmin
def create_crt_topic():
    """Create a new CRT topic"""
    try:
        data = request.get_json()
        topic_name = data.get('topic_name')
        module_id = data.get('module_id')
        
        if not topic_name or not topic_name.strip():
            return jsonify({
                'success': False,
                'message': 'Topic name is required'
            }), 400
        
        if not module_id:
            return jsonify({
                'success': False,
                'message': 'Module ID is required'
            }), 400
        
        # Validate module_id is a valid CRT module
        valid_crt_modules = ['CRT_APTITUDE', 'CRT_REASONING', 'CRT_TECHNICAL']
        if module_id not in valid_crt_modules:
            return jsonify({
                'success': False,
                'message': f'Invalid module ID. Must be one of: {", ".join(valid_crt_modules)}'
            }), 400
        
        # Check if topic name already exists for this module
        existing_topic = mongo_db.crt_topics.find_one({
            'topic_name': topic_name.strip(),
            'module_id': module_id
        })
        
        if existing_topic:
            return jsonify({
                'success': False,
                'message': f'Topic "{topic_name}" already exists for this module'
            }), 400
        
        # Create new topic
        topic_doc = {
            'topic_name': topic_name.strip(),
            'module_id': module_id,
            'created_at': datetime.utcnow(),
            'created_by': get_jwt_identity()
        }
        
        result = mongo_db.crt_topics.insert_one(topic_doc)
        
        # Return the created topic with ID as string
        topic_doc['_id'] = str(result.inserted_id)
        topic_doc['created_at'] = topic_doc['created_at'].isoformat()
        topic_doc['total_questions'] = 0
        topic_doc['used_questions'] = 0
        topic_doc['completion_percentage'] = 0.0
        
        return jsonify({
            'success': True,
            'message': 'Topic created successfully',
            'data': topic_doc
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error creating CRT topic: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to create topic: {str(e)}'
        }), 500

@test_management_bp.route('/crt-topics/<topic_id>', methods=['GET'])
@jwt_required()
@require_superadmin
def get_crt_topic(topic_id):
    """Get a specific CRT topic by ID"""
    try:
        topic = mongo_db.crt_topics.find_one({'_id': ObjectId(topic_id)})
        
        if not topic:
            return jsonify({
                'success': False,
                'message': 'Topic not found'
            }), 404
        
        # Convert ObjectId to string
        topic['_id'] = str(topic['_id'])
        topic['created_at'] = topic['created_at'].isoformat() if topic['created_at'] else None
        
        return jsonify({
            'success': True,
            'data': topic
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching CRT topic: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch topic: {str(e)}'
        }), 500

@test_management_bp.route('/crt-topics/<topic_id>', methods=['PUT'])
@jwt_required()
@require_superadmin
def update_crt_topic(topic_id):
    """Update a CRT topic"""
    try:
        data = request.get_json()
        topic_name = data.get('topic_name')
        
        if not topic_name or not topic_name.strip():
            return jsonify({
                'success': False,
                'message': 'Topic name is required'
            }), 400
        
        # Check if topic exists
        existing_topic = mongo_db.crt_topics.find_one({'_id': ObjectId(topic_id)})
        if not existing_topic:
            return jsonify({
                'success': False,
                'message': 'Topic not found'
            }), 404
        
        # Check if new name already exists for the same module
        duplicate_topic = mongo_db.crt_topics.find_one({
            'topic_name': topic_name.strip(),
            'module_id': existing_topic['module_id'],
            '_id': {'$ne': ObjectId(topic_id)}
        })
        
        if duplicate_topic:
            return jsonify({
                'success': False,
                'message': f'Topic "{topic_name}" already exists for this module'
            }), 400
        
        # Update the topic
        result = mongo_db.crt_topics.update_one(
            {'_id': ObjectId(topic_id)},
            {
                '$set': {
                    'topic_name': topic_name.strip(),
                    'updated_at': datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            return jsonify({
                'success': False,
                'message': 'No changes made to topic'
            }), 400
        
        return jsonify({
            'success': True,
            'message': 'Topic updated successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error updating CRT topic: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to update topic: {str(e)}'
        }), 500

@test_management_bp.route('/crt-topics/<topic_id>', methods=['DELETE'])
@jwt_required()
@require_superadmin
def delete_crt_topic(topic_id):
    """Delete a CRT topic"""
    try:
        # Check if topic exists
        existing_topic = mongo_db.crt_topics.find_one({'_id': ObjectId(topic_id)})
        if not existing_topic:
            return jsonify({
                'success': False,
                'message': 'Topic not found'
            }), 404
        
        # Check if topic has questions
        question_count = mongo_db.question_bank.count_documents({
            'topic_id': ObjectId(topic_id)
        })
        
        if question_count > 0:
            return jsonify({
                'success': False,
                'message': f'Cannot delete topic. It has {question_count} questions associated with it. Please remove or reassign the questions first.'
            }), 400
        
        # Delete the topic
        result = mongo_db.crt_topics.delete_one({'_id': ObjectId(topic_id)})
        
        if result.deleted_count == 0:
            return jsonify({
                'success': False,
                'message': 'Failed to delete topic'
            }), 500
        
        return jsonify({
            'success': True,
            'message': 'Topic deleted successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error deleting CRT topic: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to delete topic: {str(e)}'
        }), 500

@test_management_bp.route('/crt-topics/<topic_id>/questions', methods=['POST'])
@jwt_required()
@require_superadmin
def add_questions_to_topic(topic_id):
    """Add questions to a specific CRT topic"""
    try:
        data = request.get_json()
        questions = data.get('questions', [])
        
        if not questions:
            return jsonify({
                'success': False,
                'message': 'Questions are required'
            }), 400
        
        # Check if topic exists
        topic = mongo_db.crt_topics.find_one({'_id': ObjectId(topic_id)})
        if not topic:
            return jsonify({
                'success': False,
                'message': 'Topic not found'
            }), 404
        
        # Process and insert questions
        processed_questions = []
        for question in questions:
            # Add topic_id to each question
            question['topic_id'] = ObjectId(topic_id)
            question['created_at'] = datetime.utcnow()
            question['used_count'] = 0
            
            # Ensure module_id matches the topic's module
            if 'module_id' not in question or question['module_id'] != topic['module_id']:
                question['module_id'] = topic['module_id']
            
            processed_questions.append(question)
        
        # Insert questions into question bank
        if processed_questions:
            result = mongo_db.question_bank.insert_many(processed_questions)
            
            return jsonify({
                'success': True,
                'message': f'Successfully added {len(result.inserted_ids)} questions to topic',
                'data': {
                    'inserted_count': len(result.inserted_ids),
                    'topic_id': topic_id,
                    'topic_name': topic['topic_name']
                }
            }), 201
        else:
            return jsonify({
                'success': False,
                'message': 'No valid questions to add'
            }), 400
        
    except Exception as e:
        current_app.logger.error(f"Error adding questions to topic: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to add questions to topic: {str(e)}'
        }), 500

# ==================== UPLOADED FILES ENDPOINTS ====================

@test_management_bp.route('/uploaded-files', methods=['GET'])
@jwt_required()
@require_superadmin
def get_uploaded_files():
    """Get all uploaded files with metadata"""
    try:
        # Get files from question_bank collection grouped by upload session
        pipeline = [
            {
                '$group': {
                    '_id': '$upload_session_id',
                    'module_id': {'$first': '$module_id'},
                    'level_id': {'$first': '$level_id'},
                    'topic_id': {'$first': '$topic_id'},
                    'question_count': {'$sum': 1},
                    'uploaded_at': {'$first': '$created_at'},
                    'file_name': {'$first': '$file_name'}
                }
            },
            {
                '$sort': {'uploaded_at': -1}
            }
        ]
        
        files = list(mongo_db.question_bank.aggregate(pipeline))
        
        # Convert ObjectIds to strings and format dates
        for file in files:
            file['_id'] = str(file['_id'])
            if file.get('topic_id'):
                file['topic_id'] = str(file['topic_id'])
            if file.get('uploaded_at'):
                file['uploaded_at'] = file['uploaded_at'].isoformat()
        
        return jsonify({
            'success': True,
            'data': files
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching uploaded files: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch uploaded files: {str(e)}'
        }), 500

@test_management_bp.route('/uploaded-files/<file_id>/questions', methods=['GET'])
@jwt_required()
@require_superadmin
def get_file_questions(file_id):
    """Get questions from a specific uploaded file"""
    try:
        # Find questions by upload session ID
        questions = list(mongo_db.question_bank.find({
            'upload_session_id': file_id
        }).sort('created_at', -1))
        
        # Convert ObjectIds to strings
        for question in questions:
            question['_id'] = str(question['_id'])
            if question.get('topic_id'):
                question['topic_id'] = str(question['topic_id'])
            if question.get('created_at'):
                question['created_at'] = question['created_at'].isoformat()
        
        return jsonify({
            'success': True,
            'data': questions
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching file questions: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch file questions: {str(e)}'
        }), 500

@test_management_bp.route('/uploaded-files/<file_id>/questions', methods=['POST'])
@jwt_required()
@require_superadmin
def add_question_to_file(file_id):
    """Add a single question to an uploaded file"""
    try:
        data = request.get_json()
        
        # Get the file metadata to ensure consistency
        file_metadata = mongo_db.question_bank.find_one({'upload_session_id': file_id})
        if not file_metadata:
            return jsonify({
                'success': False,
                'message': 'File not found'
            }), 404
        
        # Add the question with the same metadata
        question_data = {
            **data,
            'upload_session_id': file_id,
            'module_id': file_metadata.get('module_id'),
            'level_id': file_metadata.get('level_id'),
            'topic_id': file_metadata.get('topic_id'),
            'created_at': datetime.utcnow(),
            'used_count': 0
        }
        
        result = mongo_db.question_bank.insert_one(question_data)
        
        return jsonify({
            'success': True,
            'message': 'Question added successfully',
            'data': {
                'question_id': str(result.inserted_id)
            }
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error adding question to file: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to add question: {str(e)}'
        }), 500

# ==================== QUESTIONS MANAGEMENT ENDPOINTS ====================

@test_management_bp.route('/questions/add', methods=['POST'])
@jwt_required()
@require_superadmin
def add_question():
    """Add a single question to the question bank"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['question', 'module_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'{field} is required'
                }), 400
        
        # Add metadata
        question_data = {
            **data,
            'created_at': datetime.utcnow(),
            'used_count': 0
        }
        
        # Generate upload session ID if not provided
        if 'upload_session_id' not in question_data:
            question_data['upload_session_id'] = str(uuid.uuid4())
        
        result = mongo_db.question_bank.insert_one(question_data)
        
        return jsonify({
            'success': True,
            'message': 'Question added successfully',
            'data': {
                'question_id': str(result.inserted_id)
            }
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error adding question: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to add question: {str(e)}'
        }), 500

@test_management_bp.route('/questions/<question_id>', methods=['PUT'])
@jwt_required()
@require_superadmin
def update_question(question_id):
    """Update a question in the question bank"""
    try:
        data = request.get_json()
        
        # Check if question exists
        existing_question = mongo_db.question_bank.find_one({'_id': ObjectId(question_id)})
        if not existing_question:
            return jsonify({
                'success': False,
                'message': 'Question not found'
            }), 404
        
        # Update the question
        update_data = {
            **data,
            'updated_at': datetime.utcnow()
        }
        
        result = mongo_db.question_bank.update_one(
            {'_id': ObjectId(question_id)},
            {'$set': update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({
                'success': False,
                'message': 'No changes made to question'
            }), 400
        
        return jsonify({
            'success': True,
            'message': 'Question updated successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error updating question: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to update question: {str(e)}'
        }), 500

@test_management_bp.route('/questions/<question_id>', methods=['DELETE'])
@jwt_required()
@require_superadmin
def delete_question(question_id):
    """Delete a question from the question bank"""
    try:
        # Check if question exists
        existing_question = mongo_db.question_bank.find_one({'_id': ObjectId(question_id)})
        if not existing_question:
            return jsonify({
                'success': False,
                'message': 'Question not found'
            }), 404
        
        # Check if question is used in any tests
        if existing_question.get('used_count', 0) > 0:
            return jsonify({
                'success': False,
                'message': f'Cannot delete question. It has been used {existing_question["used_count"]} times in tests.'
            }), 400
        
        # Delete the question
        result = mongo_db.question_bank.delete_one({'_id': ObjectId(question_id)})
        
        if result.deleted_count == 0:
            return jsonify({
                'success': False,
                'message': 'Failed to delete question'
            }), 500
        
        return jsonify({
            'success': True,
            'message': 'Question deleted successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error deleting question: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to delete question: {str(e)}'
        }), 500