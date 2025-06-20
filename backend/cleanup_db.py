from config.database import DatabaseConfig
from bson import ObjectId

def cleanup_db():
    """Clean up improperly configured courses"""
    try:
        print("Connecting to database...")
        db = DatabaseConfig.get_database()
        
        # Delete courses without campus_id or admin_id
        result = db.courses.delete_many({
            "$or": [
                {"campus_id": None},
                {"admin_id": None},
                {"campus_id": {"$exists": False}},
                {"admin_id": {"$exists": False}}
            ]
        })
        print(f"Deleted {result.deleted_count} improperly configured courses")
        
        # Update campus to associate with its admin
        campus_admin = db.users.find_one({"role": "campus_admin"})
        if campus_admin:
            result = db.campuses.update_many(
                {"admin_id": None},
                {"$set": {"admin_id": campus_admin["_id"]}}
            )
            print(f"Updated {result.modified_count} campuses with admin ID")
        
    except Exception as e:
        print(f"Error cleaning up database: {str(e)}")

if __name__ == "__main__":
    cleanup_db() 