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
        required_fields = ['test_name', 'test_type', 'campus_id', 'course_ids', 'questions', 'audio_config']
        if not all(field in data for field in required_fields):
            return jsonify({'success': False, 'message': 'Missing required fields.'}), 400

        # Further validation
        if not data['questions']:
            return jsonify({'success': False, 'message': 'At least one question is required.'}), 400

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
        batch_ids = [ObjectId(bid) for bid in data.get('batch_ids', [])]
        if not batch_ids:
            # Fallback: fetch all batches for the selected courses (legacy behavior)
            course_obj_ids = [ObjectId(cid) for cid in data['course_ids']]
            batches = list(mongo_db.batches.find({'course_ids': {'$in': course_obj_ids}}))
            batch_ids = [b['_id'] for b in batches]

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
        
        result = mongo_db.test_results.find_one({
            '_id': ObjectId(result_id),
            'student_id': current_user_id
        })
        
        if not result:
            return jsonify({
                'success': False,
                'message': 'Test result not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
        
    except Exception as e:
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
        # Convert other ObjectIds if necessary
        for key in ['campus_ids', 'course_ids', 'batch_ids', 'created_by']:
            if key in test and test[key] is not None:
                if isinstance(test[key], list):
                    test[key] = [str(item) for item in test[key]]
                else:
                    # Handle single ObjectId value
                    test[key] = str(test[key])

        current_app.logger.info(f"Successfully processed test {test_id}. Sending to frontend.")
        return jsonify({'success': True, 'data': test}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching test {test_id}: {e}", exc_info=True)
        return jsonify({'success': False, 'message': 'An error occurred while fetching the test.'}), 500

@test_management_bp.route('/tests/<test_id>', methods=['DELETE'])
@jwt_required()
@require_superadmin
def delete_test(test_id):
    """Delete a test and its associated S3 audio files."""
    try:
        test_to_delete = mongo_db.tests.find_one({'_id': ObjectId(test_id)})
        if not test_to_delete:
            return jsonify({'success': False, 'message': 'Test not found'}), 404

        # Delete audio files from S3
        questions = test_to_delete.get('questions', [])
        if questions:
            objects_to_delete = [{'Key': q['audio_url']} for q in questions if 'audio_url' in q and q['audio_url']]
            if objects_to_delete:
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
                    'test_name': '$testInfo.test_name',
                    'test_type': '$testInfo.test_type',
                    'module_name': '$testInfo.module_name',
                    'score': 1,
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