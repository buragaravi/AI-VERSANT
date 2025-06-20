from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from mongo import mongo_db
from bson import ObjectId
import pandas as pd
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash
import io
from datetime import datetime

batch_management_bp = Blueprint('batch_management', __name__)

@batch_management_bp.route('/', methods=['GET'])
@jwt_required()
def list_batches():
    batches = list(mongo_db.batches.find())
    batch_list = []
    for batch in batches:
        campus_objs = list(mongo_db.campuses.find({'_id': {'$in': batch.get('campus_ids', [])}}))
        course_objs = list(mongo_db.courses.find({'_id': {'$in': batch.get('course_ids', [])}}))
        # Get student count for this batch
        student_count = mongo_db.students.count_documents({'batch_id': batch['_id']})
        batch_list.append({
            'id': str(batch['_id']),
            'name': batch['name'],
            'campuses': [{'id': str(c['_id']), 'name': c['name']} for c in campus_objs],
            'courses': [{'id': str(c['_id']), 'name': c['name']} for c in course_objs],
            'student_count': student_count
        })
    return jsonify({'success': True, 'data': batch_list}), 200

@batch_management_bp.route('/course/<course_id>/batches', methods=['GET'])
@jwt_required()
def get_batches_for_course(course_id):
    try:
        batches = list(mongo_db.batches.find({'course_ids': ObjectId(course_id)}))
        batch_list = []
        for batch in batches:
            campus_objs = list(mongo_db.campuses.find({'_id': {'$in': batch.get('campus_ids', [])}}))
            # Get student count for this batch
            student_count = mongo_db.students.count_documents({'batch_id': batch['_id']})
            batch_list.append({
                'id': str(batch['_id']),
                'name': batch['name'],
                'campuses': [{'id': str(c['_id']), 'name': c['name']} for c in campus_objs],
                'student_count': student_count
            })
        return jsonify({'success': True, 'data': batch_list}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching batches for course: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@batch_management_bp.route('/', methods=['POST'])
@jwt_required()
def create_batch():
    data = request.get_json()
    name = data.get('name')
    campus_ids = [ObjectId(cid) for cid in data.get('campus_ids', [])]
    course_ids = [ObjectId(cid) for cid in data.get('course_ids', [])]
    if not name or not campus_ids or not course_ids:
        return jsonify({'success': False, 'message': 'Name, campuses, and courses are required'}), 400
    if mongo_db.batches.find_one({'name': name}):
        return jsonify({'success': False, 'message': 'Batch name already exists'}), 409
    batch_id = mongo_db.batches.insert_one({
        'name': name,
        'campus_ids': campus_ids,
        'course_ids': course_ids
    }).inserted_id
    return jsonify({'success': True, 'data': {'id': str(batch_id)}}), 201

@batch_management_bp.route('/<batch_id>', methods=['PUT'])
@jwt_required()
def edit_batch(batch_id):
    data = request.get_json()
    update = {}
    if 'name' in data:
        update['name'] = data['name']
    if 'campus_ids' in data:
        update['campus_ids'] = [ObjectId(cid) for cid in data['campus_ids']]
    if 'course_ids' in data:
        update['course_ids'] = [ObjectId(cid) for cid in data['course_ids']]
    result = mongo_db.batches.update_one({'_id': ObjectId(batch_id)}, {'$set': update})
    if result.matched_count == 0:
        return jsonify({'success': False, 'message': 'Batch not found'}), 404
    return jsonify({'success': True}), 200

@batch_management_bp.route('/<batch_id>', methods=['DELETE'])
@jwt_required()
def delete_batch(batch_id):
    result = mongo_db.batches.delete_one({'_id': ObjectId(batch_id)})
    if result.deleted_count == 0:
        return jsonify({'success': False, 'message': 'Batch not found'}), 404
    return jsonify({'success': True}), 200

@batch_management_bp.route('/campuses', methods=['GET'])
@jwt_required()
def get_campuses():
    campuses = list(mongo_db.campuses.find())
    return jsonify({'success': True, 'data': [{'id': str(c['_id']), 'name': c['name']} for c in campuses]}), 200

@batch_management_bp.route('/courses', methods=['GET'])
@jwt_required()
def get_courses():
    campus_ids = request.args.getlist('campus_ids')
    if not campus_ids:
        return jsonify({'success': False, 'message': 'campus_ids required'}), 400
    campus_obj_ids = [ObjectId(cid) for cid in campus_ids]
    courses = list(mongo_db.courses.find({'campus_id': {'$in': campus_obj_ids}}))
    return jsonify({'success': True, 'data': [{'id': str(c['_id']), 'name': c['name'], 'campus_id': str(c['campus_id'])} for c in courses]}), 200

def _parse_student_file(file):
    filename = secure_filename(file.filename)
    if not (filename.endswith('.csv') or filename.endswith('.xlsx')):
        raise ValueError('Please upload a valid CSV or Excel file.')
    
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(file.read().decode('utf-8-sig')))
        else:
            df = pd.read_excel(file)
    except Exception as e:
        raise ValueError(f"Error reading file: {e}")

    # Normalize column headers
    df.columns = [str(col).strip() for col in df.columns]
    
    # Fill NaN values with empty strings for consistent processing
    df = df.fillna('')
    
    return df

@batch_management_bp.route('/validate-student-upload', methods=['POST'])
@jwt_required()
def validate_student_upload():
    try:
        file = request.files.get('file')
        campus_id = request.form.get('campus_id')

        if not file or not campus_id:
            return jsonify({'success': False, 'message': 'A file and campus ID are required.'}), 400

        df = _parse_student_file(file)

        required_fields = ['Course Name', 'Student Name', 'Roll Number', 'Email']
        missing_fields = [field for field in required_fields if field not in df.columns]
        if missing_fields:
            return jsonify({'success': False, 'message': f"Invalid file structure. Missing columns: {', '.join(missing_fields)}"}), 400

        # Fetch existing data for validation
        existing_roll_numbers = set(s['roll_number'] for s in mongo_db.students.find({}, {'roll_number': 1}))
        existing_emails = set(u['email'] for u in mongo_db.users.find({}, {'email': 1}))
        
        campus_courses = list(mongo_db.courses.find({'campus_id': ObjectId(campus_id)}, {'name': 1}))
        valid_course_names = {course['name'] for course in campus_courses}

        preview_data = []
        for index, row in df.iterrows():
            student_data = {
                'course_name': str(row.get('Course Name', '')).strip(),
                'student_name': str(row.get('Student Name', '')).strip(),
                'roll_number': str(row.get('Roll Number', '')).strip(),
                'email': str(row.get('Email', '')).strip().lower(),
                'mobile_number': str(row.get('Mobile Number', '')).strip(),
            }
            
            errors = []
            if not all([student_data['course_name'], student_data['student_name'], student_data['roll_number'], student_data['email']]):
                errors.append('Missing required fields.')
            if student_data['roll_number'] in existing_roll_numbers:
                errors.append('Roll number already exists.')
            if student_data['email'] in existing_emails:
                errors.append('Email already exists.')
            if student_data['course_name'] not in valid_course_names:
                errors.append(f"Course '{student_data['course_name']}' not found in this campus.")

            student_data['errors'] = errors
            preview_data.append(student_data)
        
        return jsonify({'success': True, 'data': preview_data})

    except ValueError as ve:
        return jsonify({'success': False, 'message': str(ve)}), 400
    except Exception as e:
        current_app.logger.error(f"Error validating student upload: {e}")
        return jsonify({'success': False, 'message': f'An unexpected error occurred: {e}'}), 500

@batch_management_bp.route('/upload-students', methods=['POST'])
@jwt_required()
def upload_students_to_batch():
    try:
        data = request.get_json()
        if not data:
             return jsonify({'success': False, 'message': 'Request must be JSON.'}), 400

        campus_id = data.get('campus_id')
        batch_id = data.get('batch_id')
        students_data = data.get('students')

        if not all([campus_id, batch_id, students_data]):
            return jsonify({'success': False, 'message': 'Campus ID, Batch ID, and student data are required.'}), 400

        created_students = []
        errors = []
        
        for student in students_data:
            course = mongo_db.courses.find_one({
                'name': student['course_name'],
                'campus_id': ObjectId(campus_id)
            })
            if not course:
                errors.append(f"Course '{student['course_name']}' not found for student '{student['student_name']}'.")
                continue

            username = student['roll_number']
            password = f"{student['student_name'].split()[0][:4].lower()}{student['roll_number'][-4:]}"
            password_hash = generate_password_hash(password)

            user_doc = {
                'username': username,
                'email': student['email'],
                'password_hash': password_hash,
                'role': 'student',
                'name': student['student_name'],
                'mobile_number': student['mobile_number'],
                'campus_id': ObjectId(campus_id),
                'course_id': course['_id'],
                'batch_id': ObjectId(batch_id),
                'is_active': True,
                'created_at': datetime.utcnow()
            }
            user_id = mongo_db.users.insert_one(user_doc).inserted_id

            student_doc = {
                'user_id': user_id,
                'name': student['student_name'],
                'roll_number': student['roll_number'],
                'email': student['email'],
                'mobile_number': student['mobile_number'],
                'campus_id': ObjectId(campus_id),
                'course_id': course['_id'],
                'batch_id': ObjectId(batch_id),
                'created_at': datetime.utcnow()
            }
            mongo_db.students.insert_one(student_doc)
            
            created_students.append({**student, "username": username, "password": password})

        return jsonify({
            'success': True,
            'message': f"Successfully created {len(created_students)} students.",
            'created_students': created_students,
            'errors': errors
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error creating students: {str(e)}")
        return jsonify({'success': False, 'message': f'An unexpected server error occurred: {str(e)}'}), 500

@batch_management_bp.route('/batch/<batch_id>/students', methods=['GET'])
@jwt_required()
def get_batch_students(batch_id):
    try:
        course_id = request.args.get('course_id')
        
        query = {'batch_id': ObjectId(batch_id)}
        if course_id:
            try:
                query['course_id'] = ObjectId(course_id)
            except Exception:
                return jsonify({'success': False, 'message': 'Invalid course_id format'}), 400

        # Get batch information first
        batch = mongo_db.batches.find_one({'_id': ObjectId(batch_id)})
        if not batch:
            return jsonify({'success': False, 'message': 'Batch not found'}), 404

        # Get campus and course information
        campus = mongo_db.campuses.find_one({'_id': {'$in': batch['campus_ids']}})
        courses = list(mongo_db.courses.find({'_id': {'$in': batch['course_ids']}}))

        # Get students
        students = list(mongo_db.students.find(query))
        student_list = []
        for student in students:
            student_list.append({
                'id': str(student['_id']),
                'name': student['name'],
                'roll_number': student['roll_number'],
                'email': student['email'],
                'mobile_number': student['mobile_number'],
                'course_id': str(student['course_id']),
                'campus_id': str(student['campus_id'])
            })

        batch_info = {
            'id': str(batch['_id']),
            'name': batch['name'],
            'campus_name': campus['name'] if campus else 'Unknown Campus',
            'course_name': ', '.join(c['name'] for c in courses) if courses else 'No Courses'
        }

        return jsonify({
            'success': True,
            'data': student_list,
            'batch_info': batch_info
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching batch students: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@batch_management_bp.route('/student/<student_id>', methods=['GET'])
@jwt_required()
def get_student_details(student_id):
    try:
        student = mongo_db.students.find_one({'_id': ObjectId(student_id)})
        if not student:
            return jsonify({'success': False, 'message': 'Student not found'}), 404

        user = mongo_db.users.find_one({'_id': student['user_id']})
        campus = mongo_db.campuses.find_one({'_id': student['campus_id']})
        course = mongo_db.courses.find_one({'_id': student['course_id']})
        batch = mongo_db.batches.find_one({'_id': student['batch_id']})

        student_details = {
            'id': str(student['_id']),
            'name': student['name'],
            'roll_number': student['roll_number'],
            'email': student['email'],
            'mobile_number': student['mobile_number'],
            'campus_name': campus['name'] if campus else 'N/A',
            'course_name': course['name'] if course else 'N/A',
            'batch_name': batch['name'] if batch else 'N/A',
            'username': user.get('username', 'N/A')
        }
        return jsonify({'success': True, 'data': student_details}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching student details: {e}")
        return jsonify({'success': False, 'message': 'An error occurred fetching student details.'}), 500

@batch_management_bp.route('/student/<student_id>', methods=['PUT'])
@jwt_required()
def update_student(student_id):
    try:
        data = request.json
        student = mongo_db.students.find_one({'_id': ObjectId(student_id)})
        if not student:
            return jsonify({'success': False, 'message': 'Student not found'}), 404

        # Update student collection
        student_update = {
            'name': data.get('name', student['name']),
            'roll_number': data.get('roll_number', student['roll_number']),
            'email': data.get('email', student['email']),
            'mobile_number': data.get('mobile_number', student['mobile_number']),
        }
        mongo_db.students.update_one({'_id': ObjectId(student_id)}, {'$set': student_update})

        # Update user collection
        user_update = {
            'name': data.get('name', student['name']),
            'email': data.get('email', student['email']),
            'username': data.get('roll_number', student['roll_number'])
        }
        mongo_db.users.update_one({'_id': student['user_id']}, {'$set': user_update})

        return jsonify({'success': True, 'message': 'Student updated successfully'}), 200
    except Exception as e:
        current_app.logger.error(f"Error updating student: {e}")
        return jsonify({'success': False, 'message': 'An error occurred updating the student.'}), 500

@batch_management_bp.route('/student/<student_id>', methods=['DELETE'])
@jwt_required()
def delete_student(student_id):
    try:
        student = mongo_db.students.find_one_and_delete({'_id': ObjectId(student_id)})
        if not student:
            return jsonify({'success': False, 'message': 'Student not found'}), 404

        # Also delete the associated user account
        mongo_db.users.delete_one({'_id': student['user_id']})

        return jsonify({'success': True, 'message': 'Student deleted successfully'}), 200
    except Exception as e:
        current_app.logger.error(f"Error deleting student: {e}")
        return jsonify({'success': False, 'message': 'An error occurred deleting the student.'}), 500

@batch_management_bp.route('/student/<student_id>/authorize-level', methods=['POST'])
@jwt_required()
def authorize_student_level(student_id):
    try:
        data = request.json
        level = data.get('level')
        if not level:
            return jsonify({'success': False, 'message': 'Level is required'}), 400

        # This is a placeholder for more complex logic
        # For now, we'll just update a field on the student/user
        mongo_db.students.update_one({'_id': ObjectId(student_id)}, {'$addToSet': {'authorized_levels': level}})
        
        return jsonify({'success': True, 'message': f"Level '{level}' authorized for student."}), 200
    except Exception as e:
        current_app.logger.error(f"Error authorizing level: {e}")
        return jsonify({'success': False, 'message': 'An error occurred authorizing the level.'}), 500