import os
from pymongo import MongoClient
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

class DatabaseConfig:
    # Updated MongoDB URI with connection options to fix timeout issues
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb+srv://teja:teja0000@versant.ia46v3i.mongodb.net/suma_madam?retryWrites=true&w=majority&appName=Versant&connectTimeoutMS=30000&socketTimeoutMS=30000&serverSelectionTimeoutMS=30000')
    
    @staticmethod
    def get_database_name():
        """Extract database name from MongoDB URI"""
        if not DatabaseConfig.MONGODB_URI:
            return 'suma_madam'  # Updated to match actual database
        
        try:
            # Parse the URI to extract database name
            parsed_uri = urlparse(DatabaseConfig.MONGODB_URI)
            # The path will be like '/database_name?params'
            db_name = parsed_uri.path.strip('/').split('?')[0]
            # If no database name in URI, use suma_madam as default
            return db_name if db_name else 'suma_madam'
        except Exception:
            return 'suma_madam'  # Updated to match actual database
    
    @staticmethod
    def get_client():
        """Get MongoDB client instance with optimized connection settings for high load and SSL stability"""
        try:
            client_options = {
                # Connection timeouts - increased for stability
                'connectTimeoutMS': 60000,  # Increased from 30s to 60s
                'socketTimeoutMS': 60000,   # Increased from 30s to 60s
                'serverSelectionTimeoutMS': 60000,  # Increased from 30s to 60s
                
                # Connection pooling for high load
                'maxPoolSize': 50,          # Increased from 10 to 50 for high load
                'minPoolSize': 5,           # Increased from 1 to 5
                'maxIdleTimeMS': 300000,    # Increased from 30s to 5min
                'waitQueueTimeoutMS': 60000, # Increased from 30s to 60s
                'maxConnecting': 10,        # Increased from 2 to 10
                
                # Write concerns and retries
                'retryWrites': True,
                'retryReads': True,
                'w': 'majority',
                'appName': 'Versant-HighLoad',
                
                # SSL/TLS will be handled automatically by MongoDB URI
                
                # Heartbeat and monitoring
                'heartbeatFrequencyMS': 10000,
                
                # Compression for better performance
                'compressors': ['zlib'],
                'zlibCompressionLevel': 6,
                
                # Additional stability options
                'directConnection': False,
                'readPreference': 'secondaryPreferred'  # Better for read-heavy workloads
            }
            
            # Parse the URI and add enhanced SSL parameters
            uri = DatabaseConfig.MONGODB_URI
            
            # Use the original URI without adding SSL parameters
            # Let MongoDB handle SSL/TLS automatically based on the connection string
            
            return MongoClient(uri, **client_options)
        except Exception as e:
            print(f"❌ Error creating MongoDB client: {e}")
            raise e
    
    @staticmethod
    def get_database():
        """Get database instance with retry logic for connection stability"""
        max_retries = 3
        retry_delay = 2  # seconds
        
        for attempt in range(max_retries):
            try:
                client = DatabaseConfig.get_client()
                db_name = DatabaseConfig.get_database_name()
                
                # Test connection before returning
                client.admin.command('ping')
                print(f"📊 Using database: {db_name} (Attempt {attempt + 1})")
                return client[db_name]
                
            except Exception as e:
                print(f"⚠️ Database connection attempt {attempt + 1} failed: {str(e)}")
                if attempt < max_retries - 1:
                    print(f"🔄 Retrying in {retry_delay} seconds...")
                    import time
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    print(f"❌ All database connection attempts failed")
                    raise e
    
    @staticmethod
    def get_collection(collection_name):
        """Get specific collection"""
        db = DatabaseConfig.get_database()
        return db[collection_name]

def init_db():
    """Initialize database connection and create indexes"""
    try:
        client = DatabaseConfig.get_client()
        db_name = DatabaseConfig.get_database_name()
        db = client[db_name]
        
        # Test connection
        client.admin.command('ping')
        print("✅ MongoDB connection successful")
        
        # Create indexes for better performance
        users_collection = db['users']
        users_collection.create_index([("email", 1)])  # Non-unique index for performance
        users_collection.create_index([("username", 1)], unique=True)
        
        # Create test_results collection if it doesn't exist
        test_results_collection = db['test_results']
        test_results_collection.create_index([("test_id", 1)])
        test_results_collection.create_index([("student_id", 1)])
        test_results_collection.create_index([("module_id", 1)])
        test_results_collection.create_index([("submitted_at", -1)])
        
        # Create student_test_attempts collection if it doesn't exist
        student_test_attempts_collection = db['student_test_attempts']
        student_test_attempts_collection.create_index([("test_id", 1)])
        student_test_attempts_collection.create_index([("student_id", 1)])
        student_test_attempts_collection.create_index([("module_id", 1)])
        student_test_attempts_collection.create_index([("submitted_at", -1)])
        
        print("✅ Database indexes created successfully")
        
    except Exception as e:
        print(f"❌ Database initialization error: {e}")
        raise e 