# User Roles
ROLES = {
    'SUPER_ADMIN': 'superadmin',
    'CAMPUS_ADMIN': 'campus_admin',
    'COURSE_ADMIN': 'course_admin',
    'STUDENT': 'student'
}

# Test Categories
TEST_CATEGORIES = {
    'CRT': 'Campus Recruitment Test',
    'VERSANT': 'Versant Language Assessment'
}

# Test Modules
MODULES = {
    'LISTENING': 'Listening',
    'SPEAKING': 'Speaking',
    'READING': 'Reading',
    'WRITING': 'Writing',
    'GRAMMAR': 'Grammar',
    'VOCABULARY': 'Vocabulary',
    'CRT_APTITUDE': 'Aptitude',
    'CRT_REASONING': 'Reasoning',
    'CRT_TECHNICAL': 'Technical'
}

# Module Categories
MODULE_CATEGORIES = {
    'CRT': ['CRT_APTITUDE', 'CRT_REASONING', 'CRT_TECHNICAL'],
    'VERSANT': ['GRAMMAR', 'VOCABULARY', 'READING', 'LISTENING', 'SPEAKING', 'WRITING']
}

# Grammar Subcategories
GRAMMAR_CATEGORIES = {
    'NOUN': 'Noun',
    'PRONOUN': 'Pronoun',
    'ADJECTIVE': 'Adjective',
    'VERB': 'Verb',
    'ADVERB': 'Adverb',
    'CONJUNCTION': 'Conjunction',
    'QUESTION_TAG': 'Question Tag',
    'PHRASE': 'Phrase',
    'PHRASAL_VERB': 'Phrasal Verb',
    'ARTICLE': 'Article',
    'TENSE': 'Tense',
    'PREPOSITION': 'Preposition'
}

# CRT Subcategories
CRT_CATEGORIES = {
    'APTITUDE': 'Aptitude',
    'REASONING': 'Reasoning',
    'TECHNICAL': 'Technical'
}

# Difficulty Levels
LEVELS = {
    # Listening
    'LISTENING_BEGINNER': {'name': 'Beginner', 'module_id': 'LISTENING', 'order': 1, 'unlock_threshold': 0},
    'LISTENING_INTERMEDIATE': {'name': 'Intermediate', 'module_id': 'LISTENING', 'order': 2, 'unlock_threshold': 60, 'depends_on': 'LISTENING_BEGINNER'},
    'LISTENING_ADVANCED': {'name': 'Advanced', 'module_id': 'LISTENING', 'order': 3, 'unlock_threshold': 60, 'depends_on': 'LISTENING_INTERMEDIATE'},
    # Speaking
    'SPEAKING_BEGINNER': {'name': 'Beginner', 'module_id': 'SPEAKING', 'order': 1, 'unlock_threshold': 0},
    'SPEAKING_INTERMEDIATE': {'name': 'Intermediate', 'module_id': 'SPEAKING', 'order': 2, 'unlock_threshold': 60, 'depends_on': 'SPEAKING_BEGINNER'},
    'SPEAKING_ADVANCED': {'name': 'Advanced', 'module_id': 'SPEAKING', 'order': 3, 'unlock_threshold': 60, 'depends_on': 'SPEAKING_INTERMEDIATE'},
    # Reading
    'READING_BEGINNER': {'name': 'Beginner', 'module_id': 'READING', 'order': 1, 'unlock_threshold': 0},
    'READING_INTERMEDIATE': {'name': 'Intermediate', 'module_id': 'READING', 'order': 2, 'unlock_threshold': 60, 'depends_on': 'READING_BEGINNER'},
    'READING_ADVANCED': {'name': 'Advanced', 'module_id': 'READING', 'order': 3, 'unlock_threshold': 60, 'depends_on': 'READING_INTERMEDIATE'},
    # Writing
    'WRITING_BEGINNER': {'name': 'Beginner', 'module_id': 'WRITING', 'order': 1, 'unlock_threshold': 0},
    'WRITING_INTERMEDIATE': {'name': 'Intermediate', 'module_id': 'WRITING', 'order': 2, 'unlock_threshold': 60, 'depends_on': 'WRITING_BEGINNER'},
    'WRITING_ADVANCED': {'name': 'Advanced', 'module_id': 'WRITING', 'order': 3, 'unlock_threshold': 60, 'depends_on': 'WRITING_INTERMEDIATE'},
    # Vocabulary
    'VOCABULARY_BEGINNER': {'name': 'Beginner', 'module_id': 'VOCABULARY', 'order': 1, 'unlock_threshold': 0},
    'VOCABULARY_INTERMEDIATE': {'name': 'Intermediate', 'module_id': 'VOCABULARY', 'order': 2, 'unlock_threshold': 60, 'depends_on': 'VOCABULARY_BEGINNER'},
    'VOCABULARY_ADVANCED': {'name': 'Advanced', 'module_id': 'VOCABULARY', 'order': 3, 'unlock_threshold': 60, 'depends_on': 'VOCABULARY_INTERMEDIATE'},
    # Grammar (categories as levels)
}
# Grammar levels with proper ordering and dependencies
grammar_levels = {
    'GRAMMAR_NOUN': {'name': 'Noun', 'module_id': 'GRAMMAR', 'order': 1, 'unlock_threshold': 0},
    'GRAMMAR_PRONOUN': {'name': 'Pronoun', 'module_id': 'GRAMMAR', 'order': 2, 'unlock_threshold': 60, 'depends_on': 'GRAMMAR_NOUN'},
    'GRAMMAR_ADJECTIVE': {'name': 'Adjective', 'module_id': 'GRAMMAR', 'order': 3, 'unlock_threshold': 60, 'depends_on': 'GRAMMAR_PRONOUN'},
    'GRAMMAR_VERB': {'name': 'Verb', 'module_id': 'GRAMMAR', 'order': 4, 'unlock_threshold': 60, 'depends_on': 'GRAMMAR_ADJECTIVE'},
    'GRAMMAR_ADVERB': {'name': 'Adverb', 'module_id': 'GRAMMAR', 'order': 5, 'unlock_threshold': 60, 'depends_on': 'GRAMMAR_VERB'},
    'GRAMMAR_CONJUNCTION': {'name': 'Conjunction', 'module_id': 'GRAMMAR', 'order': 6, 'unlock_threshold': 60, 'depends_on': 'GRAMMAR_ADVERB'},
    'GRAMMAR_QUESTION_TAG': {'name': 'Question Tag', 'module_id': 'GRAMMAR', 'order': 7, 'unlock_threshold': 60, 'depends_on': 'GRAMMAR_CONJUNCTION'},
    'GRAMMAR_PHRASE': {'name': 'Phrase', 'module_id': 'GRAMMAR', 'order': 8, 'unlock_threshold': 60, 'depends_on': 'GRAMMAR_QUESTION_TAG'},
    'GRAMMAR_PHRASAL_VERB': {'name': 'Phrasal Verb', 'module_id': 'GRAMMAR', 'order': 9, 'unlock_threshold': 60, 'depends_on': 'GRAMMAR_PHRASE'},
    'GRAMMAR_ARTICLE': {'name': 'Article', 'module_id': 'GRAMMAR', 'order': 10, 'unlock_threshold': 60, 'depends_on': 'GRAMMAR_PHRASAL_VERB'},
    'GRAMMAR_TENSE': {'name': 'Tense', 'module_id': 'GRAMMAR', 'order': 11, 'unlock_threshold': 60, 'depends_on': 'GRAMMAR_ARTICLE'},
    'GRAMMAR_PREPOSITION': {'name': 'Preposition', 'module_id': 'GRAMMAR', 'order': 12, 'unlock_threshold': 60, 'depends_on': 'GRAMMAR_TENSE'},
}
LEVELS.update(grammar_levels)

# CRT (categories as levels)
LEVELS.update({
    f'CRT_{cat_id}': {'name': cat_name, 'module_id': f'CRT_{cat_id}'}
    for cat_id, cat_name in CRT_CATEGORIES.items()
})

# Test Types
TEST_TYPES = {
    'PRACTICE': 'practice',
    'ONLINE_EXAM': 'online_exam'
}

# Question Types
QUESTION_TYPES = {
    'AUDIO': 'audio',
    'MCQ': 'mcq',
    'SENTENCE': 'sentence',
    'PARAGRAPH': 'paragraph'
}

# Audio Generation Configuration
AUDIO_GENERATION_CONFIG = {
    'MAX_RETRIES': 3,
    'MAX_CONCURRENT_REQUESTS': 5  # Allow multiple concurrent requests for efficiency
}

# Status Values
STATUS = {
    'ACTIVE': 'active',
    'INACTIVE': 'inactive',
    'PENDING': 'pending',
    'COMPLETED': 'completed',
    'SCHEDULED': 'scheduled'
}

# JWT Configuration
JWT_ACCESS_TOKEN_EXPIRES = 3600  # 1 hour
JWT_REFRESH_TOKEN_EXPIRES = 86400  # 24 hours

# Writing Module Configuration
WRITING_CONFIG = {
    'MIN_CHARACTERS': 200,
    'MAX_CHARACTERS': 400,
    'MIN_WORDS': 80,
    'MAX_WORDS': 120,
    'MIN_SENTENCES': 5,
    'MAX_SENTENCES': 8
}

# File Upload Limits
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_AUDIO_EXTENSIONS = {'mp3', 'wav', 'm4a', 'ogg'}
ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif'}

# Pagination
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# Test Configuration
DEFAULT_TEST_DURATION = 30  # minutes
DEFAULT_PASSING_SCORE = 70  # percentage 