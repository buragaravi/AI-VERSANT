"""
Ultra-scalable MongoDB configuration for 1000+ concurrent users
Optimized for maximum performance and reliability
"""

import os
import logging
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

class UltraScalableDatabaseConfig:
    """Ultra-scalable database configuration for 1000+ concurrent users"""
    
    MONGODB_URI = os.getenv('MONGODB_URI')
    
    @staticmethod
    def get_database_name():
        """Extract database name from MongoDB URI"""
        if not UltraScalableDatabaseConfig.MONGODB_URI:
            return 'versant_ultra_scalable'
        
        try:
            from urllib.parse import urlparse
            parsed_uri = urlparse(UltraScalableDatabaseConfig.MONGODB_URI)
            db_name = parsed_uri.path.strip('/').split('?')[0]
            return db_name if db_name else 'versant_ultra_scalable'
        except Exception:
            return 'versant_ultra_scalable'
    
    @staticmethod
    def get_client():
        """Get MongoDB client with ultra-scalable settings for 1000+ concurrent users"""
        try:
            if not UltraScalableDatabaseConfig.MONGODB_URI:
                raise ValueError("MONGODB_URI environment variable is not set")
            
            # Ultra-scalable client options for 1000+ concurrent users
            client_options = {
                # Connection Pool Settings - CRITICAL for scalability
                'maxPoolSize': 500,  # Increased from 20 to 500
                'minPoolSize': 50,   # Increased from 2 to 50
                'maxIdleTimeMS': 300000,  # 5 minutes idle time
                'waitQueueTimeoutMS': 10000,  # 10 seconds queue timeout
                'maxConnecting': 20,  # Allow up to 20 concurrent connections
                
                # Timeout Settings - Optimized for high concurrency
                'connectTimeoutMS': 30000,  # 30 seconds connection timeout
                'socketTimeoutMS': 30000,   # 30 seconds socket timeout
                'serverSelectionTimeoutMS': 30000,  # 30 seconds server selection
                
                # Write and Read Concerns
                'retryWrites': True,
                'retryReads': True,
                'w': 'majority',  # Write concern
                'readPreference': 'secondaryPreferred',  # Read from secondary when possible
                
                # Compression and Performance
                'compressors': ['zlib', 'snappy'],  # Multiple compression algorithms
                'zlibCompressionLevel': 6,
                'snappyCompressionLevel': 1,
                
                # Connection Management
                'heartbeatFrequencyMS': 10000,  # 10 seconds heartbeat
                'appName': 'Versant-UltraScalable',
                'directConnection': False,  # Use replica set
                
                # SSL/TLS Configuration
                'tls': True,
                'tlsAllowInvalidCertificates': False,
                'tlsAllowInvalidHostnames': False,
                'tlsInsecure': False,
                
                # Advanced Options
                'maxStalenessSeconds': 90,  # Read from secondary if within 90 seconds
                'localThresholdMS': 15,  # Prefer servers within 15ms
                'serverSelectionTimeoutMS': 30000,
                
                # Monitoring and Debugging
                'event_listeners': [],  # Can add custom event listeners
                'monitoring': True,  # Enable monitoring
            }
            
            # Ensure required parameters are in the connection string
            uri = UltraScalableDatabaseConfig.MONGODB_URI
            
            # Add required parameters for ultra-scalable deployment
            required_params = [
                'retryWrites=true',
                'w=majority',
                'ssl=true',
                'tls=true',
                'readPreference=secondaryPreferred',
                'maxPoolSize=500',
                'minPoolSize=50'
            ]
            
            # Add parameters if not present
            for param in required_params:
                if param not in uri:
                    if '?' in uri:
                        uri += f'&{param}'
                    else:
                        uri += f'?{param}'
            
            logger.info("🚀 Creating ultra-scalable MongoDB client for 1000+ concurrent users...")
            logger.info(f"   Max Pool Size: {client_options['maxPoolSize']}")
            logger.info(f"   Min Pool Size: {client_options['minPoolSize']}")
            logger.info(f"   Max Connecting: {client_options['maxConnecting']}")
            logger.info(f"   Read Preference: {client_options['readPreference']}")
            
            client = MongoClient(uri, **client_options)
            
            # Test connection with timeout
            client.admin.command('ping', maxTimeMS=5000)
            logger.info("✅ Ultra-scalable MongoDB client created successfully")
            
            return client
            
        except ServerSelectionTimeoutError as e:
            logger.error(f"❌ Server selection timeout: {e}")
            raise e
        except ConnectionFailure as e:
            logger.error(f"❌ Connection failure: {e}")
            raise e
        except Exception as e:
            logger.error(f"❌ Error creating ultra-scalable MongoDB client: {e}")
            raise e
    
    @staticmethod
    def get_database():
        """Get database instance with ultra-scalable settings"""
        try:
            client = UltraScalableDatabaseConfig.get_client()
            db_name = UltraScalableDatabaseConfig.get_database_name()
            db = client[db_name]
            
            # Create indexes for ultra-scalable performance
            UltraScalableDatabaseConfig._create_ultra_scalable_indexes(db)
            
            return db
        except Exception as e:
            logger.error(f"❌ Error getting ultra-scalable database: {e}")
            raise e
    
    @staticmethod
    def _create_ultra_scalable_indexes(db):
        """Create optimized indexes for ultra-scalable performance"""
        try:
            logger.info("🔧 Creating ultra-scalable database indexes...")
            
            # Users collection indexes
            users = db.users
            users.create_index("username", unique=True, background=True)
            users.create_index("email", background=True)  # Non-unique for performance
            users.create_index("role", background=True)
            users.create_index("campus_id", background=True)
            users.create_index("course_id", background=True)
            users.create_index("batch_id", background=True)
            users.create_index([("email", 1), ("role", 1)], background=True)
            users.create_index([("campus_id", 1), ("course_id", 1), ("batch_id", 1)], background=True)
            
            # Students collection indexes
            students = db.students
            students.create_index("user_id", unique=True, background=True)
            students.create_index("student_id", unique=True, background=True)
            students.create_index("batch_id", background=True)
            students.create_index("campus_id", background=True)
            students.create_index("course_id", background=True)
            students.create_index([("batch_id", 1), ("campus_id", 1)], background=True)
            students.create_index([("campus_id", 1), ("course_id", 1), ("batch_id", 1)], background=True)
            
            # Tests collection indexes
            tests = db.tests
            tests.create_index("test_id", unique=True, background=True)
            tests.create_index("type", background=True)
            tests.create_index("status", background=True)
            tests.create_index("campus_ids", background=True)
            tests.create_index("course_ids", background=True)
            tests.create_index("batch_ids", background=True)
            tests.create_index([("type", 1), ("status", 1)], background=True)
            tests.create_index([("campus_ids", 1), ("course_ids", 1), ("batch_ids", 1)], background=True)
            
            # Test attempts collection indexes
            test_attempts = db.test_attempts
            test_attempts.create_index("test_id", background=True)
            test_attempts.create_index("student_id", background=True)
            test_attempts.create_index("user_id", background=True)
            test_attempts.create_index("attempted_at", background=True)
            test_attempts.create_index("score", background=True)
            test_attempts.create_index([("test_id", 1), ("student_id", 1)], background=True)
            test_attempts.create_index([("test_id", 1), ("attempted_at", -1)], background=True)
            test_attempts.create_index([("student_id", 1), ("attempted_at", -1)], background=True)
            
            # Batch course instances indexes
            batch_course_instances = db.batch_course_instances
            batch_course_instances.create_index("batch_id", background=True)
            batch_course_instances.create_index("course_id", background=True)
            batch_course_instances.create_index("campus_id", background=True)
            batch_course_instances.create_index([("batch_id", 1), ("course_id", 1)], background=True)
            batch_course_instances.create_index([("campus_id", 1), ("course_id", 1), ("batch_id", 1)], background=True)
            
            logger.info("✅ Ultra-scalable database indexes created successfully")
            
        except Exception as e:
            logger.error(f"❌ Error creating ultra-scalable indexes: {e}")
            # Don't raise - indexes are not critical for basic functionality

# Global instance for easy access
ultra_scalable_config = UltraScalableDatabaseConfig()
