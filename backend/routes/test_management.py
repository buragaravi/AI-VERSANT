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
from config.constants import ROLES, MODULES, LEVELS, TEST_TYPES, GRAMMAR_CATEGORIES, QUESTION_TYPES
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

test_management_bp = Blueprint('test_management', __name__)

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

def parse_mcq_question(question_text):
    """Parse MCQ question in the format: question\nA) option1\nB) option2\nC) option3\nD) option4\nAnswer: C"""
    try:
        lines = question_text.strip().split('\n')
        if len(lines) < 6:  # At least question + 4 options + answer
            return None
        
        question = lines[0].strip()
        options = {}
        correct_answer = None
        
        for line in lines[1:]:
            line = line.strip()
            if line.startswith('Answer:'):
                correct_answer = line.split(':', 1)[1].strip()
                break
            elif line and ')' in line:
                option_letter = line[0]
                option_text = line.split(')', 1)[1].strip()
                options[option_letter] = option_text
        
        if not question or len(options) != 4 or not correct_answer:
            return None
            
        return {
            'question': question,
            'options': options,
            'correct_answer': correct_answer
        }
    except Exception as e:
        current_app.logger.error(f"Error parsing MCQ question: {str(e)}")
        return None

def validate_mcq_question(question_data):
    """Validate MCQ question structure"""
    if not question_data:
        return False, "Invalid question format"
    
    required_fields = ['question', 'options', 'correct_answer']
    for field in required_fields:
        if field not in question_data:
            return False, f"Missing required field: {field}"
    
    if not question_data['question'].strip():
        return False, "Question text is required"
    
    if len(question_data['options']) != 4:
        return False, "Exactly 4 options (A, B, C, D) are required"
    
    if question_data['correct_answer'] not in ['A', 'B', 'C', 'D']:
        return False, "Correct answer must be A, B, C, or D"
    
    return True, "Valid MCQ question"

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

def calculate_similarity_score(original_text, student_audio_text):
    """Calculate similarity score between original and student audio text"""
    try:
        # Convert to lowercase for better comparison
        original_lower = original_text.lower()
        student_lower = student_audio_text.lower()
        
        # Calculate similarity using SequenceMatcher
        similarity = SequenceMatcher(None, original_lower, student_lower).ratio()
        
        # Calculate word-level accuracy
        original_words = set(original_lower.split())
        student_words = set(student_lower.split())
        
        if not original_words:
            return 0.0
        
        word_accuracy = len(original_words.intersection(student_words)) / len(original_words)
        
        # Combine similarity and word accuracy
        final_score = (similarity * 0.7) + (word_accuracy * 0.3)
        
        return round(final_score * 100, 2)
    except Exception as e:
        current_app.logger.error(f"Error calculating similarity: {str(e)}")
        return 0.0

def transcribe_audio(audio_file_path):
    """Transcribe audio file to text using speech recognition"""
    try:
        if not SPEECH_RECOGNITION_AVAILABLE:
            current_app.logger.warning("Speech recognition not available")
            return ""
        
        recognizer = sr.Recognizer()
        with sr.AudioFile(audio_file_path) as source:
            audio = recognizer.record(source)
            text = recognizer.recognize_google(audio)
            return text
    except Exception as e:
        current_app.logger.error(f"Error transcribing audio: {str(e)}")
        return ""

def audio_generation_worker(app, test_id, questions, audio_config):
    with app.app_context():
        try:
            current_app.logger.info(f"Starting audio generation for test_id: {test_id}")
            updated_questions = []
            all_successful = True

            for q in questions:
                # Ensure question_id exists
                if 'question_id' not in q:
                    q['question_id'] = str(uuid.uuid4())

                audio_url = generate_audio_from_text(
                    q['question'],
                    accent=audio_config['accent'],
                    speed=float(audio_config['speed'])
                )
                if not audio_url:
                    current_app.logger.error(f"Failed to generate audio for question: {q['question']}")
                    q['audio_url'] = None
                    all_successful = False
                else:
                    q['audio_url'] = audio_url
                updated_questions.append(q)
            
            final_status = 'active' if all_successful else 'failed'
            
            # Update the test document
            mongo_db.tests.update_one(
                {'_id': test_id},
                {
                    '$set': {
                        'questions': updated_questions,
                        'status': final_status,
                        'processed_at': datetime.utcnow(),
                        'is_active': all_successful
                    }
                }
            )
            current_app.logger.info(f"Successfully finished audio generation for test_id: {test_id} with status: {final_status}")
        except Exception as e:
            current_app.logger.error(f"Audio generation worker failed for test {test_id}: {e}")
            mongo_db.tests.update_one(
                {'_id': test_id},
                {'$set': {'status': 'failed', 'is_active': False}}
            )

@test_management_bp.route('/create-test', methods=['POST'])
@jwt_required()
@require_superadmin
def create_test():
    """
    Creates a new test (practice or online), saves it to DB,
    and starts a background thread for audio generation.
    """
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()

        # Validate required fields
        required_fields = ['test_name', 'test_type', 'campus_id', 'course_ids', 'batch_ids', 'questions', 'audio_config']
        if not all(field in data for field in required_fields):
            return jsonify({'success': False, 'message': 'Missing required fields.'}), 400
        if not data['questions']:
            return jsonify({'success': False, 'message': 'At least one question is required.'}), 400
        if not data['batch_ids'] or not isinstance(data['batch_ids'], list) or len(data['batch_ids']) == 0:
            return jsonify({'success': False, 'message': 'At least one batch must be selected.'}), 400
        if not data['course_ids'] or not isinstance(data['course_ids'], list) or len(data['course_ids']) == 0:
            return jsonify({'success': False, 'message': 'At least one course must be selected.'}), 400
        if not data['campus_id']:
            return jsonify({'success': False, 'message': 'A campus must be selected.'}), 400

        # Check if this is an MCQ module
        is_mcq = is_mcq_module(data.get('module_id'))
        
        # Process questions based on module type
        questions_with_ids = []
        for q in data['questions']:
            question_id = str(uuid.uuid4())
            
            if is_mcq:
                # Parse MCQ question
                mcq_data = parse_mcq_question(q.get('question', ''))
                if not mcq_data:
                    return jsonify({
                        'success': False, 
                        'message': f'Invalid MCQ format for question: {q.get("question", "")[:50]}...'
                    }), 400
                
                # Validate MCQ question
                is_valid, error_msg = validate_mcq_question(mcq_data)
                if not is_valid:
                    return jsonify({
                        'success': False,
                        'message': f'MCQ validation error: {error_msg}'
                    }), 400
                
                questions_with_ids.append({
                    'question_id': question_id,
                    'question': mcq_data['question'],
                    'options': mcq_data['options'],
                    'correct_answer': mcq_data['correct_answer'],
                    'question_type': 'mcq',
                    'instructions': q.get('instructions', ''),
                    'audio_url': None  # No audio for MCQ questions
                })
            else:
                # Regular audio question
                questions_with_ids.append({
                    'question_id': question_id,
                    'question': q.get('question', ''),
                    'instructions': q.get('instructions', ''),
                    'question_type': 'audio',
                    'audio_url': None  # Will be generated by worker
                })

        # Use batch_ids from the payload if provided, otherwise fallback to all batches for the selected courses
        batch_ids = [ObjectId(bid) for bid in data['batch_ids']]

        # Check for existing test name
        if mongo_db.tests.find_one({'name': data['test_name']}):
            return jsonify({'success': False, 'message': f"A test with the name '{data['test_name']}' already exists."}), 409

        module_id = data.get('module_id')

        test_doc = {
            'test_id': generate_unique_test_id(),
            'name': data['test_name'],
            'test_type': data['test_type'].lower(),
            'module_id': module_id,
            'campus_ids': [ObjectId(data['campus_id'])], # Stored as array for consistency
            'course_ids': [ObjectId(cid) for cid in data['course_ids']],
            'batch_ids': batch_ids,
            'questions': questions_with_ids,
            'audio_config': data['audio_config'],
            'created_by': ObjectId(current_user_id),
            'created_at': datetime.utcnow(),
            'status': 'active' if is_mcq else 'processing', # MCQ tests are immediately active
            'is_active': True if is_mcq else False  # MCQ tests don't need audio generation
        }
        # Store assigned_student_ids if provided
        if 'assigned_student_ids' in data:
            test_doc['assigned_student_ids'] = [ObjectId(sid) for sid in data['assigned_student_ids']]

        # Add start/end date and time for online tests
        if data['test_type'].lower() == 'online':
            start_dt = data.get('startDateTime')
            end_dt = data.get('endDateTime')
            if not start_dt or not end_dt:
                return jsonify({'success': False, 'message': 'Start and end date/time are required for online tests.'}), 400
            test_doc['startDateTime'] = start_dt
            test_doc['endDateTime'] = end_dt

        # Add level or subcategory based on module
        if module_id == 'GRAMMAR':
            if not data.get('subcategory'):
                return jsonify({'success': False, 'message': 'Subcategory is required for Grammar module.'}), 400
            test_doc['subcategory'] = data['subcategory']
            test_doc['level_id'] = None
        elif module_id == 'VOCABULARY':
            test_doc['level_id'] = None
            test_doc['subcategory'] = None
        else:
            if not data.get('level_id'):
                return jsonify({'success': False, 'message': 'Level is required for this module.'}), 400
            test_doc['level_id'] = data['level_id']
            test_doc['subcategory'] = None
        
        test_id = mongo_db.tests.insert_one(test_doc).inserted_id
        
        # Only trigger audio generation for non-MCQ modules
        if not is_mcq:
            thread = threading.Thread(
                target=audio_generation_worker,
                args=(current_app._get_current_object(), test_id, questions_with_ids, data['audio_config'])
            )
            thread.daemon = True
            thread.start()
            
            message = 'Test creation initiated. Audio is being generated in the background.'
        else:
            message = 'MCQ test created successfully.'
        
        return jsonify({
            'success': True,
            'message': message,
            'data': {'test_id': str(test_id)}
        }), 202

    except Exception as e:
        # Catch potential duplicate key errors from the unique index
        if "E11000" in str(e):
            return jsonify({'success': False, 'message': 'A test with this ID already exists. Please try again.'}), 409
        current_app.logger.error(f"Error creating test: {str(e)}")
        return jsonify({'success': False, 'message': f'An unexpected error occurred: {e}'}), 500

@test_management_bp.route('/upload-practice-test', methods=['POST'])
@jwt_required()
@require_superadmin
def upload_practice_test():
    """Upload practice test with CSV or manual questions"""
    try:
        current_user_id = get_jwt_identity()
        data = request.form.to_dict()
        files = request.files
        
        # Validate required fields
        required_fields = ['test_name', 'module_id', 'level_id', 'accent', 'speed', 'max_attempts']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'{field} is required'
                }), 400
        
        # Parse JSON fields
        campus_ids = json.loads(data.get('campus_ids', '[]'))
        course_ids = json.loads(data.get('course_ids', '[]'))
        batch_ids = json.loads(data.get('batch_ids', '[]'))
        
        questions = []
        
        # Handle CSV upload
        if 'csv_file' in files and files['csv_file'].filename:
            csv_file = files['csv_file']
            if not csv_file.filename.endswith('.csv'):
                return jsonify({
                    'success': False,
                    'message': 'Please upload a valid CSV file'
                }), 400
            
            # Read CSV content
            csv_content = csv_file.read().decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(csv_content))
            
            for row in csv_reader:
                if 'question' in row and row['question'].strip():
                    questions.append({
                        'question': row['question'].strip(),
                        'instructions': row.get('instructions', ''),
                        'audio_url': None
                    })
        
        # Handle manual questions
        elif data.get('questions'):
            manual_questions = json.loads(data['questions'])
            for q in manual_questions:
                if q.get('question', '').strip():
                    questions.append({
                        'question': q['question'].strip(),
                        'instructions': q.get('instructions', ''),
                        'audio_url': None
                    })
        
        if not questions:
            return jsonify({
                'success': False,
                'message': 'No valid questions found'
            }), 400
        
        # Generate audio for each question
        accent = data['accent']
        speed = float(data['speed'])
        
        for question in questions:
            audio_url = generate_audio_from_text(question['question'], accent, speed)
            if audio_url:
                question['audio_url'] = audio_url
            else:
                return jsonify({
                    'success': False,
                    'message': f'Failed to generate audio for question: {question["question"]}'
                }), 500
        
        # Create test object
        test_data = {
            'name': data['test_name'],
            'module_id': ObjectId(data['module_id']),
            'level_id': ObjectId(data['level_id']),
            'test_type': 'practice',
            'questions': questions,
            'accent': accent,
            'speed': speed,
            'max_attempts': int(data['max_attempts']),
            'campus_ids': [ObjectId(cid) for cid in campus_ids],
            'course_ids': [ObjectId(cid) for cid in course_ids],
            'batch_ids': [ObjectId(bid) for bid in batch_ids],
            'created_by': current_user_id,
            'created_at': datetime.utcnow(),
            'is_active': True
        }
        
        # Insert test
        test_id = mongo_db.insert_test(test_data)
        
        return jsonify({
            'success': True,
            'message': 'Practice test uploaded successfully',
            'data': {
                'test_id': str(test_id),
                'question_count': len(questions)
            }
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error uploading practice test: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to upload practice test: {str(e)}'
        }), 500

@test_management_bp.route('/generate-preview-audio', methods=['POST'])
@jwt_required()
@require_superadmin
def generate_preview_audio():
    """Generate preview audio for admin"""
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        accent = data.get('accent', 'en')
        speed = float(data.get('speed', 1.0))
        
        if not text:
            return jsonify({
                'success': False,
                'message': 'Text is required'
            }), 400
        
        audio_url = generate_audio_from_text(text, accent, speed)
        
        if audio_url:
            return jsonify({
                'success': True,
                'data': {
                    'audio_url': audio_url
                }
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to generate audio'
            }), 500
            
    except Exception as e:
        current_app.logger.error(f"Error generating preview audio: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to generate preview audio: {str(e)}'
        }), 500

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
        
        return jsonify({
            'success': True,
            'data': {
                'campuses': [{'id': str(c['_id']), 'name': c['name']} for c in campuses],
                'courses': [{'id': str(c['_id']), 'name': c['name']} for c in courses],
                'batches': [{'id': str(b['_id']), 'name': b['name']} for b in batches],
                'levels': [{'id': lid, 'name': name} for lid, name in LEVELS.items()],
                'modules': [{'id': mid, 'name': name} for mid, name in MODULES.items()],
                'grammar_categories': [{'id': cid, 'name': name} for cid, name in GRAMMAR_CATEGORIES.items()]
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get test data: {str(e)}'
        }), 500

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
            question_type = question.get('question_type', 'audio')
            
            if question_type == 'mcq':
                # Handle MCQ question
                answer_key = f'answer_{i}'
                if answer_key not in data:
                    return jsonify({
                        'success': False,
                        'message': f'Answer for question {i+1} is required'
                    }), 400
                
                student_answer = data[answer_key]
                is_correct = student_answer == question['correct_answer']
                score = 100 if is_correct else 0
                total_score += score
                if is_correct:
                    correct_answers += 1
                
                results.append({
                    'question_index': i,
                    'question': question['question'],
                    'options': question['options'],
                    'correct_answer': question['correct_answer'],
                    'student_answer': student_answer,
                    'is_correct': is_correct,
                    'score': score,
                    'question_type': 'mcq'
                })
            else:
                # Handle audio question
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
                
                # Calculate similarity score
                similarity_score = calculate_similarity_score(question['question'], student_text)
                total_score += similarity_score
                
                # Find mismatched words
                original_words = set(question['question'].lower().split())
                student_words = set(student_text.lower().split())
                missing_words = original_words - student_words
                extra_words = student_words - original_words
                
                results.append({
                    'question_index': i,
                    'original_text': question['question'],
                    'student_text': student_text,
                    'similarity_score': similarity_score,
                    'missing_words': list(missing_words),
                    'extra_words': list(extra_words),
                    'student_audio_url': student_audio_key,
                    'question_type': 'audio'
                })
        
        # Calculate average score
        average_score = total_score / len(results) if results else 0
        
        # Save test result
        test_result = {
            'test_id': test_id,
            'student_id': current_user_id,
            'module_id': test['module_id'],
            'level_id': test.get('level_id'),
            'subcategory': test.get('subcategory'),
            'results': results,
            'total_score': total_score,
            'average_score': average_score,
            'correct_answers': correct_answers,
            'total_questions': len(results),
            'submitted_at': datetime.utcnow(),
            'test_type': 'practice'
        }
        
        result_id = mongo_db.insert_test_result(test_result)
        
        return jsonify({
            'success': True,
            'message': 'Test submitted successfully',
            'data': {
                'result_id': str(result_id),
                'average_score': average_score,
                'correct_answers': correct_answers,
                'total_questions': len(results),
                'results': results
            }
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error submitting practice test: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to submit test: {str(e)}'
        }), 500

@test_management_bp.route('/get-practice-tests', methods=['GET'])
@jwt_required()
def get_practice_tests():
    """Get available practice tests for student"""
    try:
        current_user_id = get_jwt_identity()
        student = mongo_db.students.find_one({'user_id': current_user_id})
        
        if not student:
            return jsonify({
                'success': False,
                'message': 'Student profile not found'
            }), 404

        module_id = request.args.get('module_id')
        subcategory_id = request.args.get('subcategory_id')
        
        # Build query based on student's access
        query = {
            'test_type': 'practice',
            'is_active': True,
            '$or': [
                {'campus_ids': student.get('campus_id')},
                {'course_ids': student.get('course_id')},
                {'batch_ids': student.get('batch_id')}
            ]
        }

        if module_id:
            query['module_id'] = module_id
        if subcategory_id:
            query['subcategory'] = subcategory_id
        
        tests = list(mongo_db.tests.find(query).sort('created_at', -1))
        
        tests_data = []
        for test in tests:
            tests_data.append({
                'id': str(test['_id']),
                'name': test['name'],
                'module': MODULES.get(str(test['module_id']), 'Unknown'),
                'level': LEVELS.get(str(test['level_id']), 'Unknown'),
                'question_count': len(test['questions']),
                'max_attempts': test.get('max_attempts', 3),
                'created_at': test['created_at'].isoformat()
            })
        
        return jsonify({
            'success': True,
            'data': tests_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get practice tests: {str(e)}'
        }), 500

@test_management_bp.route('/get-test-result/<result_id>', methods=['GET'])
@jwt_required()
def get_test_result(result_id):
    """Get detailed test result"""
    try:
        current_user_id = get_jwt_identity()
        result = mongo_db.db.test_results.find_one({
            '_id': ObjectId(result_id),
            'student_id': current_user_id
        })
        if not result:
            return jsonify({
                'success': False,
                'message': 'Test result not found'
            }), 404
        # Ensure MCQ results have all necessary fields
        for q in result.get('results', []):
            if q.get('question_type') == 'mcq':
                q.setdefault('question', '')
                q.setdefault('options', {})
                q.setdefault('correct_answer', '')
                q.setdefault('student_answer', '')
                q.setdefault('is_correct', False)
        return jsonify({
            'success': True,
            'data': result
        }), 200
    except Exception as e:
        current_app.logger.error(f"Failed to get test result: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Failed to get test result: {str(e)}'
        }), 500

@test_management_bp.route('/get-test/<test_id>', methods=['GET'])
@jwt_required()
def get_test(test_id):
    """Get test details for student"""
    try:
        current_user_id = get_jwt_identity()
        test = mongo_db.tests.find_one({'_id': ObjectId(test_id)})
        
        if not test:
            return jsonify({
                'success': False,
                'message': 'Test not found'
            }), 404
        
        # Check access
        student = mongo_db.students.find_one({'user_id': current_user_id})
        if not student:
            return jsonify({
                'success': False,
                'message': 'Student profile not found'
            }), 404
        
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
        
        # Enhance questions with presigned URLs if they have audio
        for question in test.get("questions", []):
            if "audio_url1" in question and question["audio_url1"]:
                try:
                    # Generate presigned URL for viewing
                    presigned_url = s3_client.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': S3_BUCKET_NAME, 'Key': question["audio_url1"]},
                        ExpiresIn=3600  # 1 hour
                    )
                    question["audio_presigned_url"] = presigned_url
                except Exception as e:
                    print(f"Error generating presigned URL for {question['audio_url1']}: {e}")
                    question["audio_presigned_url"] = None
        
        # Look up campus name
        campus_id = test.get("campus_ids", [None])[0]
        campus_name = None
        if campus_id:
            campus_name = mongo_db.campuses.find_one({'_id': campus_id}, {'name': 1})['name']
        
        return jsonify({
            'success': True,
            'data': {
                'id': str(test['_id']),
                'name': test['name'],
                'questions': test['questions'],
                'max_attempts': test.get('max_attempts', 3),
                'accent': test.get('accent', 'en'),
                'speed': test.get('speed', 1.0),
                'campus_name': campus_name
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to get test: {str(e)}'}), 500

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
            created_at_utc = test.get('created_at', datetime.now(timezone.utc))
            if created_at_utc.tzinfo is None:
                created_at_utc = created_at_utc.replace(tzinfo=timezone.utc)
            local_tz = tz.gettz('Asia/Kolkata')
            created_at_local = created_at_utc.astimezone(local_tz)

            # Map module and level names using constants
            module_id = test.get('module_id')
            level_id = test.get('level_id')
            subcategory = test.get('subcategory')
            module_name = MODULES.get(module_id, 'N/A')
            if module_id == 'GRAMMAR' and subcategory:
                level_name = GRAMMAR_CATEGORIES.get(subcategory, 'N/A')
            else:
                level_name = LEVELS.get(level_id, 'N/A') if level_id else 'N/A'

            campus_names = ', '.join(test.get('campus_names', []))
            batches = ', '.join(test.get('batches', []))
            courses = ', '.join(test.get('courses', []))

            tests_data.append({
                '_id': str(test['_id']),
                'name': test.get('name'),
                'test_type': test.get('test_type'),
                'status': test.get('status'),
                'question_count': test.get('question_count'),
                'module_name': module_name,
                'level_name': level_name,
                'campus_name': campus_names,
                'batches': batches,
                'courses': courses,
                'created_at': created_at_local.strftime('%Y-%m-%d %H:%M:%S')
            })

        return jsonify({'success': True, 'data': tests_data}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching all tests: {e}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500

def convert_objectids(obj):
    if isinstance(obj, dict):
        return {k: convert_objectids(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_objectids(i) for i in obj]
    elif isinstance(obj, ObjectId):
        return str(obj)
    else:
        return obj

@test_management_bp.route('/tests/<test_id>', methods=['GET'])
@jwt_required()
@require_superadmin
def get_single_test(test_id):
    """Get full details for a single test for preview."""
    try:
        current_app.logger.info(f"Fetching full details for test_id: {test_id}")
        test = mongo_db.tests.find_one({'_id': ObjectId(test_id)})
        if not test:
            current_app.logger.warning(f"Test not found for id: {test_id}")
            return jsonify({'success': False, 'message': 'Test not found'}), 404

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

@test_management_bp.route('/tests/<test_id>', methods=['DELETE'])
@jwt_required()
@require_superadmin
def delete_test(test_id):
    """Delete a test and its associated S3 audio files (if any)."""
    try:
        test_to_delete = mongo_db.tests.find_one({'_id': ObjectId(test_id)})
        if not test_to_delete:
            return jsonify({'success': False, 'message': 'Test not found'}), 404

        # Only delete S3 audio files for non-MCQ modules
        module_id = test_to_delete.get('module_id')
        mcq_modules = ['GRAMMAR', 'VOCABULARY', 'READING']
        if module_id not in mcq_modules:
            questions = test_to_delete.get('questions', [])
            objects_to_delete = [{'Key': q['audio_url']} for q in questions if 'audio_url' in q and q['audio_url']]
            if objects_to_delete and s3_client:
                s3_client.delete_objects(
                    Bucket=S3_BUCKET_NAME,
                    Delete={'Objects': objects_to_delete}
                )

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

@test_management_bp.route('/results', methods=['GET'])
@jwt_required()
@require_superadmin
def get_all_results():
    """
    Get all test results with detailed student, campus, course, and batch info.
    """
    try:
        pipeline = [
            # 1. Lookup student details from 'users' collection
            {
                '$lookup': {
                    'from': 'users',
                    'localField': 'student_id',
                    'foreignField': '_id',
                    'as': 'studentInfo'
                }
            },
            # 2. Unwind the studentInfo array
            {
                '$unwind': '$studentInfo'
            },
            # 3. Lookup campus details
            {
                '$lookup': {
                    'from': 'campuses',
                    'localField': 'studentInfo.campus_id',
                    'foreignField': '_id',
                    'as': 'campusInfo'
                }
            },
            {
                '$unwind': {'path': '$campusInfo', 'preserveNullAndEmptyArrays': True}
            },
            # 4. Lookup course details
            {
                '$lookup': {
                    'from': 'courses',
                    'localField': 'studentInfo.course_id',
                    'foreignField': '_id',
                    'as': 'courseInfo'
                }
            },
            {
                '$unwind': {'path': '$courseInfo', 'preserveNullAndEmptyArrays': True}
            },
            # 5. Lookup batch details
            {
                '$lookup': {
                    'from': 'batches',
                    'localField': 'studentInfo.batch_id',
                    'foreignField': '_id',
                    'as': 'batchInfo'
                }
            },
            {
                '$unwind': {'path': '$batchInfo', 'preserveNullAndEmptyArrays': True}
            },
            # 6. Lookup test details
            {
                '$lookup': {
                    'from': 'tests',
                    'localField': 'test_id',
                    'foreignField': '_id',
                    'as': 'testInfo'
                }
            },
            {
                '$unwind': '$testInfo'
            },
            # 7. Project the final fields
            {
                '$project': {
                    '_id': 1,
                    'student_name': '$studentInfo.name',
                    'student_email': '$studentInfo.email',
                    'roll_number': '$studentInfo.roll_number',
                    'campus_name': '$campusInfo.name',
                    'course_name': '$courseInfo.name',
                    'batch_name': '$batchInfo.name',
                    'test_name': '$testInfo.name',
                    'test_type': '$testInfo.test_type',
                    'module_name': '$testInfo.module_id',
                    'score': '$average_score',
                    'time_taken': 1,
                    'submitted_at': {
                        '$dateToString': {
                            'format': '%Y-%m-%d %H:%M:%S',
                            'date': '$submitted_at'
                        }
                    }
                }
            }
        ]
        
        results = list(mongo_db.student_test_attempts.aggregate(pipeline))
        
        return jsonify({'success': True, 'data': results}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching all results: {e}", exc_info=True)
        return jsonify({'success': False, 'message': f'An unexpected error occurred: {e}'}), 500

def get_last_sequence_number(base_name, module_id, level_id=None):
    query = {'name': {'$regex': f'^{base_name}-\\d+$'}, 'module_id': module_id}
    if level_id:
        query['level_id'] = level_id
    last_test = mongo_db.tests.find(query).sort('created_at', DESCENDING).limit(1)
    if last_test.count() > 0:
        import re
        match = re.search(r'-(\d+)$', last_test[0]['name'])
        if match:
            return int(match.group(1))
    return 0

@test_management_bp.route('/get-last-sequence', methods=['GET'])
@jwt_required()
def get_last_sequence():
    base_name = request.args.get('base_name')
    module_id = request.args.get('module_id')
    level_id = request.args.get('level_id')
    if not base_name or not module_id:
        return jsonify({'success': False, 'message': 'base_name and module_id are required.'}), 400
    seq = get_last_sequence_number(base_name, module_id, level_id)
    return jsonify({'success': True, 'last_sequence': seq}), 200

@test_management_bp.route('/bulk-create-tests', methods=['POST'])
@jwt_required()
@require_superadmin
def bulk_create_tests():
    try:
        data = request.get_json()
        base_name = data.get('base_name')
        module_id = data.get('module_id')
        level_id = data.get('level_id')
        test_type = data.get('test_type')
        campus_id = data.get('campus_id')
        course_ids = data.get('course_ids')
        batch_ids = data.get('batch_ids')
        audio_config = data.get('audio_config')
        questions = data.get('questions')
        if not all([base_name, module_id, test_type, campus_id, course_ids, batch_ids, audio_config, questions]):
            return jsonify({'success': False, 'message': 'Missing required fields.'}), 400
        # Split questions into chunks of 20
        def chunks(lst, n):
            for i in range(0, len(lst), n):
                yield lst[i:i + n]
        last_seq = get_last_sequence_number(base_name, module_id, level_id)
        created_tests = []
        for idx, chunk in enumerate(chunks(questions, 20), start=1):
            seq_num = last_seq + idx
            test_name = f"{base_name}-{seq_num}"
            payload = {
                'test_name': test_name,
                'test_type': test_type,
                'module_id': module_id,
                'level_id': level_id,
                'campus_id': campus_id,
                'course_ids': course_ids,
                'batch_ids': batch_ids,
                'audio_config': audio_config,
                'questions': chunk
            }
            # Reuse create_test logic
            with current_app.test_request_context(json=payload):
                resp = create_test()
                if resp[1] not in (200, 202):
                    return resp
                created_tests.append(test_name)
        return jsonify({'success': True, 'message': f'Created {len(created_tests)} tests.', 'tests': created_tests}), 201
    except Exception as e:
        current_app.logger.error(f"Error in bulk_create_tests: {e}")
        return jsonify({'success': False, 'message': f'Bulk creation failed: {e}'}), 500

# --- MODULE QUESTION BANK ENDPOINTS ---

@test_management_bp.route('/module-question-bank/upload', methods=['POST'])
@jwt_required()
@require_superadmin
def upload_module_questions():
    try:
        data = request.get_json()
        module_id = data.get('module_id')
        level_id = data.get('level_id')
        questions = data.get('questions')
        if not module_id or not level_id or not questions:
            return jsonify({'success': False, 'message': 'module_id, level_id, and questions are required.'}), 400
        # Store each question in a question_bank collection
        inserted = []
        for q in questions:
            doc = {
                'module_id': module_id,
                'level_id': level_id,
                'question': q.get('question'),
                'instructions': q.get('instructions', ''),
                'set': q.get('set', 'Set-1'), # Store set info, default to 'Set-1' if not provided
                'used_in_tests': [], # Track test_ids where used
                'used_count': 0,
                'last_used': None,
                'created_at': datetime.utcnow()
            }
            # Support sublevel/subcategory for grammar
            if 'subcategory' in q:
                doc['subcategory'] = q['subcategory']
            mongo_db.question_bank.insert_one(doc)
            inserted.append(doc['question'])
        return jsonify({'success': True, 'message': f'Uploaded {len(inserted)} questions to module bank.'}), 201
    except Exception as e:
        current_app.logger.error(f"Error uploading module questions: {e}")
        return jsonify({'success': False, 'message': f'Upload failed: {e}'}), 500

@test_management_bp.route('/module-question-bank/random', methods=['POST'])
@jwt_required()
@require_superadmin
def get_random_questions():
    try:
        data = request.get_json()
        module_id = data.get('module_id')
        level_id = data.get('level_id')
        count = int(data.get('count', 20))
        if not module_id or not level_id:
            return jsonify({'success': False, 'message': 'module_id and level_id are required.'}), 400
        # Find all questions for this module/level
        all_questions = list(mongo_db.question_bank.find({'module_id': module_id, 'level_id': level_id}))
        if not all_questions:
            return jsonify({'success': False, 'message': 'No questions found for this module/level.'}), 404
        # Find questions least used in tests
        all_questions.sort(key=lambda q: len(q.get('used_in_tests', [])))
        selected = []
        used_counts = defaultdict(int)
        for q in all_questions:
            used_counts[len(q.get('used_in_tests', []))] += 1
        # Select questions with least usage first
        for q in all_questions:
            if len(selected) < count:
                selected.append(q)
        # Warn if repeats will occur
        min_used = len(all_questions[0].get('used_in_tests', []))
        will_repeat = len(all_questions) < count or min_used > 0
        return jsonify({'success': True, 'questions': selected, 'will_repeat': will_repeat, 'min_used': min_used}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching random questions: {e}")
        return jsonify({'success': False, 'message': f'Random fetch failed: {e}'}), 500

# --- TEST CREATION (USING QUESTION BANK) ---

@test_management_bp.route('/create-test-from-bank', methods=['POST'])
@jwt_required()
@require_superadmin
def create_test_from_bank():
    try:
        data = request.get_json()
        test_name = data.get('test_name')
        module_id = data.get('module_id')
        level_id = data.get('level_id')
        test_type = data.get('test_type')
        campus_id = data.get('campus_id')
        course_ids = data.get('course_ids')
        batch_ids = data.get('batch_ids')
        audio_config = data.get('audio_config')
        question_count = int(data.get('question_count', 20))
        if not all([test_name, module_id, level_id, test_type, campus_id, course_ids, batch_ids, audio_config]):
            return jsonify({'success': False, 'message': 'Missing required fields.'}), 400
        # Fetch random questions
        resp = get_random_questions()
        if resp[1] != 200:
            return resp
        questions = resp[0].json['questions'][:question_count]
        # Mark these questions as used in this test
        test_id = generate_unique_test_id()
        for q in questions:
            mongo_db.question_bank.update_one({'_id': q['_id']}, {'$push': {'used_in_tests': test_id}})
        # Create test as before, but with these questions
        test_doc = {
            'test_id': test_id,
            'name': test_name,
            'test_type': test_type.lower(),
            'module_id': module_id,
            'level_id': level_id,
            'campus_ids': [ObjectId(campus_id)],
            'course_ids': [ObjectId(cid) for cid in course_ids],
            'batch_ids': [ObjectId(bid) for bid in batch_ids],
            'questions': questions,
            'audio_config': audio_config,
            'created_by': ObjectId(get_jwt_identity()),
            'created_at': datetime.utcnow(),
            'status': 'active',
            'is_active': True
        }
        mongo_db.tests.insert_one(test_doc)
        return jsonify({'success': True, 'message': 'Test created from question bank.', 'test_id': test_id}), 201
    except Exception as e:
        current_app.logger.error(f"Error creating test from bank: {e}")
        return jsonify({'success': False, 'message': f'Create from bank failed: {e}'}), 500

@test_management_bp.route('/student-count', methods=['POST'])
@jwt_required()
@require_superadmin
def student_count():
    """Return the count and list of students for the selected campus, batches, and courses (strict AND logic)."""
    try:
        data = request.get_json()
        campus = data.get('campus')
        batches = data.get('batches', [])
        courses = data.get('courses', [])
        query = {}
        if campus:
            query['campus_id'] = ObjectId(campus)
        if batches:
            query['batch_id'] = {'$in': [ObjectId(b) for b in batches]}
        if courses:
            query['course_id'] = {'$in': [ObjectId(c) for c in courses]}
        # Only include students who match ALL filters (campus, batch, and course)
        students = list(mongo_db.students.find(query))
        # Filter again in Python to ensure strict AND logic
        filtered_students = []
        for s in students:
            if (not campus or str(s.get('campus_id')) == str(campus)) and \
               (not batches or str(s.get('batch_id')) in [str(b) for b in batches]) and \
               (not courses or str(s.get('course_id')) in [str(c) for c in courses]):
                filtered_students.append(s)
        student_list = []
        for s in filtered_students:
            student_list.append({
                'id': str(s.get('_id')),
                'name': s.get('name'),
                'roll_number': s.get('roll_number'),
                'email': s.get('email'),
                'mobile_number': s.get('mobile_number'),
            })
        return jsonify({'count': len(student_list), 'students': student_list})
    except Exception as e:
        current_app.logger.error(f"Error fetching student count/list: {e}")
        return jsonify({'count': 0, 'students': [], 'error': str(e)}), 500

@test_management_bp.route('/notify-students/<test_id>', methods=['POST'])
@jwt_required()
@require_superadmin
def notify_students(test_id):
    """
    Notify all students assigned to a test by email with test details.
    Only students who have not completed the test (no result) will be notified.
    Returns a list of all students with their notification and test status.
    """
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

        # Fetch all results for this test
        results = list(mongo_db.db.test_results.find({'test_id': ObjectId(test_id)}))
        completed_emails = set()
        for r in results:
            # Try to get email from student_id
            student = mongo_db.students.find_one({'_id': r.get('student_id')})
            if student and student.get('email'):
                completed_emails.add(student['email'])

        # Prepare email content
        test_type = test.get('test_type', '').capitalize()
        module = test.get('module_id', 'N/A')
        module_display_name = MODULES.get(module, module)
        level = test.get('level_id', 'N/A')
        subcategory = test.get('subcategory')
        if module == 'GRAMMAR' and subcategory:
            level_display_name = GRAMMAR_CATEGORIES.get(subcategory, subcategory)
        else:
            level_display_name = LEVELS.get(level, level)
        test_name = test.get('name', 'N/A')
        start_dt = test.get('startDateTime')
        end_dt = test.get('endDateTime')
        is_online = test.get('test_type', '').lower() == 'online'
        question_count = len(test.get('questions', []))

        # Log context for debugging
        print('EMAIL TEMPLATE CONTEXT:', {
            'test_name': test_name,
            'test_type': test_type,
            'module': module,
            'module_display_name': module_display_name,
            'level': level,
            'level_display_name': level_display_name,
            'start_dt': start_dt,
            'end_dt': end_dt,
            'is_online': is_online,
            'question_count': question_count
        })

        # Render email template
        html_content = render_template('test_notification.html',
            test_name=test_name,
            test_type=test_type,
            module=module,
            module_display_name=module_display_name,
            level=level,
            level_display_name=level_display_name,
            start_dt=start_dt,
            end_dt=end_dt,
            is_online=is_online,
            question_count=question_count,
            test_id=str(test['_id'])  # Pass test_id for direct link
        )
        subject = f"New {test_type} Test Assigned: {test_name}"

        notify_results = []
        API_KEY = '7c9c967a-4ce9-4748-9dc7-d2aaef847275'
        API_URL = 'http://www.bulksmsapps.com/api/apismsv2.aspx'
        SENDER_ID = 'PYDAHK'
        TEMPLATE_ID = '1707171819046577560'
        def sms_message(vars):
            return f"Join MBA,MCA @ Pydah College of Engg (Autonomous).Best Opportunity for Employees,Aspiring Students. {vars[0]} youtu.be/bnLOLQrSC5g?si=7TNjgpGQ3lTIe-sf -PYDAH"
        for student in student_list:
            email = student['email']
            already_completed = email in completed_emails
            status = 'skipped' if already_completed else 'pending'
            notify_status = {
                'email': email,
                'name': student.get('name', 'Student'),
                'test_status': 'completed' if already_completed else 'pending',
                'notify_status': status
            }
            if not already_completed:
                try:
                    send_email(
                        to_email=email,
                        to_name=student.get('name', 'Student'),
                        subject=subject,
                        html_content=html_content
                    )
                    notify_status['notify_status'] = 'sent'
                except Exception as e:
                    notify_status['notify_status'] = 'failed'
                    notify_status['error'] = str(e)
                # --- SMS Integration ---
                mobile_number = student.get('mobile_number')
                if mobile_number:
                    try:
                        params = {
                            'apikey': API_KEY,
                            'sender': SENDER_ID,
                            'number': mobile_number,
                            'message': sms_message(['Admissions Open!']),
                            'templateid': TEMPLATE_ID,
                        }
                        sms_response = requests.get(API_URL, params=params)
                        notify_status['sms_status'] = 'sent' if sms_response.status_code == 200 else 'failed'
                        notify_status['sms_response'] = sms_response.text
                    except Exception as sms_e:
                        notify_status['sms_status'] = 'failed'
                        notify_status['sms_error'] = str(sms_e)
                else:
                    notify_status['sms_status'] = 'no_mobile'
            notify_results.append(notify_status)
        return jsonify({'success': True, 'results': notify_results}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to send notification: {e}'}), 500

@test_management_bp.route('/question-bank/fetch-for-test', methods=['POST'])
@jwt_required()
@require_superadmin
def fetch_questions_for_test():
    data = request.get_json()
    module_id = data.get('module_id')
    level_id = data.get('level_id')
    subcategory = data.get('subcategory')  # For grammar
    n = int(data.get('count', 20))
    query = {'module_id': module_id, 'level_id': level_id}
    if module_id == 'GRAMMAR' and subcategory:
        query['subcategory'] = subcategory
    questions = list(mongo_db.question_bank.find(query).sort([
        ('used_count', 1),
        ('last_used', 1)
    ]).limit(n))
    for q in questions:
        q['_id'] = str(q['_id'])
    return jsonify({'success': True, 'questions': questions}), 200

@test_management_bp.route('/question-bank/check-duplicates', methods=['POST'])
@jwt_required()
@require_superadmin
def check_question_duplicates():
    data = request.get_json()
    module_id = data.get('module_id')
    level_id = data.get('level_id')
    questions = data.get('questions', [])
    duplicates = {}
    for idx, qtext in enumerate(questions):
        exists = mongo_db.question_bank.find_one({
            'module_id': module_id,
            'level_id': level_id,
            '$or': [
                {'question_text': qtext},
                {'question': qtext}
            ]
        })
        if exists:
            duplicates[idx] = True
    return jsonify({'success': True, 'duplicates': duplicates}), 200 