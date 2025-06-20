from config.database import DatabaseConfig
from bson import ObjectId

def reset_database():
    """Reset the database to a clean state, keeping only the superadmin"""
    try:
        print("Connecting to database...")
        db = DatabaseConfig.get_database()
        
        print("Cleaning up database...")
        
        # Remove all users except superadmin
        result = db.users.delete_many({
            "$and": [
                {"role": {"$ne": "super_admin"}},
                {"username": {"$ne": "superadmin"}}
            ]
        })
        print(f"Removed {result.deleted_count} non-superadmin users")
        
        # Remove all campuses
        result = db.campuses.delete_many({})
        print(f"Removed {result.deleted_count} campuses")
        
        # Remove all courses
        result = db.courses.delete_many({})
        print(f"Removed {result.deleted_count} courses")
        
        # Remove all students
        result = db.students.delete_many({})
        print(f"Removed {result.deleted_count} students")
        
        # Remove all batches
        result = db.batches.delete_many({})
        print(f"Removed {result.deleted_count} batches")
        
        # Remove all tests
        result = db.tests.delete_many({})
        print(f"Removed {result.deleted_count} tests")
        
        # Remove all test results
        result = db.test_results.delete_many({})
        print(f"Removed {result.deleted_count} test results")
        
        # Remove all student test attempts
        result = db.student_test_attempts.delete_many({})
        print(f"Removed {result.deleted_count} student test attempts")
        
        # Remove all student progress
        result = db.student_progress.delete_many({})
        print(f"Removed {result.deleted_count} student progress records")
        
        # Remove all online exams
        result = db.online_exams.delete_many({})
        print(f"Removed {result.deleted_count} online exams")
        
        print("✅ Database reset completed successfully!")
        
        # Verify superadmin still exists
        superadmin = db.users.find_one({"username": "superadmin"})
        if superadmin:
            print("✅ Superadmin user preserved")
        else:
            print("❌ Superadmin user not found - you may need to run setup_superadmin.py again")
        
    except Exception as e:
        print(f"Error resetting database: {str(e)}")

if __name__ == "__main__":
    reset_database() 