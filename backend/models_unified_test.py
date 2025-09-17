"""
Unified Test System Database Models
This module defines the database schema for the unified test system
"""

from datetime import datetime
from bson import ObjectId
from typing import List, Dict, Optional, Any
import pytz

class UnifiedTestSection:
    """Represents a section within a unified test"""
    
    @staticmethod
    def create_section(
        section_name: str,
        section_description: str = "",
        time_limit_minutes: int = 30,
        question_sources: List[Dict] = None,
        question_count: int = 10,
        section_order: int = 1
    ) -> Dict:
        """Create a new unified test section"""
        return {
            'section_id': str(ObjectId()),
            'section_name': section_name,
            'section_description': section_description,
            'time_limit_minutes': time_limit_minutes,
            'question_sources': question_sources or [],
            'question_count': question_count,
            'section_order': section_order,
            'created_at': datetime.now(pytz.utc),
            'updated_at': datetime.now(pytz.utc)
        }

class UnifiedTest:
    """Represents a unified test"""
    
    @staticmethod
    def create_test(
        test_name: str,
        test_description: str = "",
        total_time_minutes: int = 120,
        sections: List[Dict] = None,
        campus_ids: List[str] = None,
        course_ids: List[str] = None,
        batch_ids: List[str] = None,
        created_by: str = None,
        status: str = "draft",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict:
        """Create a new unified test"""
        return {
            'test_name': test_name,
            'test_description': test_description,
            'total_time_minutes': total_time_minutes,
            'sections': sections or [],
            'campus_ids': [ObjectId(cid) for cid in (campus_ids or [])],
            'course_ids': [ObjectId(cid) for cid in (course_ids or [])],
            'batch_ids': [ObjectId(bid) for bid in (batch_ids or [])],
            'created_by': ObjectId(created_by) if created_by else None,
            'status': status,  # draft, active, completed, archived
            'start_date': start_date,  # Optional start date - if None, test is always available
            'end_date': end_date,  # Optional end date - if None, test has no end date
            'total_questions': sum(section.get('question_count', 0) for section in (sections or [])),
            'total_sections': len(sections or []),
            'created_at': datetime.now(pytz.utc),
            'updated_at': datetime.now(pytz.utc)
        }

class UnifiedQuestionSource:
    """Represents a question source for unified tests"""
    
    @staticmethod
    def create_question_bank_source(
        module_ids: List[str] = None,
        level_ids: List[str] = None,
        question_types: List[str] = None,
        question_count: int = 10,
        randomize: bool = True
    ) -> Dict:
        """Create a question source from question bank"""
        return {
            'source_type': 'question_bank',
            'module_ids': [ObjectId(mid) for mid in (module_ids or [])],
            'level_ids': [ObjectId(lid) for lid in (level_ids or [])],
            'question_types': question_types or ['MCQ', 'Sentence', 'Audio'],
            'question_count': question_count,
            'randomize': randomize,
            'created_at': datetime.now(pytz.utc)
        }
    
    @staticmethod
    def create_manual_question(
        question_text: str,
        question_type: str,
        options: List[str] = None,
        correct_answer: str = None,
        explanation: str = None,
        marks: int = 1,
        audio_file_url: str = None,
        image_url: str = None
    ) -> Dict:
        """Create a manually entered question"""
        return {
            'source_type': 'manual',
            'question_text': question_text,
            'question_type': question_type,  # MCQ, Sentence, Audio, Paragraph
            'options': options or [],
            'correct_answer': correct_answer,
            'explanation': explanation,
            'marks': marks,
            'audio_file_url': audio_file_url,
            'image_url': image_url,
            'created_at': datetime.now(pytz.utc)
        }
    
    @staticmethod
    def create_uploaded_question(
        file_url: str,
        detected_question_type: str,
        question_text: str,
        options: List[str] = None,
        correct_answer: str = None,
        marks: int = 1,
        processing_status: str = "completed"
    ) -> Dict:
        """Create a question from uploaded file"""
        return {
            'source_type': 'uploaded',
            'file_url': file_url,
            'detected_question_type': detected_question_type,
            'question_text': question_text,
            'options': options or [],
            'correct_answer': correct_answer,
            'marks': marks,
            'processing_status': processing_status,  # processing, completed, failed
            'created_at': datetime.now(pytz.utc)
        }

class UnifiedTestAttempt:
    """Represents a student's attempt at a unified test"""
    
    @staticmethod
    def create_attempt(
        student_id: str,
        unified_test_id: str,
        section_attempts: List[Dict] = None,
        total_score: float = 0.0,
        total_marks: int = 0,
        status: str = "in_progress"
    ) -> Dict:
        """Create a new unified test attempt"""
        return {
            'student_id': ObjectId(student_id),
            'unified_test_id': ObjectId(unified_test_id),
            'section_attempts': section_attempts or [],
            'total_score': total_score,
            'total_marks': total_marks,
            'status': status,  # in_progress, completed, abandoned
            'started_at': datetime.now(pytz.utc),
            'submitted_at': None,
            'time_spent_minutes': 0
        }

class UnifiedTestSectionAttempt:
    """Represents a student's attempt at a specific section"""
    
    @staticmethod
    def create_section_attempt(
        section_id: str,
        questions_attempted: List[Dict] = None,
        section_score: float = 0.0,
        section_marks: int = 0,
        time_spent_minutes: int = 0,
        status: str = "in_progress"
    ) -> Dict:
        """Create a new section attempt"""
        return {
            'section_id': section_id,
            'questions_attempted': questions_attempted or [],
            'section_score': section_score,
            'section_marks': section_marks,
            'time_spent_minutes': time_spent_minutes,
            'status': status,  # in_progress, completed
            'started_at': datetime.now(pytz.utc),
            'completed_at': None
        }

# Database collection names
UNIFIED_TESTS_COLLECTION = "unified_tests"
UNIFIED_TEST_SECTIONS_COLLECTION = "unified_test_sections"
UNIFIED_QUESTION_SOURCES_COLLECTION = "unified_question_sources"
UNIFIED_TEST_ATTEMPTS_COLLECTION = "unified_test_attempts"
UNIFIED_TEST_SECTION_ATTEMPTS_COLLECTION = "unified_test_section_attempts"
