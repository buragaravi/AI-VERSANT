import os
import uuid
from gtts import gTTS
from pydub import AudioSegment
import boto3
from config.aws_config import s3_client, S3_BUCKET_NAME

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
        print(f"Error generating audio: {str(e)}")
        return None

def calculate_similarity_score(original_text, student_audio_text):
    """Calculate similarity score between original and student audio text"""
    try:
        from difflib import SequenceMatcher
        
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
        print(f"Error calculating similarity: {str(e)}")
        return 0.0

def transcribe_audio(audio_file_path):
    """Transcribe audio file to text using speech recognition"""
    try:
        import speech_recognition as sr
        
        recognizer = sr.Recognizer()
        with sr.AudioFile(audio_file_path) as source:
            audio = recognizer.record(source)
            text = recognizer.recognize_google(audio)
            return text
    except Exception as e:
        print(f"Error transcribing audio: {str(e)}")
        return "" 