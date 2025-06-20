from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
import bcrypt
from mongo import mongo_db
from config.constants import ROLES, MODULES, LEVELS, TEST_TYPES
from datetime import datetime

superadmin_bp = Blueprint('superadmin', __name__)

@superadmin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    """Super admin dashboard overview"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user or user.get('role') != ROLES['SUPER_ADMIN']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Super admin privileges required.'
            }), 403
        
        total_users = mongo_db.users.count_documents({})
        total_students = mongo_db.students.count_documents({})
        total_tests = mongo_db.tests.count_documents({})
        
        dashboard_data = {
            'statistics': {
                'total_users': total_users,
                'total_students': total_students,
                'total_tests': total_tests
            }
        }
        
        return jsonify({
            'success': True,
            'message': 'Dashboard data retrieved successfully',
            'data': dashboard_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get dashboard data: {str(e)}'
        }), 500

@superadmin_bp.route('/users', methods=['POST'])
@jwt_required()
def create_user():
    """Create a new user"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user or user.get('role') != ROLES['SUPER_ADMIN']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Super admin privileges required.'
            }), 403
        
        data = request.get_json()
        
        if not all(key in data for key in ['username', 'email', 'password', 'role', 'name']):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        # Check if username exists
        if mongo_db.find_user_by_username(data['username']):
            return jsonify({
                'success': False,
                'message': 'Username already exists'
            }), 400
        
        # Hash password
        password_hash = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        
        # Create user
        user_data = {
            'username': data['username'],
            'email': data['email'],
            'password_hash': password_hash.decode('utf-8'),
            'role': data['role'],
            'name': data['name'],
            'mobile': data.get('mobile', ''),
            'is_active': True,
            'created_at': datetime.utcnow()
        }
        
        user_id = mongo_db.insert_user(user_data)
        
        return jsonify({
            'success': True,
            'message': 'User created successfully',
            'data': {'user_id': user_id}
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to create user: {str(e)}'
        }), 500

@superadmin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    """Get all users"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user or user.get('role') != ROLES['SUPER_ADMIN']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Super admin privileges required.'
            }), 403
        
        users = list(mongo_db.users.find().sort('created_at', -1))
        
        users_data = []
        for user in users:
            users_data.append({
                'id': str(user['_id']),
                'username': user['username'],
                'email': user['email'],
                'name': user['name'],
                'role': user['role'],
                'is_active': user.get('is_active', True)
            })
        
        return jsonify({
            'success': True,
            'message': 'Users retrieved successfully',
            'data': users_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get users: {str(e)}'
        }), 500

@superadmin_bp.route('/tests', methods=['POST'])
@jwt_required()
def create_test():
    """Create a new test"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user or user.get('role') != ROLES['SUPER_ADMIN']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Super admin privileges required.'
            }), 403
        
        data = request.get_json()
        required_fields = ['name', 'module_id', 'level_id', 'test_type']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'{field} is required'
                }), 400
        
        # Create test object
        test = Test(
            name=data['name'],
            module_id=data['module_id'],
            level_id=data['level_id'],
            created_by=current_user_id,
            test_type=data['test_type'],
            total_questions=data.get('total_questions', 0),
            time_limit=data.get('time_limit', 30),
            passing_score=data.get('passing_score', 70)
        )
        
        # Insert test
        test_id = mongo_db.insert_test(test.to_dict())
        
        return jsonify({
            'success': True,
            'message': 'Test created successfully',
            'data': {'test_id': test_id}
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to create test: {str(e)}'
        }), 500

@superadmin_bp.route('/tests', methods=['GET'])
@jwt_required()
def get_tests():
    """Get all tests with pagination"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user or user.get('role') != ROLES['SUPER_ADMIN']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Super admin privileges required.'
            }), 403
        
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        module_id = request.args.get('module_id')
        level_id = request.args.get('level_id')
        test_type = request.args.get('test_type')
        
        # Build query
        query = {}
        if module_id:
            query['module_id'] = ObjectId(module_id)
        if level_id:
            query['level_id'] = ObjectId(level_id)
        if test_type:
            query['test_type'] = test_type
        
        # Get total count
        total = mongo_db.tests.count_documents(query)
        
        # Get tests with pagination
        skip = (page - 1) * limit
        tests = list(mongo_db.tests.find(query).skip(skip).limit(limit).sort('created_at', -1))
        
        # Format response
        tests_data = []
        for test in tests:
            tests_data.append({
                'id': str(test['_id']),
                'name': test['name'],
                'module_id': str(test['module_id']),
                'level_id': str(test['level_id']),
                'test_type': test['test_type'],
                'status': test['status'],
                'total_questions': test['total_questions'],
                'time_limit': test['time_limit'],
                'passing_score': test['passing_score'],
                'created_at': test['created_at']
            })
        
        return jsonify({
            'success': True,
            'message': 'Tests retrieved successfully',
            'data': {
                'tests': tests_data,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'pages': (total + limit - 1) // limit
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get tests: {str(e)}'
        }), 500

@superadmin_bp.route('/online-exams', methods=['POST'])
@jwt_required()
def create_online_exam():
    """Create a new online exam"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user or user.get('role') != ROLES['SUPER_ADMIN']:
            return jsonify({
                'success': False,
                'message': 'Access denied. Super admin privileges required.'
            }), 403
        
        data = request.get_json()
        required_fields = ['test_id', 'name', 'start_date', 'end_date', 'duration']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'{field} is required'
                }), 400
        
        # Create online exam object
        exam = OnlineExam(
            test_id=data['test_id'],
            name=data['name'],
            start_date=data['start_date'],
            end_date=data['end_date'],
            duration=data['duration'],
            campus_ids=data.get('campus_ids', []),
            course_ids=data.get('course_ids', []),
            batch_ids=data.get('batch_ids', []),
            created_by=current_user_id
        )
        
        # Insert exam
        exam_id = mongo_db.online_exams.insert_one(exam.to_dict()).inserted_id
        
        return jsonify({
            'success': True,
            'message': 'Online exam created successfully',
            'data': {'exam_id': str(exam_id)}
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to create online exam: {str(e)}'
        }), 500 