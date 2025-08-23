import os
import uuid
import boto3
from config.aws_config import s3_client, S3_BUCKET_NAME

# Make audio processing packages optional
try:
    from gtts import gTTS
    GTTS_AVAILABLE = True
except ImportError:
    GTTS_AVAILABLE = False
    print("Warning: gTTS package not available. Audio generation will not work.")

try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False
    print("Warning: pydub package not available. Audio processing will not work.")

def generate_audio_from_text(text, accent='en', speed=1.0):
    """Generate audio from text using gTTS with custom accent and speed"""
    if not GTTS_AVAILABLE:
        raise Exception("Audio generation not available - gTTS package is missing. Please install it using: pip install gtts")
    
    if not PYDUB_AVAILABLE:
        raise Exception("Audio generation not available - pydub package is missing. Please install it using: pip install pydub")
    
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
        try:
            s3_client.upload_file(adjusted_filename, S3_BUCKET_NAME, s3_key)
        except Exception as s3_error:
            raise Exception(f"Failed to upload audio to S3: {str(s3_error)}. Please check S3 configuration.")
        
        # Clean up temporary files
        try:
            os.remove(temp_filename)
            os.remove(adjusted_filename)
        except Exception as cleanup_error:
            print(f"Warning: Failed to cleanup temporary files: {cleanup_error}")
        
        return s3_key
    except Exception as e:
        if "gTTS" in str(e):
            raise Exception(f"Text-to-speech conversion failed: {str(e)}. Please check the text content and try again.")
        elif "AudioSegment" in str(e):
            raise Exception(f"Audio processing failed: {str(e)}. Please check if the audio file was generated correctly.")
        else:
            raise Exception(f"Audio generation failed: {str(e)}. Please try again or contact support.")

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
        # Try to import speech_recognition, but make it optional
        try:
            import speech_recognition as sr
        except ImportError:
            print("Warning: speech_recognition package not available. Audio transcription will not work.")
            return ""
        
        recognizer = sr.Recognizer()
        with sr.AudioFile(audio_file_path) as source:
            audio = recognizer.record(source)
            text = recognizer.recognize_google(audio)
            return text
    except Exception as e:
        print(f"Error transcribing audio: {str(e)}")
        return "" 