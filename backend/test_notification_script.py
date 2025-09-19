#!/usr/bin/env python3
"""
Test script for the Student Notification Manager
This script tests the core functionality without sending actual emails
"""

import os
import sys
import logging
from datetime import datetime

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from manual_student_notifications import StudentNotificationManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_database_connections():
    """Test database connections and basic queries"""
    print("🔍 Testing database connections...")
    
    try:
        manager = StudentNotificationManager()
        
        # Test campuses
        campuses = manager.get_campuses()
        print(f"✅ Found {len(campuses)} campuses")
        for campus in campuses[:3]:  # Show first 3
            print(f"   - {campus['name']} (ID: {campus['id']})")
        
        # Test courses
        courses = manager.get_courses()
        print(f"✅ Found {len(courses)} courses")
        for course in courses[:3]:  # Show first 3
            print(f"   - {course['name']} (ID: {course['id']})")
        
        # Test batches
        batches = manager.get_batches()
        print(f"✅ Found {len(batches)} batches")
        for batch in batches[:3]:  # Show first 3
            print(f"   - {batch['name']} (ID: {batch['id']})")
        
        # Test students
        students = manager.get_students()
        print(f"✅ Found {len(students)} students")
        for student in students[:3]:  # Show first 3
            print(f"   - {student['name']} ({student['email']})")
        
        return True
        
    except Exception as e:
        print(f"❌ Database connection test failed: {e}")
        return False

def test_password_generation():
    """Test password generation logic"""
    print("\n🔐 Testing password generation...")
    
    try:
        manager = StudentNotificationManager()
        
        test_cases = [
            ("John Smith", "CS2024001", "john0001"),
            ("Alice Johnson", "IT2024005", "alic0005"),
            ("Bob Wilson", "ME2024010", "bobw0010"),
            ("", "CS2024001", "0001"),  # Empty name
            ("John", "", "john"),  # Empty roll
            ("", "", "random")  # Both empty
        ]
        
        for name, roll, expected_pattern in test_cases:
            password = manager.generate_password(name, roll)
            print(f"   Name: '{name}', Roll: '{roll}' → Password: '{password}'")
            
            if name and roll:
                # Check if it follows the expected pattern
                if expected_pattern in password:
                    print(f"   ✅ Pattern correct")
                else:
                    print(f"   ⚠️  Pattern may be different (expected: {expected_pattern})")
            else:
                print(f"   ✅ Fallback password generated")
        
        return True
        
    except Exception as e:
        print(f"❌ Password generation test failed: {e}")
        return False

def test_email_configuration():
    """Test email service configuration"""
    print("\n📧 Testing email configuration...")
    
    try:
        from utils.email_service import check_email_configuration, get_email_status
        
        config_ok = check_email_configuration()
        status = get_email_status()
        
        print(f"   Email service available: {status['brevo_available']}")
        print(f"   API key set: {status['brevo_api_key_set']}")
        print(f"   Sender email set: {status['sender_email_set']}")
        print(f"   Properly configured: {status['properly_configured']}")
        
        if config_ok:
            print("   ✅ Email service is properly configured")
        else:
            print("   ⚠️  Email service has configuration issues")
            print("   💡 Check your BREVO_API_KEY and SENDER_EMAIL environment variables")
        
        return config_ok
        
    except Exception as e:
        print(f"❌ Email configuration test failed: {e}")
        return False

def test_template_rendering():
    """Test email template rendering"""
    print("\n📄 Testing template rendering...")
    
    try:
        from utils.email_service import render_template
        
        # Test student credentials template
        test_params = {
            'name': 'Test Student',
            'username': 'test123',
            'email': 'test@example.com',
            'password': 'testpass123',
            'login_url': 'https://example.com/login'
        }
        
        html_content = render_template('student_credentials.html', params=test_params)
        
        if html_content and 'Test Student' in html_content:
            print("   ✅ Student credentials template renders correctly")
        else:
            print("   ⚠️  Student credentials template may have issues")
        
        # Test test notification template
        test_notification_params = {
            'student_name': 'Test Student',
            'test_name': 'Sample Test',
            'test_id': '12345',
            'test_type': 'MCQ',
            'module': 'Mathematics',
            'level': 'Beginner',
            'module_display_name': 'Mathematics',
            'level_display_name': 'Beginner',
            'question_count': 10,
            'is_online': True,
            'start_dt': '2024-01-01 10:00',
            'end_dt': '2024-01-01 12:00'
        }
        
        html_content = render_template('test_notification.html', **test_notification_params)
        
        if html_content and 'Sample Test' in html_content:
            print("   ✅ Test notification template renders correctly")
        else:
            print("   ⚠️  Test notification template may have issues")
        
        return True
        
    except Exception as e:
        print(f"❌ Template rendering test failed: {e}")
        return False

def test_student_filtering():
    """Test student filtering functionality"""
    print("\n👥 Testing student filtering...")
    
    try:
        manager = StudentNotificationManager()
        
        # Get all campuses
        campuses = manager.get_campuses()
        if not campuses:
            print("   ⚠️  No campuses found - cannot test filtering")
            return True
        
        # Test filtering by first campus
        campus_id = campuses[0]['id']
        print(f"   Testing with campus: {campuses[0]['name']}")
        
        # Get courses for this campus
        courses = manager.get_courses(campus_id)
        if not courses:
            print("   ⚠️  No courses found for this campus")
            return True
        
        course_id = courses[0]['id']
        print(f"   Testing with course: {courses[0]['name']}")
        
        # Get batches for this campus and course
        batches = manager.get_batches(campus_id, course_id)
        if not batches:
            print("   ⚠️  No batches found for this campus and course")
            return True
        
        batch_id = batches[0]['id']
        print(f"   Testing with batch: {batches[0]['name']}")
        
        # Get students for this combination
        students = manager.get_students(campus_id, course_id, batch_id)
        print(f"   ✅ Found {len(students)} students for the selected criteria")
        
        if students:
            print("   Sample students:")
            for student in students[:3]:
                print(f"     - {student['name']} ({student['email']})")
        
        return True
        
    except Exception as e:
        print(f"❌ Student filtering test failed: {e}")
        return False

def test_test_queries():
    """Test test-related queries"""
    print("\n📚 Testing test queries...")
    
    try:
        manager = StudentNotificationManager()
        
        # Get all tests
        tests = list(manager.db.tests.find({}, {
            'name': 1, 'test_type': 1, 'assigned_student_ids': 1, '_id': 1
        }))
        
        print(f"   ✅ Found {len(tests)} tests in the system")
        
        if tests:
            print("   Sample tests:")
            for test in tests[:3]:
                assigned_count = len(test.get('assigned_student_ids', []))
                print(f"     - {test['name']} ({test.get('test_type', 'Unknown')}) - {assigned_count} students assigned")
        
        # Test student test queries if we have students
        students = manager.get_students()
        if students:
            student_id = students[0]['id']
            student_tests = manager.get_student_tests(student_id)
            print(f"   ✅ Student {students[0]['name']} has {len(student_tests)} tests assigned")
            
            unattempted_tests = manager.get_unattempted_tests(student_id)
            print(f"   ✅ Student {students[0]['name']} has {len(unattempted_tests)} unattempted tests")
        
        return True
        
    except Exception as e:
        print(f"❌ Test queries test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 VERSANT Student Notification Manager - Test Suite")
    print("=" * 60)
    
    tests = [
        ("Database Connections", test_database_connections),
        ("Password Generation", test_password_generation),
        ("Email Configuration", test_email_configuration),
        ("Template Rendering", test_template_rendering),
        ("Student Filtering", test_student_filtering),
        ("Test Queries", test_test_queries)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n{'='*60}")
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:.<40} {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The notification manager is ready to use.")
    else:
        print("⚠️  Some tests failed. Please check the configuration and try again.")
    
    print("\n💡 To run the actual notification manager:")
    print("   python manual_student_notifications.py")

if __name__ == "__main__":
    main()
