from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import os
from dotenv import load_dotenv
from config.database_simple import DatabaseConfig, init_db
from config.aws_config import init_aws
from config.constants import JWT_ACCESS_TOKEN_EXPIRES, JWT_REFRESH_TOKEN_EXPIRES
from config.shared import bcrypt
from socketio_instance import socketio

load_dotenv()

def create_app():
    """Create and configure Flask application"""
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
    
    # CORS configuration with Vercel domain included
    # IMPORTANT: Set CORS_ORIGINS in your environment variables to include your frontend URL, e.g.:
    # CORS_ORIGINS=https://pydah-ai-versant.vercel.app,http://localhost:3000
    default_origins = 'http://localhost:3000,http://localhost:5173,https://pydah-ai-versant.vercel.app'
    cors_origins = os.getenv('CORS_ORIGINS', default_origins)
    CORS(app, origins=cors_origins.split(','), supports_credentials=True, allow_headers=["Content-Type", "Authorization"])
    
    # Initialize database and AWS with error handling
    try:
        print("🔄 Initializing database connection...")
        init_db()
        print("✅ Database initialized successfully")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        print("💡 Please check your MongoDB connection and try again")
        # Don't raise the exception to allow the app to start for debugging
    
    try:
        init_aws()
        print("✅ AWS initialized successfully")
    except Exception as e:
        print(f"⚠️ AWS initialization failed: {e}")
    
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
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'message': 'VERSANT API is running'}
    
    # Email status endpoint
    @app.route('/email-status')
    def email_status():
        from utils.email_service import get_email_status
        return get_email_status()
    
    # Root endpoint
    @app.route('/')
    def root():
        return {
            'message': 'Welcome to VERSANT English Language Testing System API',
            'version': '1.0.0',
            'status': 'active'
        }
    
    # Add custom error handler for JWT errors
    @jwt.unauthorized_loader
    def custom_unauthorized_response(callback):
        import sys
        print('JWT unauthorized_loader:', callback, file=sys.stderr)
        return {'success': False, 'message': callback}, 401

    @jwt.invalid_token_loader
    def custom_invalid_token_response(callback):
        import sys
        print('JWT invalid_token_loader:', callback, file=sys.stderr)
        return {'success': False, 'message': callback}, 422

    @jwt.expired_token_loader
    def custom_expired_token_response(jwt_header, jwt_payload):
        import sys
        print('JWT expired_token_loader', file=sys.stderr)
        return {'success': False, 'message': 'Token has expired'}, 401

    @jwt.revoked_token_loader
    def custom_revoked_token_response(jwt_header, jwt_payload):
        import sys
        print('JWT revoked_token_loader', file=sys.stderr)
        return {'success': False, 'message': 'Token has been revoked'}, 401
    
    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    print(f"🚀 Starting VERSANT API on port {port}")
    print(f"🔧 Debug mode: {debug}")
    
    socketio.run(app, host='0.0.0.0', port=port, debug=debug) 