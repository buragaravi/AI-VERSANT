from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from mongo import mongo_db
from bson import ObjectId
import csv
import openpyxl
from werkzeug.utils import secure_filename
import bcrypt
from config.constants import ROLES
from datetime import datetime
import pytz
import io
from utils.email_service import send_email, render_template
from config.shared import bcrypt
from socketio_instance import socketio

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

@batch_management_bp.route('/', methods=['POST'])
@jwt_required()
def create_batch_from_selection():
    """Create a new batch from selected campuses and courses."""
    try:
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
            'course_ids': course_ids,
            'created_at': datetime.now(pytz.utc)
        }).inserted_id

        return jsonify({'success': True, 'data': {'id': str(batch_id)}}), 201
    except Exception as e:
        current_app.logger.error(f"Error creating batch: {e}")
        return jsonify({'success': False, 'message': 'An error occurred while creating the batch.'}), 500

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

@batch_management_bp.route('/campus/<campus_id>/batches', methods=['GET'])
@jwt_required()
def get_batches_for_campus(campus_id):
    try:
        batches = list(mongo_db.batches.find({'campus_ids': ObjectId(campus_id)}))
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
    except Exception as e:
        current_app.logger.error(f"Error fetching batches for campus: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@batch_management_bp.route('/create', methods=['POST'])
@jwt_required()
def create_batch():
    """Create a new batch and upload student data from an Excel file."""
    try:
        if 'student_file' not in request.files:
            return jsonify({'success': False, 'message': 'No student file part'}), 400

        file = request.files['student_file']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No selected file'}), 400

        batch_name = request.form.get('batch_name')
        campus_id = request.form.get('campus_id')
        course_id = request.form.get('course_id')

        if not all([batch_name, campus_id, course_id]):
            return jsonify({'success': False, 'message': 'Missing batch name, campus ID, or course ID'}), 400

        # Create a new batch
        batch_doc = {
            'name': batch_name,
            'campus_id': ObjectId(campus_id),
            'course_id': ObjectId(course_id),
            'created_at': datetime.now(pytz.utc)
        }
        new_batch_id = mongo_db.batches.insert_one(batch_doc).inserted_id

        # Process student file
        workbook = openpyxl.load_workbook(file, data_only=True)
        worksheet = workbook.active
        
        # Get headers from first row
        headers = []
        for cell in worksheet[1]:
            headers.append(str(cell.value).strip() if cell.value else '')
        
        # Get data rows
        students_data = []
        for row in worksheet.iter_rows(min_row=2):
            row_data = {}
            for i, cell in enumerate(row):
                if i < len(headers):
                    row_data[headers[i]] = str(cell.value).strip() if cell.value else ''
            students_data.append(row_data)

        created_students = []
        for student in students_data:
            # Generate username and password
            username = str(student['roll_number'])
            password = f"{student['student_name'].split()[0][:4].lower()}{student['roll_number'][-4:]}"
            
            # Use bcrypt for hashing
            password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

            student_doc = {
                'name': student['student_name'],
                'email': student['email_id'],
                'roll_number': str(student['roll_number']),
                'username': username,
                'password_hash': password_hash,
                'role': ROLES['STUDENT'],
                'campus_id': ObjectId(campus_id),
                'course_id': ObjectId(course_id),
                'batch_id': new_batch_id,
                'is_active': True,
                'created_at': datetime.now(pytz.utc),
                'mfa_enabled': False
            }
            mongo_db.users.insert_one(student_doc)
            created_students.append({
                "student_name": student['student_name'],
                "email_id": student['email_id'],
                "roll_number": str(student['roll_number']),
                "username": username,
                "password": password
            })

            # Send welcome email
            try:
                html_content = render_template(
                    'student_credentials.html',
                    name=student['student_name'],
                    username=username,
                    email=student['email_id'],
                    password=password,
                    login_url="https://pydah-ai-versant.vercel.app/login"
                )
                send_email(
                    to_email=student['email_id'],
                    to_name=student['student_name'],
                    subject="Welcome to VERSANT - Your Student Credentials",
                    html_content=html_content
                )
            except Exception as e:
                print(f"Failed to send welcome email to {student['email_id']}: {e}")

        return jsonify({
            'success': True,
            'message': 'Batch and students created successfully',
            'data': {
                'batch_id': str(new_batch_id),
                'created_students': created_students
            }
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'message': f'An error occurred: {str(e)}'}), 500

@batch_management_bp.route('/<batch_id>', methods=['PUT'])
@jwt_required()
def edit_batch(batch_id):
    try:
        data = request.get_json()
        name = data.get('name')

        if not name:
            return jsonify({'success': False, 'message': 'Batch name is required.'}), 400

        result = mongo_db.batches.update_one(
            {'_id': ObjectId(batch_id)},
            {'$set': {'name': name}}
        )

        if result.matched_count == 0:
            return jsonify({'success': False, 'message': 'Batch not found.'}), 404

        return jsonify({'success': True, 'message': 'Batch updated successfully.'}), 200
    except Exception as e:
        current_app.logger.error(f"Error updating batch: {e}")
        return jsonify({'success': False, 'message': 'An error occurred while updating the batch.'}), 500

@batch_management_bp.route('/<batch_id>', methods=['DELETE'])
@jwt_required()
def delete_batch(batch_id):
    try:
        batch_obj_id = ObjectId(batch_id)
        
        # Find all students in this batch to get their user_ids
        students_to_delete = list(mongo_db.students.find({'batch_id': batch_obj_id}))
        user_ids_to_delete = [s['user_id'] for s in students_to_delete]
        
        # Delete associated users
        if user_ids_to_delete:
            mongo_db.users.delete_many({'_id': {'$in': user_ids_to_delete}})
        
        # Delete student records
        mongo_db.students.delete_many({'batch_id': batch_obj_id})
        
        # Finally, delete the batch
        result = mongo_db.batches.delete_one({'_id': batch_obj_id})
        
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'Batch not found or already deleted.'}), 404
            
        return jsonify({'success': True, 'message': 'Batch and all associated students have been deleted.'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error deleting batch: {e}")
        return jsonify({'success': False, 'message': f'An error occurred: {str(e)}'}), 500

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
    try:
        campus_obj_ids = [ObjectId(cid) for cid in campus_ids]
        
        pipeline = [
            {'$match': {'campus_id': {'$in': campus_obj_ids}}},
            {
                '$lookup': {
                    'from': 'campuses',
                    'localField': 'campus_id',
                    'foreignField': '_id',
                    'as': 'campus_info'
                }
            },
            {
                '$unwind': '$campus_info'
            }
        ]
        courses = list(mongo_db.courses.aggregate(pipeline))

        courses_data = [{
            'id': str(c['_id']),
            'name': c['name'],
            'campus_id': str(c['campus_id']),
            'campus_name': c['campus_info']['name']
        } for c in courses]
        
        return jsonify({'success': True, 'data': courses_data}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching courses by campus: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

def _parse_student_file(file):
    filename = secure_filename(file.filename)
    if not (filename.endswith('.csv') or filename.endswith('.xlsx')):
        raise ValueError('Please upload a valid CSV or Excel file.')
    
    try:
        if filename.endswith('.csv'):
            # Read CSV file
            content = file.read().decode('utf-8-sig')
            csv_reader = csv.DictReader(io.StringIO(content))
            rows = list(csv_reader)
        else:
            # Read Excel file
            workbook = openpyxl.load_workbook(file, data_only=True)
            worksheet = workbook.active
            
            # Get headers from first row
            headers = []
            for cell in worksheet[1]:
                headers.append(str(cell.value).strip() if cell.value else '')
            
            # Get data rows
            rows = []
            for row in worksheet.iter_rows(min_row=2):
                row_data = {}
                for i, cell in enumerate(row):
                    if i < len(headers):
                        row_data[headers[i]] = str(cell.value).strip() if cell.value else ''
                rows.append(row_data)
    except Exception as e:
        raise ValueError(f"Error reading file: {e}")

    return rows

@batch_management_bp.route('/validate-student-upload', methods=['POST'])
@jwt_required()
def validate_student_upload():
    try:
        file = request.files.get('file')
        campus_id = request.form.get('campus_id')

        if not file or not campus_id:
            return jsonify({'success': False, 'message': 'A file and campus ID are required.'}), 400

        rows = _parse_student_file(file)

        if not rows:
            return jsonify({'success': False, 'message': 'File is empty or invalid.'}), 400

        # Get column names from first row
        columns = list(rows[0].keys()) if rows else []
        
        required_fields = ['Campus Name', 'Course Name', 'Student Name', 'Roll Number', 'Email']
        missing_fields = [field for field in required_fields if field not in columns]
        if missing_fields:
            return jsonify({'success': False, 'message': f"Invalid file structure. Missing columns: {', '.join(missing_fields)}"}), 400

        # Fetch existing data for validation
        existing_roll_numbers = set(s['roll_number'] for s in mongo_db.students.find({}, {'roll_number': 1}))
        existing_emails = set(u['email'] for u in mongo_db.users.find({}, {'email': 1}))
        existing_mobile_numbers = set(u.get('mobile_number', '') for u in mongo_db.users.find({'mobile_number': {'$exists': True, '$ne': ''}}, {'mobile_number': 1}))
        
        # Get campus info for validation
        campus = mongo_db.campuses.find_one({'_id': ObjectId(campus_id)})
        if not campus:
            return jsonify({'success': False, 'message': 'Invalid campus ID'}), 400
        
        campus_courses = list(mongo_db.courses.find({'campus_id': ObjectId(campus_id)}, {'name': 1}))
        valid_course_names = {course['name'] for course in campus_courses}

        preview_data = []
        for index, row in enumerate(rows):
            student_data = {
                'campus_name': str(row.get('Campus Name', '')).strip(),
                'course_name': str(row.get('Course Name', '')).strip(),
                'student_name': str(row.get('Student Name', '')).strip(),
                'roll_number': str(row.get('Roll Number', '')).strip(),
                'email': str(row.get('Email', '')).strip().lower(),
                'mobile_number': str(row.get('Mobile Number', '')).strip(),
            }
            
            errors = []
            if not all([student_data['campus_name'], student_data['course_name'], student_data['student_name'], student_data['roll_number'], student_data['email']]):
                errors.append('Missing required fields.')
            if student_data['roll_number'] in existing_roll_numbers:
                errors.append('Roll number already exists.')
            if student_data['email'] in existing_emails:
                errors.append('Email already exists.')
            if student_data['mobile_number'] and student_data['mobile_number'] in existing_mobile_numbers:
                errors.append('Mobile number already exists.')
            if student_data['campus_name'] != campus['name']:
                errors.append(f"Campus '{student_data['campus_name']}' doesn't match selected campus '{campus['name']}'.")
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
        # Accept file upload and form data
        file = request.files.get('file')
        batch_id = request.form.get('batch_id')
        course_ids = request.form.getlist('course_ids')  # Accept multiple course IDs
        if not file or not batch_id or not course_ids:
            return jsonify({'success': False, 'message': 'File, batch ID, and at least one course ID are required.'}), 400

        rows = _parse_student_file(file)
        if not rows:
            return jsonify({'success': False, 'message': 'File is empty or invalid.'}), 400

        # Validate columns
        columns = list(rows[0].keys()) if rows else []
        required_fields = ['Student Name', 'Roll Number', 'Email', 'Mobile Number']
        missing_fields = [field for field in required_fields if field not in columns]
        if missing_fields:
            return jsonify({'success': False, 'message': f"Invalid file structure. Missing columns: {', '.join(missing_fields)}"}), 400

        # Fetch batch and campus info
        batch = mongo_db.batches.find_one({'_id': ObjectId(batch_id)})
        if not batch:
            return jsonify({'success': False, 'message': 'Batch not found.'}), 404
        campus_ids = batch.get('campus_ids', [])
        if not campus_ids:
            return jsonify({'success': False, 'message': 'Batch is missing campus info.'}), 400
        campus_id = campus_ids[0]  # Assume single campus per batch for now

        # Validate course IDs
        valid_course_ids = set(str(cid) for cid in batch.get('course_ids', []))
        for cid in course_ids:
            if cid not in valid_course_ids:
                return jsonify({'success': False, 'message': f'Course ID {cid} is not valid for this batch.'}), 400

        # Fetch existing data for validation
        existing_roll_numbers = set(s['roll_number'] for s in mongo_db.students.find({}, {'roll_number': 1}))
        existing_emails = set(u['email'] for u in mongo_db.users.find({}, {'email': 1}))
        existing_mobile_numbers = set(u.get('mobile_number', '') for u in mongo_db.users.find({'mobile_number': {'$exists': True, '$ne': ''}}, {'mobile_number': 1}))

        created_students = []
        errors = []
        for row in rows:
            student_name = str(row.get('Student Name', '')).strip()
            roll_number = str(row.get('Roll Number', '')).strip()
            email = str(row.get('Email', '')).strip().lower()
            mobile_number = str(row.get('Mobile Number', '')).strip()

            # Validation
            errs = []
            if not all([student_name, roll_number, email]):
                errs.append('Missing required fields.')
            if roll_number in existing_roll_numbers:
                errs.append('Roll number already exists.')
            if email in existing_emails:
                errs.append('Email already exists.')
            if mobile_number and mobile_number in existing_mobile_numbers:
                errs.append('Mobile number already exists.')
            if errs:
                errors.append(f"{student_name or roll_number or email}: {', '.join(errs)}")
                continue

            for course_id in course_ids:
                course = mongo_db.courses.find_one({'_id': ObjectId(course_id)})
                if not course:
                    errors.append(f"Course ID {course_id} not found for student '{student_name}'.")
                    continue
                username = roll_number
                password = f"{student_name.split()[0][:4].lower()}{roll_number[-4:]}"
                password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
                user_doc = {
                    'username': username,
                    'email': email,
                    'password_hash': password_hash,
                    'role': 'student',
                    'name': student_name,
                    'mobile_number': mobile_number,
                    'campus_id': campus_id,
                    'course_id': ObjectId(course_id),
                    'batch_id': ObjectId(batch_id),
                    'is_active': True,
                    'created_at': datetime.now(pytz.utc),
                    'mfa_enabled': False
                }
                user_id = mongo_db.users.insert_one(user_doc).inserted_id
                student_doc = {
                    'user_id': user_id,
                    'name': student_name,
                    'roll_number': roll_number,
                    'email': email,
                    'mobile_number': mobile_number,
                    'campus_id': campus_id,
                    'course_id': ObjectId(course_id),
                    'batch_id': ObjectId(batch_id),
                    'created_at': datetime.now(pytz.utc)
                }
                mongo_db.students.insert_one(student_doc)
                created_students.append({
                    'student_name': student_name,
                    'roll_number': roll_number,
                    'email': email,
                    'mobile_number': mobile_number,
                    'username': username,
                    'password': password,
                    'course_id': str(course_id)
                })
                # Send welcome email
                try:
                    html_content = render_template(
                        'student_credentials.html',
                        name=student_name,
                        username=username,
                        email=email,
                        password=password,
                        login_url="https://pydah-ai-versant.vercel.app/login"
                    )
                    send_email(
                        to_email=email,
                        to_name=student_name,
                        subject="Welcome to VERSANT - Your Student Credentials",
                        html_content=html_content
                    )
                except Exception as e:
                    errors.append(f"Failed to send email to {email}: {e}")

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
    """Get all students and detailed info for a specific batch."""
    try:
        batch = mongo_db.batches.find_one({'_id': ObjectId(batch_id)})
        if not batch:
            return jsonify({'success': False, 'message': 'Batch not found'}), 404

        # Fetch campus and course names for the batch header
        campus_ids = batch.get('campus_ids', [])
        course_ids = batch.get('course_ids', [])
        
        campuses = list(mongo_db.campuses.find({'_id': {'$in': campus_ids}}))
        courses = list(mongo_db.courses.find({'_id': {'$in': course_ids}}))

        batch_info = {
            'id': str(batch['_id']),
            'name': batch.get('name'),
            'campus_name': ', '.join([c['name'] for c in campuses]),
            'course_name': ', '.join([c['name'] for c in courses]),
            'course_ids': [str(c['_id']) for c in courses],
        }

        # Fetch students with populated info using the new method
        students_with_details = mongo_db.get_students_by_batch(batch_id)

        return jsonify({
            'success': True,
            'data': students_with_details,
            'batch_info': batch_info
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching batch students: {e}")
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

        # Uniqueness check for email and mobile_number (across all users except this one)
        email = data.get('email', student['email'])
        mobile_number = data.get('mobile_number', student['mobile_number'])
        user = mongo_db.users.find_one({'_id': student['user_id']})
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        existing_user = mongo_db.users.find_one({
            '_id': {'$ne': user['_id']},
            '$or': [
                {'email': email},
                {'mobile_number': mobile_number}
            ]
        })
        if existing_user:
            if existing_user['email'] == email:
                return jsonify({'success': False, 'message': 'Email already exists'}), 400
            return jsonify({'success': False, 'message': 'Mobile number already exists'}), 400

        # Update student collection
        student_update = {
            'name': data.get('name', student['name']),
            'roll_number': data.get('roll_number', student['roll_number']),
            'email': email,
            'mobile_number': mobile_number,
        }
        mongo_db.students.update_one({'_id': ObjectId(student_id)}, {'$set': student_update})

        # Update user collection
        user_update = {
            'name': data.get('name', student['name']),
            'email': email,
            'username': data.get('roll_number', student['roll_number']),
            'mobile_number': mobile_number
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
        # Ensure authorized_levels exists
        student = mongo_db.students.find_one({'_id': ObjectId(student_id)})
        if not student:
            return jsonify({'success': False, 'message': 'Student not found.'}), 404
        if 'authorized_levels' not in student:
            mongo_db.students.update_one({'_id': ObjectId(student_id)}, {'$set': {'authorized_levels': []}})
        # Add the level to authorized_levels
        result = mongo_db.students.update_one({'_id': ObjectId(student_id)}, {'$addToSet': {'authorized_levels': level}})
        student = mongo_db.students.find_one({'_id': ObjectId(student_id)})
        if result.modified_count == 0:
            return jsonify({'success': False, 'message': f"Level '{level}' was already authorized for student.", 'authorized_levels': student.get('authorized_levels', [])}), 200
        return jsonify({'success': True, 'message': f"Level '{level}' authorized for student.", 'authorized_levels': student.get('authorized_levels', [])}), 200
    except Exception as e:
        current_app.logger.error(f"Error authorizing level: {e}")
        return jsonify({'success': False, 'message': 'An error occurred authorizing the level.'}), 500

@batch_management_bp.route('/student/<student_id>/authorize-module', methods=['POST'])
@batch_management_bp.route('/student/<student_id>/authorize-module/', methods=['POST'])
@jwt_required()
def authorize_student_module(student_id):
    try:
        data = request.json
        module = data.get('module')
        if not module:
            return jsonify({'success': False, 'message': 'Module is required'}), 400

        # Find all levels for this module
        from config.constants import LEVELS
        module_levels = [level_id for level_id, level in LEVELS.items() if (level.get('module_id') if isinstance(level, dict) else None) == module]
        if not module_levels:
            return jsonify({'success': False, 'message': 'No levels found for this module.'}), 404

        # Ensure authorized_levels exists
        student = mongo_db.students.find_one({'_id': ObjectId(student_id)})
        if not student:
            return jsonify({'success': False, 'message': 'Student not found.'}), 404
        if 'authorized_levels' not in student:
            mongo_db.students.update_one({'_id': ObjectId(student_id)}, {'$set': {'authorized_levels': []}})

        # Add all levels to authorized_levels
        mongo_db.students.update_one({'_id': ObjectId(student_id)}, {'$addToSet': {'authorized_levels': {'$each': module_levels}}})
        student = mongo_db.students.find_one({'_id': ObjectId(student_id)})

        # Emit real-time event to the student
        socketio.emit('module_access_changed', {'student_id': str(student_id), 'module': module, 'action': 'unlocked'}, room=str(student_id))

        return jsonify({'success': True, 'message': f"Module '{module}' authorized for student.", 'authorized_levels': student.get('authorized_levels', [])}), 200
    except Exception as e:
        current_app.logger.error(f"Error authorizing module: {e}")
        return jsonify({'success': False, 'message': 'An error occurred authorizing the module.'}), 500

@batch_management_bp.route('/student/<student_id>/lock-module', methods=['POST'])
@jwt_required()
def lock_student_module(student_id):
    try:
        data = request.json
        module = data.get('module')
        if not module:
            return jsonify({'success': False, 'message': 'Module is required'}), 400

        from config.constants import LEVELS
        module_levels = [level_id for level_id, level in LEVELS.items() if level.get('module_id') == module or level.get('module') == module]
        if not module_levels:
            return jsonify({'success': False, 'message': 'No levels found for this module.'}), 404

        # Remove all levels from authorized_levels
        mongo_db.students.update_one({'_id': ObjectId(student_id)}, {'$pull': {'authorized_levels': {'$in': module_levels}}})
        student = mongo_db.students.find_one({'_id': ObjectId(student_id)})

        # Emit real-time event to the student
        socketio.emit('module_access_changed', {'student_id': str(student_id), 'module': module, 'action': 'locked'}, room=str(student_id))

        return jsonify({'success': True, 'message': f"Module '{module}' locked for student.", 'authorized_levels': student.get('authorized_levels', [])}), 200
    except Exception as e:
        current_app.logger.error(f"Error locking module: {e}")
        return jsonify({'success': False, 'message': 'An error occurred locking the module.'}), 500

@batch_management_bp.route('/create-with-students', methods=['POST'])
@jwt_required()
def create_batch_with_students():
    try:
        data = request.get_json()
        name = data.get('name')
        campus_ids = [ObjectId(cid) for cid in data.get('campus_ids', [])]
        course_ids = [ObjectId(cid) for cid in data.get('course_ids', [])]
        students_data = data.get('students', [])

        if not name or not campus_ids or not students_data:
            return jsonify({'success': False, 'message': 'Batch name, campus, and student data are required.'}), 400
        
        if mongo_db.batches.find_one({'name': name}):
            return jsonify({'success': False, 'message': 'A batch with this name already exists.'}), 409

        # 1. Create the batch
        batch_doc = {
            'name': name,
            'campus_ids': campus_ids,
            'course_ids': course_ids,
            'created_at': datetime.now(pytz.utc)
        }
        batch_id = mongo_db.batches.insert_one(batch_doc).inserted_id

        # 2. Create students and users
        created_students_details = []
        errors = []
        
        for student in students_data:
            try:
                # Find campus by name from the uploaded file
                campus = mongo_db.campuses.find_one({'name': student['campus_name']})
                if not campus:
                    errors.append(f"Campus '{student['campus_name']}' not found for student '{student.get('student_name', 'N/A')}'.")
                    continue
                
                # Find course by name and campus_id
                course = mongo_db.courses.find_one({
                    'name': student['course_name'],
                    'campus_id': campus['_id']
                })
                if not course:
                    errors.append(f"Course '{student['course_name']}' not found in campus '{student['campus_name']}' for student '{student.get('student_name', 'N/A')}'.")
                    continue

                # Check for existing user with same roll number, email, or mobile number
                existing_user = mongo_db.users.find_one({
                    '$or': [
                        {'username': student['roll_number']},
                        {'email': student['email']}
                    ]
                })
                if existing_user:
                    errors.append(f"Student with roll number '{student['roll_number']}' or email '{student['email']}' already exists.")
                    continue

                # Check for duplicate mobile number if provided
                if student.get('mobile_number') and mongo_db.users.find_one({'mobile_number': student['mobile_number']}):
                    errors.append(f"Student with mobile number '{student['mobile_number']}' already exists.")
                    continue

                username = student['roll_number']
                password = f"{student['student_name'].split()[0][:4].lower()}{student['roll_number'][-4:]}"
                password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

                user_doc = {
                    'username': username,
                    'email': student['email'],
                    'password_hash': password_hash,
                    'role': ROLES['STUDENT'],
                    'name': student['student_name'],
                    'mobile_number': student.get('mobile_number', ''),
                    'campus_id': campus['_id'],
                    'course_id': course['_id'],
                    'batch_id': batch_id,
                    'is_active': True,
                    'created_at': datetime.now(pytz.utc),
                    'mfa_enabled': False
                }
                user_id = mongo_db.users.insert_one(user_doc).inserted_id

                student_doc = {
                    'user_id': user_id,
                    'name': student['student_name'],
                    'roll_number': student['roll_number'],
                    'email': student['email'],
                    'mobile_number': student.get('mobile_number', ''),
                    'campus_id': campus['_id'],
                    'course_id': course['_id'],
                    'batch_id': batch_id,
                    'created_at': datetime.now(pytz.utc)
                }
                mongo_db.students.insert_one(student_doc)

                created_students_details.append({
                    "student_name": student['student_name'],
                    "email": student['email'],
                    "username": username,
                    "password": password
                })

            except Exception as student_error:
                errors.append(f"An error occurred for student {student.get('student_name', 'N/A')}: {str(student_error)}")

        # 3. Send emails
        for student_details in created_students_details:
             try:
                html_content = render_template('student_credentials.html', **student_details, login_url="https://pydah-ai-versant.vercel.app/login")
                send_email(to_email=student_details['email'], to_name=student_details['student_name'], subject="Welcome to VERSANT - Your Student Credentials", html_content=html_content)
             except Exception as email_error:
                current_app.logger.error(f"Failed to send welcome email to {student_details['email']}: {email_error}")
                errors.append(f"Failed to send email to {student_details['email']}.")
        
        if errors:
            return jsonify({
                'success': False, 
                'message': f"Batch '{name}' created, but some students could not be added.", 
                'data': {'batch_id': str(batch_id), 'created_students': created_students_details}, 
                'errors': errors
            }), 207
        
        return jsonify({
            'success': True, 
            'message': f"Batch '{name}' created successfully with {len(created_students_details)} students.", 
            'data': {'batch_id': str(batch_id), 'created_students': created_students_details}
        }), 201

    except Exception as e:
        current_app.logger.error(f"Error creating batch with students: {e}")
        return jsonify({'success': False, 'message': f'An unexpected error occurred: {str(e)}'}), 500

@batch_management_bp.route('/<batch_id>/add-students', methods=['POST'])
@jwt_required()
def add_students_to_batch(batch_id):
    try:
        # Support both file upload (preferred) and JSON (legacy)
        if 'student_file' in request.files:
            file = request.files['student_file']
            batch_obj_id = ObjectId(batch_id)
            batch = mongo_db.batches.find_one({'_id': batch_obj_id})
            if not batch:
                return jsonify({'success': False, 'message': 'Batch not found.'}), 404
            campus_ids = batch.get('campus_ids', [])
            course_ids = batch.get('course_ids', [])
            if not campus_ids or not course_ids:
                return jsonify({'success': False, 'message': 'Batch is missing campus or course info.'}), 400
            campus_id = campus_ids[0]  # Assume single campus per batch for now
            # Parse and validate file
            rows = _parse_student_file(file)
            if not rows:
                return jsonify({'success': False, 'message': 'File is empty or invalid.'}), 400
            # Get campus and course info
            campus = mongo_db.campuses.find_one({'_id': campus_id})
            valid_course_names = set(c['name'] for c in mongo_db.courses.find({'_id': {'$in': course_ids}}))
            # Fetch existing data for validation
            existing_roll_numbers = set(s['roll_number'] for s in mongo_db.students.find({}, {'roll_number': 1}))
            existing_emails = set(u['email'] for u in mongo_db.users.find({}, {'email': 1}))
            existing_mobile_numbers = set(u.get('mobile_number', '') for u in mongo_db.users.find({'mobile_number': {'$exists': True, '$ne': ''}}, {'mobile_number': 1}))
            preview_data = []
            for row in rows:
                student_data = {
                    'campus_name': str(row.get('Campus Name', '')).strip(),
                    'course_name': str(row.get('Course Name', '')).strip(),
                    'student_name': str(row.get('Student Name', '')).strip(),
                    'roll_number': str(row.get('Roll Number', '')).strip(),
                    'email': str(row.get('Email', '')).strip().lower(),
                    'mobile_number': str(row.get('Mobile Number', '')).strip(),
                }
                errors = []
                if not all([student_data['campus_name'], student_data['course_name'], student_data['student_name'], student_data['roll_number'], student_data['email']]):
                    errors.append('Missing required fields.')
                if student_data['roll_number'] in existing_roll_numbers:
                    errors.append('Roll number already exists.')
                if student_data['email'] in existing_emails:
                    errors.append('Email already exists.')
                if student_data['mobile_number'] and student_data['mobile_number'] in existing_mobile_numbers:
                    errors.append('Mobile number already exists.')
                if student_data['campus_name'] != campus['name']:
                    errors.append(f"Campus '{student_data['campus_name']}' doesn't match batch campus '{campus['name']}'.")
                if student_data['course_name'] not in valid_course_names:
                    errors.append(f"Course '{student_data['course_name']}' not found in this batch.")
                student_data['errors'] = errors
                preview_data.append(student_data)
            # Only add students with no errors
            created_students_details = []
            errors = []
            for student in preview_data:
                if student['errors']:
                    errors.append(f"{student['student_name']}: {', '.join(student['errors'])}")
                    continue
                try:
                    course = mongo_db.courses.find_one({'name': student['course_name'], '_id': {'$in': course_ids}})
                    username = student['roll_number']
                    password = f"{student['student_name'].split()[0][:4].lower()}{student['roll_number'][-4:]}"
                    password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
                    user_doc = {
                        'username': username,
                        'email': student['email'],
                        'password_hash': password_hash,
                        'role': ROLES['STUDENT'],
                        'name': student['student_name'],
                        'mobile_number': student.get('mobile_number', ''),
                        'campus_id': campus_id,
                        'course_id': course['_id'],
                        'batch_id': batch_obj_id,
                        'is_active': True,
                        'created_at': datetime.now(pytz.utc),
                        'mfa_enabled': False
                    }
                    user_id = mongo_db.users.insert_one(user_doc).inserted_id
                    student_doc = {
                        'user_id': user_id,
                        'name': student['student_name'],
                        'roll_number': student['roll_number'],
                        'email': student['email'],
                        'mobile_number': student.get('mobile_number', ''),
                        'campus_id': campus_id,
                        'course_id': course['_id'],
                        'batch_id': batch_obj_id,
                        'created_at': datetime.now(pytz.utc)
                    }
                    mongo_db.students.insert_one(student_doc)
                    created_students_details.append({
                        "student_name": student['student_name'],
                        "email": student['email'],
                        "username": username,
                        "password": password
                    })
                    # Send welcome email
                    try:
                        html_content = render_template('student_credentials.html', name=student['student_name'], username=username, email=student['email'], password=password, login_url="https://pydah-ai-versant.vercel.app/login")
                        send_email(to_email=student['email'], to_name=student['student_name'], subject="Welcome to VERSANT - Your Student Credentials", html_content=html_content)
                    except Exception as e:
                        errors.append(f"Failed to send email to {student['email']}: {e}")
                except Exception as student_error:
                    errors.append(f"An error occurred for student {student.get('student_name', 'N/A')}: {str(student_error)}")
            if errors:
                return jsonify({'success': bool(created_students_details), 'message': f"Process completed with {len(errors)} errors.", 'data': {'created_students': created_students_details}, 'errors': errors}), 207
            return jsonify({'success': True, 'message': f"Successfully added {len(created_students_details)} students to the batch.", 'data': {'created_students': created_students_details}}), 201
        # Fallback: legacy JSON method
        data = request.get_json()
        students_data = data.get('students', []) if data else []
        if not students_data:
            return jsonify({'success': False, 'message': 'Student data are required.'}), 400
        batch_obj_id = ObjectId(batch_id)
        batch = mongo_db.batches.find_one({'_id': batch_obj_id})
        if not batch:
            return jsonify({'success': False, 'message': 'Batch not found.'}), 404
        valid_campus_ids = batch.get('campus_ids', [])
        valid_course_ids = batch.get('course_ids', [])
        created_students_details = []
        errors = []
        for student in students_data:
            try:
                campus = mongo_db.campuses.find_one({'name': student['campus_name']})
                if not campus or campus['_id'] not in valid_campus_ids:
                    errors.append(f"Campus '{student['campus_name']}' is not valid for this batch for student '{student.get('student_name', 'N/A')}'.")
                    continue
                course = mongo_db.courses.find_one({'name': student['course_name'], 'campus_id': campus['_id']})
                if not course or course['_id'] not in valid_course_ids:
                    errors.append(f"Course '{student['course_name']}' is not valid for this batch for student '{student.get('student_name', 'N/A')}'.")
                    continue
                # Check for existing user with same roll number, email, or mobile number
                existing_user = mongo_db.users.find_one({
                    '$or': [
                        {'username': student['roll_number']},
                        {'email': student['email']}
                    ]
                })
                if existing_user:
                    errors.append(f"Student with roll number '{student['roll_number']}' or email '{student['email']}' already exists.")
                    continue
                # Check for duplicate mobile number if provided
                if student.get('mobile_number') and mongo_db.users.find_one({'mobile_number': student['mobile_number']}):
                    errors.append(f"Student with mobile number '{student['mobile_number']}' already exists.")
                    continue
                username = student['roll_number']
                password = f"{student['student_name'].split()[0][:4].lower()}{student['roll_number'][-4:]}"
                password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
                user_doc = {
                    'username': username,
                    'email': student['email'],
                    'password_hash': password_hash,
                    'role': ROLES['STUDENT'],
                    'name': student['student_name'],
                    'mobile_number': student.get('mobile_number', ''),
                    'campus_id': campus['_id'],
                    'course_id': course['_id'],
                    'batch_id': batch_obj_id,
                    'is_active': True,
                    'created_at': datetime.now(pytz.utc),
                    'mfa_enabled': False
                }
                user_id = mongo_db.users.insert_one(user_doc).inserted_id
                student_doc = {
                    'user_id': user_id,
                    'name': student['student_name'],
                    'roll_number': student['roll_number'],
                    'email': student['email'],
                    'mobile_number': student.get('mobile_number', ''),
                    'campus_id': campus['_id'],
                    'course_id': course['_id'],
                    'batch_id': batch_obj_id,
                    'created_at': datetime.now(pytz.utc)
                }
                mongo_db.students.insert_one(student_doc)
                created_students_details.append({
                    "student_name": student['student_name'],
                    "email": student['email'],
                    "username": username,
                    "password": password
                })
                # Send welcome email
                try:
                    html_content = render_template('student_credentials.html', name=student['student_name'], username=username, email=student['email'], password=password, login_url="https://pydah-ai-versant.vercel.app/login")
                    send_email(to_email=student['email'], to_name=student['student_name'], subject="Welcome to VERSANT - Your Student Credentials", html_content=html_content)
                except Exception as e:
                    errors.append(f"Failed to send email to {student['email']}: {e}")
            except Exception as student_error:
                errors.append(f"An error occurred for student {student.get('student_name', 'N/A')}: {str(student_error)}")
        if errors:
            return jsonify({'success': bool(created_students_details), 'message': f"Process completed with {len(errors)} errors.", 'data': {'created_students': created_students_details}, 'errors': errors}), 207
        return jsonify({'success': True, 'message': f"Successfully added {len(created_students_details)} students to the batch.", 'data': {'created_students': created_students_details}}), 201
    except Exception as e:
        current_app.logger.error(f"Error adding students to batch: {e}")
        return jsonify({'success': False, 'message': f'An unexpected error occurred: {str(e)}'}), 500

@batch_management_bp.route('/add-student', methods=['POST'])
@jwt_required()
def add_single_student():
    try:
        data = request.get_json()
        batch_id = data.get('batch_id')
        course_id = data.get('course_id')
        name = data.get('name')
        roll_number = data.get('roll_number')
        email = data.get('email')
        mobile_number = data.get('mobile_number')

        if not all([batch_id, course_id, name, roll_number, email]):
            return jsonify({'success': False, 'message': 'All fields are required.'}), 400

        batch = mongo_db.batches.find_one({'_id': ObjectId(batch_id)})
        if not batch:
            return jsonify({'success': False, 'message': 'Batch not found.'}), 404
        campus_ids = batch.get('campus_ids', [])
        if not campus_ids:
            return jsonify({'success': False, 'message': 'Batch is missing campus info.'}), 400
        campus_id = campus_ids[0]  # Assume single campus per batch for now

        # Validate course_id
        valid_course_ids = set(str(cid) for cid in batch.get('course_ids', []))
        if course_id not in valid_course_ids:
            return jsonify({'success': False, 'message': 'Course is not valid for this batch.'}), 400

        # Check for existing user
        if mongo_db.users.find_one({'username': roll_number}):
            return jsonify({'success': False, 'message': 'Roll number already exists.'}), 400
        if mongo_db.users.find_one({'email': email}):
            return jsonify({'success': False, 'message': 'Email already exists.'}), 400
        if mobile_number and mongo_db.users.find_one({'mobile_number': mobile_number}):
            return jsonify({'success': False, 'message': 'Mobile number already exists.'}), 400

        # Create user and student
        password = f"{name.split()[0][:4].lower()}{roll_number[-4:]}"
        password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        user_doc = {
            'username': roll_number,
            'email': email,
            'password_hash': password_hash,
            'role': 'student',
            'name': name,
            'mobile_number': mobile_number,
            'campus_id': campus_id,
            'course_id': ObjectId(course_id),
            'batch_id': ObjectId(batch_id),
            'is_active': True,
            'created_at': datetime.now(pytz.utc),
            'mfa_enabled': False
        }
        user_id = mongo_db.users.insert_one(user_doc).inserted_id
        student_doc = {
            'user_id': user_id,
            'name': name,
            'roll_number': roll_number,
            'email': email,
            'mobile_number': mobile_number,
            'campus_id': campus_id,
            'course_id': ObjectId(course_id),
            'batch_id': ObjectId(batch_id),
            'created_at': datetime.now(pytz.utc)
        }
        mongo_db.students.insert_one(student_doc)
        # Send welcome email
        try:
            html_content = render_template(
                'student_credentials.html',
                name=name,
                username=roll_number,
                email=email,
                password=password,
                login_url="https://pydah-ai-versant.vercel.app/login"
            )
            send_email(
                to_email=email,
                to_name=name,
                subject="Welcome to VERSANT - Your Student Credentials",
                html_content=html_content
            )
        except Exception as e:
            return jsonify({'success': True, 'message': 'Student added, but failed to send email.', 'created_students': [{
                'student_name': name,
                'username': roll_number,
                'password': password,
                'email': email
            }], 'email_error': str(e)}), 200
        return jsonify({'success': True, 'message': 'Student added successfully!', 'created_students': [{
            'student_name': name,
            'username': roll_number,
            'password': password,
            'email': email
        }]}), 200
    except Exception as e:
        current_app.logger.error(f"Error adding single student: {str(e)}")
        return jsonify({'success': False, 'message': f'An unexpected server error occurred: {str(e)}'}), 500

@batch_management_bp.route('/student/<student_id>/access-status', methods=['GET'])
@jwt_required()
def get_student_access_status(student_id):
    try:
        from config.constants import MODULES, LEVELS
        student = mongo_db.students.find_one({'_id': ObjectId(student_id)})
        # Default logic if student not found or no authorized_levels
        default_grammar_unlocked = ['GRAMMAR_NOUN']
        modules_status = []
        if not student or not student.get('authorized_levels'):
            for module_id, module_name in MODULES.items():
                levels = [
                    {
                        'level_id': level_id,
                        'level_name': level['name'] if isinstance(level, dict) else level,
                        'unlocked': (
                            (module_id == 'GRAMMAR' and level_id == 'GRAMMAR_NOUN') or
                            (module_id == 'VOCABULARY')
                        )
                    }
                    for level_id, level in LEVELS.items()
                    if (level.get('module_id') if isinstance(level, dict) else None) == module_id
                ]
                modules_status.append({
                    'module_id': module_id,
                    'module_name': module_name,
                    'unlocked': (
                        module_id == 'GRAMMAR' or module_id == 'VOCABULARY'
                    ),
                    'levels': levels
                })
            return jsonify({'success': True, 'data': modules_status}), 200
        # If student has authorized_levels, use them
        authorized_levels = set(student.get('authorized_levels', []))
        for module_id, module_name in MODULES.items():
            levels = [
                {
                    'level_id': level_id,
                    'level_name': level['name'] if isinstance(level, dict) else level,
                    'unlocked': level_id in authorized_levels
                }
                for level_id, level in LEVELS.items()
                if (level.get('module_id') if isinstance(level, dict) else None) == module_id
            ]
            modules_status.append({
                'module_id': module_id,
                'module_name': module_name,
                'unlocked': all(l['unlocked'] for l in levels) if levels else False,
                'levels': levels
            })
        return jsonify({'success': True, 'data': modules_status}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching access status: {e}")
        return jsonify({'success': False, 'message': 'An error occurred fetching access status.'}), 500