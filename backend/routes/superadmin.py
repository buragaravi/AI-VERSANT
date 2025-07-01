from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
import bcrypt
from mongo import mongo_db
from config.constants import ROLES, MODULES, LEVELS, TEST_TYPES
from datetime import datetime

superadmin_bp = Blueprint('superadmin', __name__)

# Define allowed admin roles
ALLOWED_ADMIN_ROLES = {ROLES['SUPER_ADMIN'], ROLES.get('CAMPUS_ADMIN'), ROLES.get('COURSE_ADMIN')}

@superadmin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    """Super admin dashboard overview"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user or user.get('role') not in ALLOWED_ADMIN_ROLES:
            return jsonify({
                'success': False,
                'message': 'Access denied. Admin privileges required.'
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
        
        if not user or user.get('role') not in ALLOWED_ADMIN_ROLES:
            return jsonify({
                'success': False,
                'message': 'Access denied. Admin privileges required.'
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
        
        if not user or user.get('role') not in ALLOWED_ADMIN_ROLES:
            return jsonify({
                'success': False,
                'message': 'Access denied. Admin privileges required.'
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
        
        if not user or user.get('role') not in ALLOWED_ADMIN_ROLES:
            return jsonify({
                'success': False,
                'message': 'Access denied. Admin privileges required.'
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
        
        if not user or user.get('role') not in ALLOWED_ADMIN_ROLES:
            return jsonify({
                'success': False,
                'message': 'Access denied. Admin privileges required.'
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
        
        if not user or user.get('role') not in ALLOWED_ADMIN_ROLES:
            return jsonify({
                'success': False,
                'message': 'Access denied. Admin privileges required.'
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

@superadmin_bp.route('/student-practice-results', methods=['GET'])
@jwt_required()
def get_student_practice_results():
    """Get detailed practice results for all students"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user or user.get('role') not in ALLOWED_ADMIN_ROLES:
            return jsonify({
                'success': False,
                'message': 'Access denied. Admin privileges required.'
            }), 403
        
        # Get query parameters
        module_filter = request.args.get('module')
        campus_filter = request.args.get('campus')
        student_filter = request.args.get('student')
        
        # Build match conditions
        match_conditions = {'test_type': 'practice'}
        if module_filter:
            match_conditions['module_id'] = module_filter
        
        pipeline = [
            {'$match': match_conditions},
            {
                '$lookup': {
                    'from': 'users',
                    'localField': 'student_id',
                    'foreignField': '_id',
                    'as': 'student_details'
                }
            },
            {'$unwind': '$student_details'},
            {
                '$lookup': {
                    'from': 'tests',
                    'localField': 'test_id',
                    'foreignField': '_id',
                    'as': 'test_details'
                }
            },
            {'$unwind': '$test_details'},
            {
                '$lookup': {
                    'from': 'students',
                    'localField': 'student_id',
                    'foreignField': 'user_id',
                    'as': 'student_profile'
                }
            },
            {'$unwind': '$student_profile'},
            {
                '$lookup': {
                    'from': 'campuses',
                    'localField': 'student_profile.campus_id',
                    'foreignField': '_id',
                    'as': 'campus_details'
                }
            },
            {'$unwind': '$campus_details'},
            {
                '$group': {
                    '_id': {
                        'student_id': '$student_id',
                        'module_id': '$test_details.module_id',
                        'subcategory': '$subcategory'
                    },
                    'student_name': {'$first': '$student_details.name'},
                    'student_email': {'$first': '$student_details.email'},
                    'campus_name': {'$first': '$campus_details.name'},
                    'module_name': {'$first': '$test_details.module_id'},
                    'subcategory_name': {'$first': '$subcategory'},
                    'total_attempts': {'$sum': 1},
                    'highest_score': {'$max': '$average_score'},
                    'average_score': {'$avg': '$average_score'},
                    'total_questions': {'$sum': '$total_questions'},
                    'total_correct': {'$sum': '$correct_answers'},
                    'last_attempt': {'$max': '$submitted_at'},
                    'attempts': {
                        '$push': {
                            'test_name': '$test_details.name',
                            'score': '$average_score',
                            'correct_answers': '$correct_answers',
                            'total_questions': '$total_questions',
                            'submitted_at': '$submitted_at',
                            'result_id': '$_id'
                        }
                    }
                }
            },
            {'$sort': {'student_name': 1, 'module_name': 1}}
        ]
        
        # Apply additional filters
        if campus_filter:
            pipeline.insert(0, {'$match': {'campus_name': campus_filter}})
        if student_filter:
            pipeline.insert(0, {'$match': {'$or': [
                {'student_name': {'$regex': student_filter, '$options': 'i'}},
                {'student_email': {'$regex': student_filter, '$options': 'i'}}
            ]}})
        
        results = list(mongo_db.db.test_results.aggregate(pipeline))
        
        # Process results
        for result in results:
            result['module_display_name'] = MODULES.get(result['module_name'], 'Unknown')
            result['accuracy'] = (result['total_correct'] / result['total_questions'] * 100) if result['total_questions'] > 0 else 0
            result['last_attempt'] = result['last_attempt'].isoformat() if result['last_attempt'] else None
            result['status'] = 'completed' if result['highest_score'] >= 60 else 'needs_improvement'
            
            # Sort attempts by date
            result['attempts'].sort(key=lambda x: x['submitted_at'], reverse=True)
            
            # Convert ObjectIds to strings
            for attempt in result['attempts']:
                attempt['result_id'] = str(attempt['result_id'])
                attempt['submitted_at'] = attempt['submitted_at'].isoformat()
        
        return jsonify({
            'success': True,
            'data': results
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get student practice results: {str(e)}'
        }), 500

# NEW ENDPOINT: Online results only
@superadmin_bp.route('/student-online-results', methods=['GET'])
@jwt_required()
def get_student_online_results():
    """Get detailed online exam results for all students"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user or user.get('role') not in ALLOWED_ADMIN_ROLES:
            return jsonify({
                'success': False,
                'message': 'Access denied. Admin privileges required.'
            }), 403
        
        # Get query parameters
        module_filter = request.args.get('module')
        campus_filter = request.args.get('campus')
        student_filter = request.args.get('student')
        
        # Build match conditions
        match_conditions = {'test_type': 'online'}
        if module_filter:
            match_conditions['module_id'] = module_filter
        
        pipeline = [
            {'$match': match_conditions},
            {
                '$lookup': {
                    'from': 'users',
                    'localField': 'student_id',
                    'foreignField': '_id',
                    'as': 'student_details'
                }
            },
            {'$unwind': '$student_details'},
            {
                '$lookup': {
                    'from': 'tests',
                    'localField': 'test_id',
                    'foreignField': '_id',
                    'as': 'test_details'
                }
            },
            {'$unwind': '$test_details'},
            {
                '$lookup': {
                    'from': 'students',
                    'localField': 'student_id',
                    'foreignField': 'user_id',
                    'as': 'student_profile'
                }
            },
            {'$unwind': '$student_profile'},
            {
                '$lookup': {
                    'from': 'campuses',
                    'localField': 'student_profile.campus_id',
                    'foreignField': '_id',
                    'as': 'campus_details'
                }
            },
            {'$unwind': '$campus_details'},
            {
                '$group': {
                    '_id': {
                        'student_id': '$student_id',
                        'module_id': '$test_details.module_id',
                        'subcategory': '$subcategory'
                    },
                    'student_name': {'$first': '$student_details.name'},
                    'student_email': {'$first': '$student_details.email'},
                    'campus_name': {'$first': '$campus_details.name'},
                    'module_name': {'$first': '$test_details.module_id'},
                    'subcategory_name': {'$first': '$subcategory'},
                    'total_attempts': {'$sum': 1},
                    'highest_score': {'$max': '$average_score'},
                    'average_score': {'$avg': '$average_score'},
                    'total_questions': {'$sum': '$total_questions'},
                    'total_correct': {'$sum': '$correct_answers'},
                    'last_attempt': {'$max': '$submitted_at'},
                    'attempts': {
                        '$push': {
                            'test_name': '$test_details.name',
                            'score': '$average_score',
                            'correct_answers': '$correct_answers',
                            'total_questions': '$total_questions',
                            'submitted_at': '$submitted_at',
                            'result_id': '$_id'
                        }
                    }
                }
            },
            {'$sort': {'student_name': 1, 'module_name': 1}}
        ]
        
        # Apply additional filters
        if campus_filter:
            pipeline.insert(0, {'$match': {'campus_name': campus_filter}})
        if student_filter:
            pipeline.insert(0, {'$match': {'$or': [
                {'student_name': {'$regex': student_filter, '$options': 'i'}},
                {'student_email': {'$regex': student_filter, '$options': 'i'}}
            ]}})
        
        results = list(mongo_db.db.test_results.aggregate(pipeline))
        
        # Process results
        for result in results:
            result['module_display_name'] = MODULES.get(result['module_name'], 'Unknown')
            result['accuracy'] = (result['total_correct'] / result['total_questions'] * 100) if result['total_questions'] > 0 else 0
            result['last_attempt'] = result['last_attempt'].isoformat() if result['last_attempt'] else None
            result['status'] = 'completed' if result['highest_score'] >= 60 else 'needs_improvement'
            
            # Sort attempts by date
            result['attempts'].sort(key=lambda x: x['submitted_at'], reverse=True)
            
            # Convert ObjectIds to strings
            for attempt in result['attempts']:
                attempt['result_id'] = str(attempt['result_id'])
                attempt['submitted_at'] = attempt['submitted_at'].isoformat()
        
        return jsonify({
            'success': True,
            'data': results
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get student online results: {str(e)}'
        }), 500

@superadmin_bp.route('/grammar-analytics', methods=['GET'])
@jwt_required()
def get_grammar_analytics():
    """Get detailed grammar practice analytics"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user or user.get('role') not in ALLOWED_ADMIN_ROLES:
            return jsonify({
                'success': False,
                'message': 'Access denied. Admin privileges required.'
            }), 403
        
        pipeline = [
            {
                '$match': {
                    'module_id': 'GRAMMAR',
                    'test_type': 'practice'
                }
            },
            {
                '$lookup': {
                    'from': 'tests',
                    'localField': 'test_id',
                    'foreignField': '_id',
                    'as': 'test_details'
                }
            },
            {'$unwind': '$test_details'},
            {
                '$group': {
                    '_id': '$subcategory',
                    'subcategory_name': {'$first': '$subcategory'},
                    'total_attempts': {'$sum': 1},
                    'total_students': {'$addToSet': '$student_id'},
                    'average_score': {'$avg': '$average_score'},
                    'highest_score': {'$max': '$average_score'},
                    'lowest_score': {'$min': '$average_score'},
                    'total_questions': {'$sum': '$total_questions'},
                    'total_correct': {'$sum': '$correct_answers'},
                    'completion_rate': {
                        '$avg': {
                            '$cond': [
                                {'$gte': ['$average_score', 60]},
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {'$sort': {'subcategory_name': 1}}
        ]
        
        results = list(mongo_db.db.test_results.aggregate(pipeline))
        
        # Process results
        for result in results:
            result['subcategory_display_name'] = GRAMMAR_CATEGORIES.get(result['subcategory_name'], result['subcategory_name'])
            result['total_students'] = len(result['total_students'])
            result['accuracy'] = (result['total_correct'] / result['total_questions'] * 100) if result['total_questions'] > 0 else 0
            result['completion_rate'] = result['completion_rate'] * 100
        
        return jsonify({
            'success': True,
            'data': results
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get grammar analytics: {str(e)}'
        }), 500

@superadmin_bp.route('/vocabulary-analytics', methods=['GET'])
@jwt_required()
def get_vocabulary_analytics():
    """Get detailed vocabulary practice analytics"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user or user.get('role') not in ALLOWED_ADMIN_ROLES:
            return jsonify({
                'success': False,
                'message': 'Access denied. Admin privileges required.'
            }), 403
        
        pipeline = [
            {
                '$match': {
                    'module_id': 'VOCABULARY',
                    'test_type': 'practice'
                }
            },
            {
                '$lookup': {
                    'from': 'tests',
                    'localField': 'test_id',
                    'foreignField': '_id',
                    'as': 'test_details'
                }
            },
            {'$unwind': '$test_details'},
            {
                '$group': {
                    '_id': '$test_details.level_id',
                    'level_name': {'$first': '$test_details.level_id'},
                    'total_attempts': {'$sum': 1},
                    'total_students': {'$addToSet': '$student_id'},
                    'average_score': {'$avg': '$average_score'},
                    'highest_score': {'$max': '$average_score'},
                    'lowest_score': {'$min': '$average_score'},
                    'total_questions': {'$sum': '$total_questions'},
                    'total_correct': {'$sum': '$correct_answers'},
                    'completion_rate': {
                        '$avg': {
                            '$cond': [
                                {'$gte': ['$average_score', 60]},
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {'$sort': {'level_name': 1}}
        ]
        
        results = list(mongo_db.db.test_results.aggregate(pipeline))
        
        # Process results
        for result in results:
            result['level_display_name'] = LEVELS.get(result['level_name'], result['level_name'])
            result['total_students'] = len(result['total_students'])
            result['accuracy'] = (result['total_correct'] / result['total_questions'] * 100) if result['total_questions'] > 0 else 0
            result['completion_rate'] = result['completion_rate'] * 100
        
        return jsonify({
            'success': True,
            'data': results
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get vocabulary analytics: {str(e)}'
        }), 500

@superadmin_bp.route('/practice-overview', methods=['GET'])
@jwt_required()
def get_practice_overview():
    """Get overview of all practice module usage"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        
        if not user or user.get('role') not in ALLOWED_ADMIN_ROLES:
            return jsonify({
                'success': False,
                'message': 'Access denied. Admin privileges required.'
            }), 403
        
        # Overall statistics
        total_practice_tests = mongo_db.db.test_results.count_documents({'test_type': 'practice'})
        total_students_practicing = len(mongo_db.db.test_results.distinct('student_id', {'test_type': 'practice'}))
        
        # Module-wise statistics
        pipeline = [
            {'$match': {'test_type': 'practice'}},
            {
                '$lookup': {
                    'from': 'tests',
                    'localField': 'test_id',
                    'foreignField': '_id',
                    'as': 'test_details'
                }
            },
            {'$unwind': '$test_details'},
            {
                '$group': {
                    '_id': '$test_details.module_id',
                    'module_name': {'$first': '$test_details.module_id'},
                    'total_attempts': {'$sum': 1},
                    'unique_students': {'$addToSet': '$student_id'},
                    'average_score': {'$avg': '$average_score'},
                    'completion_rate': {
                        '$avg': {
                            '$cond': [
                                {'$gte': ['$average_score', 60]},
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]
        
        module_stats = list(mongo_db.db.test_results.aggregate(pipeline))
        
        # Process module statistics
        for stat in module_stats:
            stat['module_display_name'] = MODULES.get(stat['module_name'], 'Unknown')
            stat['unique_students'] = len(stat['unique_students'])
            stat['completion_rate'] = stat['completion_rate'] * 100
        
        overview = {
            'total_practice_tests': total_practice_tests,
            'total_students_practicing': total_students_practicing,
            'modules': module_stats
        }
        
        return jsonify({
            'success': True,
            'data': overview
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get practice overview: {str(e)}'
        }), 500

@superadmin_bp.route('/student-assigned-modules', methods=['GET'])
@jwt_required()
def get_student_assigned_modules():
    """Get all tests assigned to a student, with attempt data if available, or status 'Pending' if not attempted. Each test is a separate row."""
    try:
        student_email = request.args.get('student')
        batch_id = request.args.get('batch')
        if not student_email or not batch_id:
            return jsonify({'success': False, 'message': 'Missing student email or batch id'}), 400

        # Find the student user and student profile
        user = mongo_db.users.find_one({'email': student_email})
        student = mongo_db.students.find_one({'user_id': user['_id']}) if user else None
        if not user or not student:
            return jsonify({'success': False, 'message': 'Student not found'}), 404

        # Get all tests assigned to this batch, campus, or course
        assigned_tests = list(mongo_db.tests.find({
            'test_type': 'practice',
            '$or': [
                {'batch_ids': ObjectId(batch_id)},
                {'campus_ids': student['campus_id']},
                {'course_ids': student['course_id']}
            ]
        }))

        # Get all attempts/results for this student
        attempts = list(mongo_db.db.test_results.find({
            'student_id': user['_id'],
            'test_type': 'practice'
        }))
        # Map attempts by test_id
        attempts_by_test = {}
        for att in attempts:
            tid = att.get('test_id')
            if tid not in attempts_by_test:
                attempts_by_test[tid] = []
            attempts_by_test[tid].append(att)

        # Merge: for each assigned test, show attempt data if exists, else Pending
        result = []
        for idx, test in enumerate(assigned_tests):
            tid = test['_id']
            test_name = test.get('name') or f"Test {idx+1}"
            test_info = {
                'test_id': str(tid),
                'test_name': test_name,
                'module_id': str(test['module_id']),
                'module_display_name': MODULES.get(test['module_id'], 'Unknown'),
                'level_id': test.get('level_id'),
                'level_display_name': LEVELS.get(test.get('level_id'), 'Unknown'),
                'assigned': True
            }
            if tid in attempts_by_test:
                # There are attempts for this test
                test_attempts = attempts_by_test[tid]
                scores = [att.get('average_score', 0) for att in test_attempts]
                test_info['status'] = 'completed'
                test_info['attempts'] = [
                    {
                        'score': att.get('average_score', 0),
                        'correct_answers': att.get('correct_answers', 0),
                        'total_questions': att.get('total_questions', 0),
                        'submitted_at': att.get('submitted_at').isoformat() if att.get('submitted_at') else None,
                        'result_id': str(att.get('_id'))
                    }
                    for att in test_attempts
                ]
                test_info['total_attempts'] = len(test_attempts)
                test_info['best_score'] = max(scores) if scores else 0
                test_info['avg_score'] = sum(scores)/len(scores) if scores else 0
            else:
                test_info['status'] = 'pending'
                test_info['attempts'] = []
                test_info['total_attempts'] = 0
                test_info['best_score'] = 0
                test_info['avg_score'] = 0
            result.append(test_info)

        return jsonify({'success': True, 'data': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to get assigned modules: {str(e)}'}), 500

@superadmin_bp.route('/student-modules', methods=['GET'])
@jwt_required()
def get_student_modules():
    """Get all available practice modules for a student (by email or roll number, admin roles only)."""
    try:
        current_user_id = get_jwt_identity()
        user = mongo_db.find_user_by_id(current_user_id)
        allowed_roles = ['super_admin', 'campus_admin', 'course_admin']
        if not user or user.get('role') not in allowed_roles:
            return jsonify({'success': False, 'message': 'Access denied. Admin privileges required.'}), 403
        roll_number = request.args.get('roll_number')
        student_email = request.args.get('student_email') or request.headers.get('X-Student-Email')
        student_user = None
        if roll_number:
            student = mongo_db.students.find_one({'roll_number': roll_number})
            if student:
                student_user = mongo_db.users.find_one({'_id': student['user_id']})
        if not student_user and student_email:
            student_user = mongo_db.users.find_one({'email': student_email})
        if not student_user:
            return jsonify({'success': False, 'message': 'Student not found.'}), 404
        # Use the same logic as /student/modules
        priority_order = ['GRAMMAR', 'VOCABULARY']
        all_modules = [{'id': key, 'name': value} for key, value in MODULES.items()]
        priority_modules = [m for m in all_modules if m['id'] in priority_order]
        other_modules = [m for m in all_modules if m['id'] not in priority_order]
        priority_modules.sort(key=lambda m: priority_order.index(m['id']))
        final_module_list = []
        for m in priority_modules:
            final_module_list.append({**m, 'locked': False})
        for m in other_modules:
            final_module_list.append({**m, 'locked': True})
        return jsonify({'success': True, 'data': final_module_list})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Could not load modules: {str(e)}'}), 500

@superadmin_bp.route('/batch/<batch_id>/course/<course_id>/module/upload', methods=['POST'])
@jwt_required()
def upload_module_to_batch_course(batch_id, course_id):
    # Only admin roles
    current_user_id = get_jwt_identity()
    user = mongo_db.find_user_by_id(current_user_id)
    if not user or user.get('role') not in ALLOWED_ADMIN_ROLES:
        return jsonify({'success': False, 'message': 'Access denied. Admin privileges required.'}), 403
    # Find or create batch_course_instance
    instance_id = mongo_db.find_or_create_batch_course_instance(ObjectId(batch_id), ObjectId(course_id))
    # Get module data from request
    module_data = request.get_json()
    module_data['batch_course_instance_id'] = instance_id
    # Insert module (assume modules collection)
    result = mongo_db.modules.insert_one(module_data)
    return jsonify({'success': True, 'message': 'Module uploaded', 'module_id': str(result.inserted_id), 'batch_course_instance_id': str(instance_id)}), 201

# Update result fetching endpoint to filter by batch_course_instance_id
@superadmin_bp.route('/batch-course/<instance_id>/module/results', methods=['GET'])
@jwt_required()
def get_module_results_by_instance(instance_id):
    # Only admin roles
    current_user_id = get_jwt_identity()
    user = mongo_db.find_user_by_id(current_user_id)
    if not user or user.get('role') not in ALLOWED_ADMIN_ROLES:
        return jsonify({'success': False, 'message': 'Access denied. Admin privileges required.'}), 403
    # Fetch results for this batch_course_instance_id
    results = list(mongo_db.db.test_results.find({'batch_course_instance_id': ObjectId(instance_id)}))
    for r in results:
        r['_id'] = str(r['_id'])
    return jsonify({'success': True, 'data': results}), 200

@superadmin_bp.route('/superadmin/batch-course-instance', methods=['POST'])
@jwt_required()
def get_or_create_batch_course_instance():
    data = request.get_json()
    batch_id = data.get('batch_id')
    course_id = data.get('course_id')
    if not batch_id or not course_id:
        return jsonify({'success': False, 'message': 'Missing batch_id or course_id'}), 400
    instance_id = mongo_db.find_or_create_batch_course_instance(ObjectId(batch_id), ObjectId(course_id))
    return jsonify({'success': True, 'instance_id': str(instance_id)}), 200

@superadmin_bp.route('/migrate-batch-course-instances', methods=['POST'])
@jwt_required()
def migrate_batch_course_instances():
    # Only super admin
    current_user_id = get_jwt_identity()
    user = mongo_db.find_user_by_id(current_user_id)
    if not user or user.get('role') != ROLES['SUPER_ADMIN']:
        return jsonify({'success': False, 'message': 'Access denied. Super admin privileges required.'}), 403
    # Migrate students
    students = list(mongo_db.students.find())
    updated_students = 0
    for s in students:
        batch_id = s.get('batch_id')
        course_id = s.get('course_id')
        if batch_id and course_id:
            instance_id = mongo_db.find_or_create_batch_course_instance(batch_id, course_id)
            mongo_db.students.update_one({'_id': s['_id']}, {'$set': {'batch_course_instance_id': instance_id}})
            updated_students += 1
    # Migrate modules
    modules = list(mongo_db.modules.find())
    updated_modules = 0
    for m in modules:
        batch_id = m.get('batch_id')
        course_id = m.get('course_id')
        if batch_id and course_id:
            instance_id = mongo_db.find_or_create_batch_course_instance(batch_id, course_id)
            mongo_db.modules.update_one({'_id': m['_id']}, {'$set': {'batch_course_instance_id': instance_id}})
            updated_modules += 1
    # Migrate test_results
    results = list(mongo_db.db.test_results.find())
    updated_results = 0
    for r in results:
        batch_id = r.get('batch_id')
        course_id = r.get('course_id')
        if batch_id and course_id:
            instance_id = mongo_db.find_or_create_batch_course_instance(batch_id, course_id)
            mongo_db.db.test_results.update_one({'_id': r['_id']}, {'$set': {'batch_course_instance_id': instance_id}})
            updated_results += 1
    return jsonify({'success': True, 'students_updated': updated_students, 'modules_updated': updated_modules, 'results_updated': updated_results}), 200 