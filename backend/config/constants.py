# User Roles
ROLES = {
    'SUPER_ADMIN': 'super_admin',
    'CAMPUS_ADMIN': 'campus_admin',
    'COURSE_ADMIN': 'course_admin',
    'STUDENT': 'student'
}

# Test Modules
MODULES = {
    'LISTENING': 'Listening',
    'SPEAKING': 'Speaking',
    'READING': 'Reading',
    'WRITING': 'Writing'
}

# Difficulty Levels
LEVELS = {
    'BEGINNER': 'Beginner',
    'INTERMEDIATE': 'Intermediate',
    'ADVANCED': 'Advanced'
}

# Test Types
TEST_TYPES = {
    'PRACTICE': 'practice',
    'ONLINE_EXAM': 'online_exam'
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