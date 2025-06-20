from config.database import DatabaseConfig
from bson import ObjectId
import json
from datetime import datetime

class MongoDB:
    def __init__(self):
        self.db = DatabaseConfig.get_database()
        self.users = self.db.users
        self.students = self.db.students
        self.modules = self.db.modules
        self.levels = self.db.levels
        self.tests = self.db.tests
        self.online_exams = self.db.online_exams
        self.student_test_attempts = self.db.student_test_attempts
        self.student_progress = self.db.student_progress
        self.campuses = self.db.campuses
        self.batches = self.db.batches
        self.courses = self.db.courses
        
        # Create indexes for better performance
        self._create_indexes()
    
    def _create_indexes(self):
        """Create database indexes for better query performance"""
        # Users collection indexes
        self.users.create_index("username", unique=True)
        self.users.create_index("email", unique=True)
        self.users.create_index("role")
        self.users.create_index("campus_id")
        self.users.create_index("course_id")
        self.users.create_index("batch_id")
        
        # Students collection indexes
        self.students.create_index("user_id", unique=True)
        self.students.create_index("roll_number", unique=True)
        self.students.create_index("campus_id")
        self.students.create_index("course_id")
        self.students.create_index("batch_id")
        
        # Tests collection indexes
        self.tests.create_index("module_id")
        self.tests.create_index("level_id")
        self.tests.create_index("created_by")
        self.tests.create_index("test_type")
        self.tests.create_index("status")
        
        # Online exams collection indexes
        self.online_exams.create_index("test_id")
        self.online_exams.create_index("status")
        self.online_exams.create_index("start_date")
        self.online_exams.create_index("end_date")
        
        # Student test attempts indexes
        self.student_test_attempts.create_index("student_id")
        self.student_test_attempts.create_index("test_id")
        self.student_test_attempts.create_index("exam_id")
        self.student_test_attempts.create_index("status")
        self.student_test_attempts.create_index("started_at")
        
        # Student progress indexes
        self.student_progress.create_index("student_id")
        self.student_progress.create_index("module_id")
        self.student_progress.create_index("level_id")
        self.student_progress.create_index([("student_id", 1), ("module_id", 1), ("level_id", 1)], unique=True)
    
    def insert_user(self, user_data):
        """Insert a new user"""
        try:
            result = self.users.insert_one(user_data)
            return str(result.inserted_id)
        except Exception as e:
            raise Exception(f"Error inserting user: {str(e)}")
    
    def find_user_by_username(self, username):
        """Find user by username"""
        return self.users.find_one({"username": username})
    
    def find_user_by_email(self, email):
        """Find user by email"""
        return self.users.find_one({"email": email})
    
    def find_user_by_id(self, user_id):
        """Find user by ID"""
        return self.users.find_one({"_id": ObjectId(user_id)})
    
    def update_user(self, user_id, update_data):
        """Update user data"""
        return self.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
    
    def insert_student(self, student_data):
        """Insert a new student"""
        try:
            result = self.students.insert_one(student_data)
            return str(result.inserted_id)
        except Exception as e:
            raise Exception(f"Error inserting student: {str(e)}")
    
    def find_student_by_user_id(self, user_id):
        """Find student by user ID"""
        return self.students.find_one({"user_id": ObjectId(user_id)})
    
    def find_students_by_campus(self, campus_id):
        """Find all students in a campus"""
        return list(self.students.find({"campus_id": ObjectId(campus_id)}))
    
    def find_students_by_course(self, course_id):
        """Find all students in a course"""
        return list(self.students.find({"course_id": ObjectId(course_id)}))
    
    def insert_test(self, test_data):
        """Insert a new test"""
        try:
            result = self.tests.insert_one(test_data)
            return str(result.inserted_id)
        except Exception as e:
            raise Exception(f"Error inserting test: {str(e)}")
    
    def find_tests_by_module_level(self, module_id, level_id):
        """Find tests by module and level"""
        return list(self.tests.find({
            "module_id": ObjectId(module_id),
            "level_id": ObjectId(level_id),
            "status": "active"
        }))
    
    def insert_test_attempt(self, attempt_data):
        """Insert a new test attempt"""
        try:
            result = self.student_test_attempts.insert_one(attempt_data)
            return str(result.inserted_id)
        except Exception as e:
            raise Exception(f"Error inserting test attempt: {str(e)}")
    
    def update_test_attempt(self, attempt_id, update_data):
        """Update test attempt"""
        return self.student_test_attempts.update_one(
            {"_id": ObjectId(attempt_id)},
            {"$set": update_data}
        )
    
    def find_student_attempts(self, student_id):
        """Find all test attempts for a student"""
        return list(self.student_test_attempts.find({"student_id": ObjectId(student_id)}))
    
    def insert_progress(self, progress_data):
        """Insert or update student progress"""
        try:
            result = self.student_progress.update_one(
                {
                    "student_id": progress_data["student_id"],
                    "module_id": progress_data["module_id"],
                    "level_id": progress_data["level_id"]
                },
                {"$set": progress_data},
                upsert=True
            )
            return result
        except Exception as e:
            raise Exception(f"Error updating progress: {str(e)}")
    
    def find_student_progress(self, student_id):
        """Find all progress records for a student"""
        return list(self.student_progress.find({"student_id": ObjectId(student_id)}))
    
    def get_collection_stats(self, collection_name):
        """Get collection statistics"""
        collection = getattr(self, collection_name, None)
        if collection:
            return {
                "count": collection.count_documents({}),
                "name": collection_name
            }
        return None

    def insert_campus(self, campus_data):
        """Insert a new campus"""
        try:
            result = self.campuses.insert_one(campus_data)
            return str(result.inserted_id)
        except Exception as e:
            raise Exception(f"Error inserting campus: {str(e)}")

    def get_all_campuses(self):
        """Get all campuses"""
        return list(self.campuses.find())

    def update_campus(self, campus_id, update_data):
        """Update campus data (name or admin_id)"""
        allowed = {k: v for k, v in update_data.items() if k in ['name', 'admin_id']}
        return self.campuses.update_one(
            {"_id": ObjectId(campus_id)},
            {"$set": allowed}
        )

    def delete_campus(self, campus_id):
        """Delete a campus"""
        return self.campuses.delete_one({"_id": ObjectId(campus_id)})

    def insert_campus_with_admin(self, campus_name, admin_name, admin_email, admin_password_hash):
        """Create a campus and its admin user atomically"""
        from config.constants import ROLES
        campus_admin_user = {
            'username': admin_email,
            'email': admin_email,
            'password_hash': admin_password_hash,
            'role': ROLES['CAMPUS_ADMIN'],
            'name': admin_name,
            'is_active': True,
            'created_at': datetime.utcnow()
        }
        user_result = self.users.insert_one(campus_admin_user)
        admin_id = user_result.inserted_id
        campus_data = {
            'name': campus_name,
            'admin_id': admin_id,
            'created_at': datetime.utcnow()
        }
        campus_result = self.campuses.insert_one(campus_data)
        return str(campus_result.inserted_id), str(admin_id)

    def get_all_campuses_with_admin(self):
        """Get all campuses with admin info populated"""
        campuses = list(self.campuses.find())
        for campus in campuses:
            admin = self.users.find_one({'_id': campus.get('admin_id')})
            campus['admin'] = {
                'id': str(admin['_id']),
                'name': admin.get('name'),
                'email': admin.get('email')
            } if admin else None
        return campuses

    def insert_course_with_admin(self, course_name, campus_id, admin_name, admin_email, admin_password_hash):
        from config.constants import ROLES
        course_admin_user = {
            'username': admin_email,
            'email': admin_email,
            'password_hash': admin_password_hash,
            'role': ROLES['COURSE_ADMIN'],
            'name': admin_name,
            'campus_id': ObjectId(campus_id),
            'is_active': True,
            'created_at': datetime.utcnow()
        }
        user_result = self.users.insert_one(course_admin_user)
        admin_id = user_result.inserted_id
        course_data = {
            'name': course_name,
            'campus_id': ObjectId(campus_id),
            'admin_id': admin_id,
            'created_at': datetime.utcnow()
        }
        course_result = self.db.courses.insert_one(course_data)
        return str(course_result.inserted_id), str(admin_id)

    def get_courses_by_campus_with_admin(self, campus_id):
        courses = list(self.db.courses.find({'campus_id': ObjectId(campus_id)}))
        for course in courses:
            admin = self.users.find_one({'_id': course.get('admin_id')})
            course['admin'] = {
                'id': str(admin['_id']),
                'name': admin.get('name'),
                'email': admin.get('email')
            } if admin else None
        return courses

    def update_course(self, course_id, update_data):
        allowed = {k: v for k, v in update_data.items() if k in ['name', 'admin_id']}
        return self.db.courses.update_one(
            {"_id": ObjectId(course_id)},
            {"$set": allowed}
        )

    def delete_course(self, course_id):
        return self.db.courses.delete_one({"_id": ObjectId(course_id)})

    def get_user_counts_by_campus(self):
        pipeline = [
            {"$group": {
                "_id": {"campus_id": "$campus_id", "role": "$role"},
                "count": {"$sum": 1}
            }}
        ]
        result = list(self.users.aggregate(pipeline))
        # Convert ObjectId to string for campus_id
        for item in result:
            if isinstance(item['_id'].get('campus_id'), ObjectId):
                item['_id']['campus_id'] = str(item['_id']['campus_id'])
        return result

    def get_user_counts_by_course(self):
        pipeline = [
            {"$group": {
                "_id": {"course_id": "$course_id", "role": "$role"},
                "count": {"$sum": 1}
            }}
        ]
        result = list(self.users.aggregate(pipeline))
        # Convert ObjectId to string for course_id
        for item in result:
            if isinstance(item['_id'].get('course_id'), ObjectId):
                item['_id']['course_id'] = str(item['_id']['course_id'])
        return result

# Global MongoDB instance
mongo_db = MongoDB() 