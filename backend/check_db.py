from config.database import DatabaseConfig
from bson import ObjectId
import traceback

def check_db():
    """Check the current state of the database"""
    try:
        print("Getting database configuration...")
        print(f"MongoDB URI: {DatabaseConfig.MONGODB_URI}")
        print(f"Database Name: {DatabaseConfig.DATABASE_NAME}")
        
        print("\nConnecting to database...")
        client = DatabaseConfig.get_client()
        print("Got client, testing connection...")
        client.admin.command('ping')
        print("Connection test successful")
        
        db = client[DatabaseConfig.DATABASE_NAME]
        print(f"Connected to database: {db.name}")
        
        # Check users
        print("\n=== Users ===")
        users = list(db.users.find())
        print(f"Found {len(users)} users")
        for user in users:
            print(f"ID: {user['_id']}")
            print(f"Username: {user.get('username')}")
            print(f"Email: {user.get('email')}")
            print(f"Role: {user.get('role')}")
            print(f"Name: {user.get('name')}")
            print(f"Is Active: {user.get('is_active')}")
            print("---")
        
        # Check campuses
        print("\n=== Campuses ===")
        campuses = list(db.campuses.find())
        print(f"Found {len(campuses)} campuses")
        for campus in campuses:
            print(f"ID: {campus['_id']}")
            print(f"Name: {campus.get('name')}")
            print(f"Admin ID: {campus.get('admin_id')}")
            print("---")
        
        # Check courses
        print("\n=== Courses ===")
        courses = list(db.courses.find())
        print(f"Found {len(courses)} courses")
        for course in courses:
            print(f"ID: {course['_id']}")
            print(f"Name: {course.get('name')}")
            print(f"Campus ID: {course.get('campus_id')}")
            print(f"Admin ID: {course.get('admin_id')}")
            print("---")

    except Exception as e:
        print(f"Error checking database: {str(e)}")
        print("Traceback:")
        traceback.print_exc()

if __name__ == "__main__":
    check_db() 