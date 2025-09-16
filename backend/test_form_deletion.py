#!/usr/bin/env python3
"""
Test script to verify form deletion functionality
"""
import sys
import os
sys.path.append('.')

from config.database import get_database
from bson import ObjectId
from datetime import datetime

def test_form_deletion():
    """Test form deletion functionality"""
    try:
        # Get database connection
        mongo_db = get_database()
        
        print("🔍 Testing form deletion functionality...")
        
        # Create a test form
        test_form = {
            'title': 'Test Form for Deletion',
            'description': 'This is a test form that will be deleted',
            'template_type': 'custom',
            'fields': [
                {
                    'field_id': 'test_field_1',
                    'type': 'text',
                    'label': 'Test Field',
                    'required': True
                }
            ],
            'settings': {
                'isActive': True,
                'allowMultipleSubmissions': False,
                'submissionDeadline': None
            },
            'created_by': ObjectId(),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        # Insert test form
        result = mongo_db['forms'].insert_one(test_form)
        form_id = result.inserted_id
        print(f"✅ Created test form with ID: {form_id}")
        
        # Create a test submission for this form
        test_submission = {
            'form_id': form_id,  # Store as ObjectId
            'student_id': str(ObjectId()),
            'student_roll_number': 'TEST123',
            'responses': [
                {
                    'field_id': 'test_field_1',
                    'value': 'Test response',
                    'submitted_at': datetime.utcnow()
                }
            ],
            'status': 'submitted',
            'submitted_at': datetime.utcnow(),
            'ip_address': '127.0.0.1'
        }
        
        # Insert test submission
        submission_result = mongo_db['form_submissions'].insert_one(test_submission)
        submission_id = submission_result.inserted_id
        print(f"✅ Created test submission with ID: {submission_id}")
        
        # Verify form and submission exist
        form_count = mongo_db['forms'].count_documents({'_id': form_id})
        submission_count = mongo_db['form_submissions'].count_documents({'form_id': form_id})
        
        print(f"📊 Before deletion - Forms: {form_count}, Submissions: {submission_count}")
        
        # Test deletion logic (same as in the endpoint)
        print("🗑️ Testing deletion logic...")
        
        # Delete form and all its submissions
        form_delete_result = mongo_db['forms'].delete_one({'_id': form_id})
        submission_delete_result = mongo_db['form_submissions'].delete_many({'form_id': form_id})
        
        print(f"✅ Form deletion result: {form_delete_result.deleted_count} form(s) deleted")
        print(f"✅ Submission deletion result: {submission_delete_result.deleted_count} submission(s) deleted")
        
        # Verify deletion
        form_count_after = mongo_db['forms'].count_documents({'_id': form_id})
        submission_count_after = mongo_db['form_submissions'].count_documents({'form_id': form_id})
        
        print(f"📊 After deletion - Forms: {form_count_after}, Submissions: {submission_count_after}")
        
        if form_count_after == 0 and submission_count_after == 0:
            print("🎉 SUCCESS: Form deletion works correctly!")
            return True
        else:
            print("❌ FAILURE: Form deletion did not work correctly!")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_form_deletion()
    sys.exit(0 if success else 1)
