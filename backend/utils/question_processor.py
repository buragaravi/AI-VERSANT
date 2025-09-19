"""
Question Processing Utilities
Handles file upload processing, question type detection, and question parsing
"""

import os
import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import pytz
from bson import ObjectId

logger = logging.getLogger(__name__)

class QuestionProcessor:
    """Processes uploaded question files and detects question types"""
    
    def __init__(self):
        self.question_patterns = {
            'MCQ': [
                r'^\d+\.\s*(.+?)\s*\n\s*[A-D]\.\s*(.+?)\s*\n\s*[A-D]\.\s*(.+?)\s*\n\s*[A-D]\.\s*(.+?)\s*\n\s*[A-D]\.\s*(.+?)\s*\n\s*Answer:\s*([A-D])',
                r'^\d+\.\s*(.+?)\s*\n\s*\(A\)\s*(.+?)\s*\n\s*\(B\)\s*(.+?)\s*\n\s*\(C\)\s*(.+?)\s*\n\s*\(D\)\s*(.+?)\s*\n\s*Answer:\s*([A-D])',
                r'Question\s*\d+:\s*(.+?)\s*\n\s*[A-D]\.\s*(.+?)\s*\n\s*[A-D]\.\s*(.+?)\s*\n\s*[A-D]\.\s*(.+?)\s*\n\s*[A-D]\.\s*(.+?)\s*\n\s*Correct\s*Answer:\s*([A-D])'
            ],
            'Sentence': [
                r'^\d+\.\s*(.+?)\s*\n\s*Answer:\s*(.+?)(?:\n|$)',
                r'Question\s*\d+:\s*(.+?)\s*\n\s*Answer:\s*(.+?)(?:\n|$)',
                r'^\d+\.\s*(.+?)\s*\n\s*Expected\s*Answer:\s*(.+?)(?:\n|$)'
            ],
            'Paragraph': [
                r'Read\s*the\s*following\s*passage\s*and\s*answer\s*the\s*questions:\s*\n\s*(.+?)\s*\n\s*Questions:\s*\n\s*(.+?)(?:\n|$)',
                r'Passage:\s*\n\s*(.+?)\s*\n\s*Questions:\s*\n\s*(.+?)(?:\n|$)'
            ],
            'Audio': [
                r'^\d+\.\s*Listen\s*to\s*the\s*audio\s*and\s*answer:\s*(.+?)\s*\n\s*Answer:\s*(.+?)(?:\n|$)',
                r'Question\s*\d+:\s*Audio\s*Question\s*\n\s*(.+?)\s*\n\s*Answer:\s*(.+?)(?:\n|$)'
            ]
        }
    
    def detect_question_type(self, text: str) -> str:
        """Detect question type based on text patterns"""
        text = text.strip()
        
        # Check for MCQ patterns
        for pattern in self.question_patterns['MCQ']:
            if re.search(pattern, text, re.MULTILINE | re.DOTALL | re.IGNORECASE):
                return 'MCQ'
        
        # Check for Audio patterns
        for pattern in self.question_patterns['Audio']:
            if re.search(pattern, text, re.MULTILINE | re.DOTALL | re.IGNORECASE):
                return 'Audio'
        
        # Check for Paragraph patterns
        for pattern in self.question_patterns['Paragraph']:
            if re.search(pattern, text, re.MULTILINE | re.DOTALL | re.IGNORECASE):
                return 'Paragraph'
        
        # Check for Sentence patterns
        for pattern in self.question_patterns['Sentence']:
            if re.search(pattern, text, re.MULTILINE | re.DOTALL | re.IGNORECASE):
                return 'Sentence'
        
        # Default to Sentence if no pattern matches
        return 'Sentence'
    
    def parse_mcq_question(self, text: str) -> Optional[Dict[str, Any]]:
        """Parse MCQ question from text"""
        for pattern in self.question_patterns['MCQ']:
            match = re.search(pattern, text, re.MULTILINE | re.DOTALL | re.IGNORECASE)
            if match:
                groups = match.groups()
                if len(groups) >= 6:
                    return {
                        'question_text': groups[0].strip(),
                        'options': [groups[i].strip() for i in range(1, 5)],
                        'correct_answer': groups[5].strip(),
                        'question_type': 'MCQ',
                        'marks': 1
                    }
        return None
    
    def parse_sentence_question(self, text: str) -> Optional[Dict[str, Any]]:
        """Parse Sentence question from text"""
        for pattern in self.question_patterns['Sentence']:
            match = re.search(pattern, text, re.MULTILINE | re.DOTALL | re.IGNORECASE)
            if match:
                groups = match.groups()
                if len(groups) >= 2:
                    return {
                        'question_text': groups[0].strip(),
                        'correct_answer': groups[1].strip(),
                        'question_type': 'Sentence',
                        'marks': 1
                    }
        return None
    
    def parse_paragraph_question(self, text: str) -> Optional[Dict[str, Any]]:
        """Parse Paragraph question from text"""
        for pattern in self.question_patterns['Paragraph']:
            match = re.search(pattern, text, re.MULTILINE | re.DOTALL | re.IGNORECASE)
            if match:
                groups = match.groups()
                if len(groups) >= 2:
                    return {
                        'question_text': f"Passage: {groups[0].strip()}\n\nQuestions: {groups[1].strip()}",
                        'correct_answer': 'Open-ended response',
                        'question_type': 'Paragraph',
                        'marks': 2
                    }
        return None
    
    def parse_audio_question(self, text: str) -> Optional[Dict[str, Any]]:
        """Parse Audio question from text"""
        for pattern in self.question_patterns['Audio']:
            match = re.search(pattern, text, re.MULTILINE | re.DOTALL | re.IGNORECASE)
            if match:
                groups = match.groups()
                if len(groups) >= 2:
                    return {
                        'question_text': groups[0].strip(),
                        'correct_answer': groups[1].strip(),
                        'question_type': 'Audio',
                        'marks': 1,
                        'audio_required': True
                    }
        return None
    
    def process_text_file(self, file_path: str) -> List[Dict[str, Any]]:
        """Process a text file and extract questions"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            # Split content into potential questions
            # Look for question separators
            question_blocks = re.split(r'\n\s*\n|\n\s*Question\s*\d+:', content)
            question_blocks = [block.strip() for block in question_blocks if block.strip()]
            
            questions = []
            for i, block in enumerate(question_blocks):
                if not block:
                    continue
                
                # Detect question type
                question_type = self.detect_question_type(block)
                
                # Parse based on type
                parsed_question = None
                if question_type == 'MCQ':
                    parsed_question = self.parse_mcq_question(block)
                elif question_type == 'Sentence':
                    parsed_question = self.parse_sentence_question(block)
                elif question_type == 'Paragraph':
                    parsed_question = self.parse_paragraph_question(block)
                elif question_type == 'Audio':
                    parsed_question = self.parse_audio_question(block)
                
                if parsed_question:
                    parsed_question['question_number'] = i + 1
                    parsed_question['source_file'] = os.path.basename(file_path)
                    parsed_question['processed_at'] = datetime.now(pytz.utc)
                    questions.append(parsed_question)
                else:
                    # If parsing fails, create a basic question
                    questions.append({
                        'question_text': block[:200] + '...' if len(block) > 200 else block,
                        'correct_answer': 'Manual review required',
                        'question_type': 'Sentence',
                        'marks': 1,
                        'question_number': i + 1,
                        'source_file': os.path.basename(file_path),
                        'processed_at': datetime.now(pytz.utc),
                        'needs_review': True
                    })
            
            return questions
            
        except Exception as e:
            logger.error(f"Error processing text file {file_path}: {e}")
            return []
    
    def process_docx_file(self, file_path: str) -> List[Dict[str, Any]]:
        """Process a DOCX file and extract questions"""
        try:
            import docx
            
            doc = docx.Document(file_path)
            content = []
            
            # Extract text from all paragraphs
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    content.append(paragraph.text.strip())
            
            # Join content and process as text
            text_content = '\n'.join(content)
            return self.process_text_content(text_content, os.path.basename(file_path))
            
        except ImportError:
            logger.error("python-docx library not installed. Install with: pip install python-docx")
            return []
        except Exception as e:
            logger.error(f"Error processing DOCX file {file_path}: {e}")
            return []
    
    def process_pdf_file(self, file_path: str) -> List[Dict[str, Any]]:
        """Process a PDF file and extract questions"""
        try:
            import PyPDF2
            
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                content = []
                
                for page in pdf_reader.pages:
                    content.append(page.extract_text())
            
            text_content = '\n'.join(content)
            return self.process_text_content(text_content, os.path.basename(file_path))
            
        except ImportError:
            logger.error("PyPDF2 library not installed. Install with: pip install PyPDF2")
            return []
        except Exception as e:
            logger.error(f"Error processing PDF file {file_path}: {e}")
            return []
    
    def process_text_content(self, content: str, source_file: str) -> List[Dict[str, Any]]:
        """Process text content and extract questions"""
        # Split content into potential questions
        question_blocks = re.split(r'\n\s*\n|\n\s*Question\s*\d+:', content)
        question_blocks = [block.strip() for block in question_blocks if block.strip()]
        
        questions = []
        for i, block in enumerate(question_blocks):
            if not block or len(block) < 10:  # Skip very short blocks
                continue
            
            # Detect question type
            question_type = self.detect_question_type(block)
            
            # Parse based on type
            parsed_question = None
            if question_type == 'MCQ':
                parsed_question = self.parse_mcq_question(block)
            elif question_type == 'Sentence':
                parsed_question = self.parse_sentence_question(block)
            elif question_type == 'Paragraph':
                parsed_question = self.parse_paragraph_question(block)
            elif question_type == 'Audio':
                parsed_question = self.parse_audio_question(block)
            
            if parsed_question:
                parsed_question['question_number'] = i + 1
                parsed_question['source_file'] = source_file
                parsed_question['processed_at'] = datetime.now(pytz.utc)
                questions.append(parsed_question)
            else:
                # If parsing fails, create a basic question
                questions.append({
                    'question_text': block[:200] + '...' if len(block) > 200 else block,
                    'correct_answer': 'Manual review required',
                    'question_type': 'Sentence',
                    'marks': 1,
                    'question_number': i + 1,
                    'source_file': source_file,
                    'processed_at': datetime.now(pytz.utc),
                    'needs_review': True
                })
        
        return questions
    
    def process_uploaded_file(self, file_path: str, file_type: str) -> Dict[str, Any]:
        """Process an uploaded file and return questions with metadata"""
        try:
            questions = []
            
            if file_type.lower() == 'text/plain' or file_path.endswith('.txt'):
                questions = self.process_text_file(file_path)
            elif file_type.lower() == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or file_path.endswith('.docx'):
                questions = self.process_docx_file(file_path)
            elif file_type.lower() == 'application/pdf' or file_path.endswith('.pdf'):
                questions = self.process_pdf_file(file_path)
            else:
                # Try as text file
                questions = self.process_text_file(file_path)
            
            # Generate processing summary
            question_types = {}
            for q in questions:
                q_type = q.get('question_type', 'Unknown')
                question_types[q_type] = question_types.get(q_type, 0) + 1
            
            return {
                'success': True,
                'questions': questions,
                'total_questions': len(questions),
                'question_types': question_types,
                'processing_status': 'completed',
                'processed_at': datetime.now(pytz.utc),
                'source_file': os.path.basename(file_path)
            }
            
        except Exception as e:
            logger.error(f"Error processing uploaded file {file_path}: {e}")
            return {
                'success': False,
                'error': str(e),
                'questions': [],
                'total_questions': 0,
                'processing_status': 'failed',
                'processed_at': datetime.now(pytz.utc)
            }

# Global instance
question_processor = QuestionProcessor()
