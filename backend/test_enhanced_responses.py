#!/usr/bin/env python3
"""
Test the enhanced form response structure directly from database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.database import DatabaseConfig
from bson import ObjectId

def format_field_value(value, field_type):
    """Format field value for display based on field type"""
    if value is None:
        return 'No response'
    
    if field_type == 'checkbox':
        if isinstance(value, list):
            return ', '.join(str(v) for v in value)
        return str(value)
    elif field_type == 'radio':
        return str(value)
    elif field_type == 'dropdown':
        return str(value)
    elif field_type == 'textarea':
        return str(value)
    elif field_type == 'email':
        return str(value)
    elif field_type == 'number':
        return str(value)
    elif field_type == 'date':
        return str(value)
    else:  # text and other types
        return str(value)

def test_enhanced_responses():
    """Test the enhanced response structure"""
    try:
        mongo_db = DatabaseConfig.get_database()
        
        print("🔍 Testing enhanced form response structure...")
        
        # Get a form submission
        submission = mongo_db.form_submissions.find_one({})
        if not submission:
            print("❌ No submissions found")
            return False
            
        print(f"📝 Testing submission: {submission['_id']}")
        
        # Get the form details
        form = mongo_db.forms.find_one({'_id': ObjectId(submission['form_id'])})
        if not form:
            print("❌ Form not found")
            return False
            
        print(f"📋 Form: {form['title']}")
        print(f"   - Fields: {len(form.get('fields', []))}")
        
        # Process form responses with field labels (same logic as API)
        if 'responses' in submission:
            processed_responses = []
            for response in submission['responses']:
                field_id = response.get('field_id')
                field_value = response.get('value')
                
                # Find the field definition in the form
                field_definition = None
                for field in form.get('fields', []):
                    if field.get('field_id') == field_id:
                        field_definition = field
                        break
                
                if field_definition:
                    processed_responses.append({
                        'field_id': field_id,
                        'field_label': field_definition.get('label', 'Unknown Field'),
                        'field_type': field_definition.get('type', 'text'),
                        'field_required': field_definition.get('required', False),
                        'value': field_value,
                        'display_value': format_field_value(field_value, field_definition.get('type', 'text'))
                    })
                else:
                    processed_responses.append({
                        'field_id': field_id,
                        'field_label': 'Unknown Field',
                        'field_type': 'text',
                        'field_required': False,
                        'value': field_value,
                        'display_value': str(field_value) if field_value is not None else 'No response'
                    })
            
            print(f"\n📊 Enhanced Form Responses ({len(processed_responses)} fields):")
            for response in processed_responses:
                print(f"   • {response['field_label']} ({response['field_type']}): {response['display_value']}")
                print(f"     - Required: {response['field_required']}")
                print(f"     - Raw Value: {response['value']}")
                print(f"     - Field ID: {response['field_id']}")
                print()
        else:
            print("❌ No responses found in submission")
            
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    test_enhanced_responses()
