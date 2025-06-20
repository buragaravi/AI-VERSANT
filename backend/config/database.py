import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

class DatabaseConfig:
    # Updated MongoDB URI with connection options to fix timeout issues
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb+srv://teja:teja0000@versant.ia46v3i.mongodb.net/versant_final?retryWrites=true&w=majority&appName=Versant&connectTimeoutMS=30000&socketTimeoutMS=30000&serverSelectionTimeoutMS=30000')
    DATABASE_NAME = 'versant_final'
    
    @staticmethod
    def get_client():
        """Get MongoDB client instance with optimized connection settings"""
        try:
            client_options = {
                'connectTimeoutMS': 30000,
                'socketTimeoutMS': 30000,
                'serverSelectionTimeoutMS': 30000,
                'maxPoolSize': 10,
                'minPoolSize': 1,
                'maxIdleTimeMS': 30000,
                'waitQueueTimeoutMS': 30000,
                'retryWrites': True,
                'w': 'majority',
                'appName': 'Versant',
                'directConnection': False,
                'retryReads': True
            }
            return MongoClient(DatabaseConfig.MONGODB_URI, **client_options)
        except Exception as e:
            print(f"❌ Error creating MongoDB client: {e}")
            raise e
    
    @staticmethod
    def get_database():
        """Get database instance"""
        client = DatabaseConfig.get_client()
        return client[DatabaseConfig.DATABASE_NAME]
    
    @staticmethod
    def get_collection(collection_name):
        """Get specific collection"""
        db = DatabaseConfig.get_database()
        return db[collection_name]

def init_db():
    """Initialize database connection and create indexes"""
    try:
        client = DatabaseConfig.get_client()
        db = client[DatabaseConfig.DATABASE_NAME]
        
        # Test connection
        client.admin.command('ping')
        print("✅ MongoDB connection successful")
        
        # Create indexes for better performance
        users_collection = db['users']
        users_collection.create_index([("email", 1)], unique=True)
        users_collection.create_index([("username", 1)], unique=True)
        
        tests_collection = db['tests']
        tests_collection.create_index([("test_id", 1)], unique=True)
        tests_collection.create_index([("module", 1), ("difficulty", 1)])
        
        results_collection = db['test_results']
        results_collection.create_index([("user_id", 1), ("test_id", 1)])
        results_collection.create_index([("submitted_at", -1)])
        
        print("✅ Database indexes created successfully")
        
    except Exception as e:
        print(f"❌ Database initialization error: {e}")
        raise e 