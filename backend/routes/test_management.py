from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
import csv
import io
import os
import uuid
from datetime import datetime
import boto3
from pydub import AudioSegment
from gtts import gTTS
import speech_recognition as sr
from difflib import SequenceMatcher
import json
from mongo import mongo_db
from config.constants import ROLES, MODULES, LEVELS, TEST_TYPES
from config.aws_config import s3_client, S3_BUCKET_NAME
from utils.audio_generator import generate_audio_from_text, calculate_similarity_score, transcribe_audio
import functools

test_management_bp = Blueprint('test_management', __name__)

def require_superadmin(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user or user.get('role') != ROLES['SUPER_ADMIN']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Super admin privileges required.'
            }), 403
        
        return f(*args, **kwargs)
    return decorated_function

def generate_audio_from_text(text, accent='en', speed=1.0):
    """Generate audio from text using gTTS with custom accent and speed"""
    try:
        # Create gTTS object with specified accent
        tts = gTTS(text=text, lang=accent, slow=(speed < 1.0))
        
        # Generate temporary file
        temp_filename = f"temp_{uuid.uuid4()}.mp3"
        tts.save(temp_filename)
        
        # Load audio and adjust speed if needed
        audio = AudioSegment.from_mp3(temp_filename)
        if speed != 1.0:
            # Adjust playback speed
            new_frame_rate = int(audio.frame_rate * speed)
            audio = audio._spawn(audio.raw_data, overrides={'frame_rate': new_frame_rate})
            audio = audio.set_frame_rate(audio.frame_rate)
        
        # Save adjusted audio
        adjusted_filename = f"adjusted_{uuid.uuid4()}.mp3"
        audio.export(adjusted_filename, format="mp3")
        
        # Upload to S3
        s3_key = f"audio/practice_tests/{uuid.uuid4()}.mp3"
        s3_client.upload_file(adjusted_filename, S3_BUCKET_NAME, s3_key)
        
        # Clean up temporary files
        os.remove(temp_filename)
        os.remove(adjusted_filename)
        
        return s3_key
    except Exception as e:
        current_app.logger.error(f"Error generating audio: {str(e)}")
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
        recognizer = sr.Recognizer()
        with sr.AudioFile(audio_file_path) as source:
            audio = recognizer.record(source)
            text = recognizer.recognize_google(audio)
            return text
    except Exception as e:
        current_app.logger.error(f"Error transcribing audio: {str(e)}")
        return ""

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
                'modules': [{'id': mid, 'name': name} for mid, name in MODULES.items()]
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
    """Submit practice test with student audio recordings"""
    try:
        current_user_id = get_jwt_identity()
        data = request.form.to_dict()
        files = request.files
        
        # Validate required fields
        if not data.get('test_id') or not files:
            return jsonify({
                'success': False,
                'message': 'Test ID and audio files are required'
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
        
        # Process audio files and calculate results
        results = []
        total_score = 0
        
        for i, question in enumerate(test['questions']):
            audio_key = f'question_{i}'
            if audio_key in files:
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
                    'student_audio_url': student_audio_key
                })
        
        # Calculate average score
        average_score = total_score / len(results) if results else 0
        
        # Save test result
        test_result = {
            'test_id': test_id,
            'student_id': current_user_id,
            'module_id': test['module_id'],
            'level_id': test['level_id'],
            'results': results,
            'total_score': total_score,
            'average_score': average_score,
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
        
        return jsonify({
            'success': True,
            'data': {
                'id': str(test['_id']),
                'name': test['name'],
                'questions': test['questions'],
                'max_attempts': test.get('max_attempts', 3),
                'accent': test.get('accent', 'en'),
                'speed': test.get('speed', 1.0)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get test: {str(e)}'
        }), 500 