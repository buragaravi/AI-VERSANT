import os
from flask import Flask, jsonify
from socketio_instance import socketio
from config.shared import bcrypt
from config.constants import JWT_ACCESS_TOKEN_EXPIRES, JWT_REFRESH_TOKEN_EXPIRES
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv
from scheduler import schedule_daily_notifications

load_dotenv()

app = Flask(__name__)

# Configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'versant_jwt_secret_key_2024_secure_and_unique')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = JWT_ACCESS_TOKEN_EXPIRES
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = JWT_REFRESH_TOKEN_EXPIRES
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'

# Initialize extensions
jwt = JWTManager(app)
bcrypt.init_app(app)
socketio.init_app(app)

# CORS configuration
CORS(app, origins=os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173,https://pydah-ai-versant.vercel.app').split(','), supports_credentials=True, allow_headers=["Content-Type", "Authorization"])

# Root route for API status
@app.route('/')
def api_status():
    """API status endpoint"""
    return jsonify({
        'success': True,
        'message': 'AI Versant Backend API is running',
        'version': '1.0.0',
        'status': 'active',
        'endpoints': {
            'auth': '/auth',
            'superadmin': '/superadmin',
            'campus_admin': '/campus-admin',
            'course_admin': '/course-admin',
            'student': '/student',
            'test_management': '/test-management',
            'user_management': '/user-management',
            'analytics': '/analytics',
            'campus_management': '/campus-management',
            'course_management': '/course-management',
            'batch_management': '/batch-management',
            'access_control': '/access-control'
        }
    }), 200

# Health check endpoint
@app.route('/health')
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({
        'success': True,
        'status': 'healthy',
        'timestamp': '2024-01-01T00:00:00Z'
    }), 200

# Register blueprints
from routes.auth import auth_bp
from routes.superadmin import superadmin_bp
from routes.campus_admin import campus_admin_bp
from routes.course_admin import course_admin_bp
from routes.student import student_bp
from routes.test_management import test_management_bp
from routes.practice_management import practice_management_bp
from routes.online_exam_management import online_exam_management_bp
from routes.user_management import user_management_bp
from routes.analytics import analytics_bp
from routes.campus_management import campus_management_bp
from routes.course_management import course_management_bp
from routes.batch_management import batch_management_bp
from routes.access_control import access_control_bp

# Register modular test management blueprints
from routes.test_management_mcq import mcq_test_bp
from routes.test_management_audio import audio_test_bp
from routes.test_management_writing import writing_test_bp
from routes.test_management_technical import technical_test_bp

app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(superadmin_bp, url_prefix='/superadmin')
app.register_blueprint(campus_admin_bp, url_prefix='/campus-admin')
app.register_blueprint(course_admin_bp, url_prefix='/course-admin')
app.register_blueprint(student_bp, url_prefix='/student')
app.register_blueprint(test_management_bp, url_prefix='/test-management')
app.register_blueprint(practice_management_bp, url_prefix='/practice-management')
app.register_blueprint(online_exam_management_bp, url_prefix='/online-exam-management')
app.register_blueprint(user_management_bp, url_prefix='/user-management')
app.register_blueprint(analytics_bp, url_prefix='/analytics')
app.register_blueprint(campus_management_bp, url_prefix='/campus-management')
app.register_blueprint(course_management_bp, url_prefix='/course-management')
app.register_blueprint(batch_management_bp, url_prefix='/batch-management')
app.register_blueprint(access_control_bp, url_prefix='/access-control')

# Register modular test management blueprints
app.register_blueprint(mcq_test_bp, url_prefix='/test-management/mcq')
app.register_blueprint(audio_test_bp, url_prefix='/test-management/audio')
app.register_blueprint(writing_test_bp, url_prefix='/test-management/writing')
app.register_blueprint(technical_test_bp, url_prefix='/test-management/technical')

print("=== Registered Routes ===")
for rule in app.url_map.iter_rules():
    print(rule)
print("=========================")

# Initialize the scheduler for daily notifications
schedule_daily_notifications(app)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    socketio.run(app, host="0.0.0.0", port=port) 