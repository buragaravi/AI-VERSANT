import os
import boto3
from dotenv import load_dotenv

load_dotenv()

class AWSConfig:
    AWS_ACCESS_KEY = os.getenv('AWS_ACCESS_KEY')
    AWS_SECRET_KEY = os.getenv('AWS_SECRET_KEY')
    AWS_REGION = os.getenv('AWS_REGION')
    AWS_S3_BUCKET = os.getenv('AWS_S3_BUCKET')
    
    @staticmethod
    def get_s3_client():
        """Get S3 client instance"""
        if not (AWSConfig.AWS_ACCESS_KEY and AWSConfig.AWS_SECRET_KEY and AWSConfig.AWS_REGION):
            raise ValueError("AWS credentials or region not set in environment variables.")
        return boto3.client(
            's3',
            aws_access_key_id=AWSConfig.AWS_ACCESS_KEY,
            aws_secret_access_key=AWSConfig.AWS_SECRET_KEY,
            region_name=AWSConfig.AWS_REGION
        )
    
    @staticmethod
    def get_s3_resource():
        """Get S3 resource instance"""
        if not (AWSConfig.AWS_ACCESS_KEY and AWSConfig.AWS_SECRET_KEY and AWSConfig.AWS_REGION):
            raise ValueError("AWS credentials or region not set in environment variables.")
        return boto3.resource(
            's3',
            aws_access_key_id=AWSConfig.AWS_ACCESS_KEY,
            aws_secret_access_key=AWSConfig.AWS_SECRET_KEY,
            region_name=AWSConfig.AWS_REGION
        )

# Global instances for easy import (will be None if AWS not configured)
s3_client = None
S3_BUCKET_NAME = AWSConfig.AWS_S3_BUCKET

def init_aws():
    """Initialize AWS S3 connection"""
    global s3_client
    try:
        s3_client = AWSConfig.get_s3_client()
        
        # Test S3 connection by listing buckets
        response = s3_client.list_buckets()
        bucket_names = [bucket['Name'] for bucket in response['Buckets']]
        
        if AWSConfig.AWS_S3_BUCKET in bucket_names:
            print(f"✅ AWS S3 connection successful - Bucket '{AWSConfig.AWS_S3_BUCKET}' found")
        else:
            print(f"⚠️  AWS S3 connection successful but bucket '{AWSConfig.AWS_S3_BUCKET}' not found")
            print(f"Available buckets: {bucket_names}")
            
    except Exception as e:
        print(f"❌ AWS S3 initialization error: {e}")
        print("⚠️  Audio file uploads may not work properly")
        s3_client = None 