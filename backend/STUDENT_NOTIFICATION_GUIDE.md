# 🎓 VERSANT Student Notification Manager

## Overview

The Student Notification Manager is a comprehensive script that allows you to manually send various types of notifications to students based on campus, course, and batch selection. This is particularly useful during project initialization when you need to send credentials to all students.

## Features

### ✅ **Welcome Emails with Credentials**
- Send welcome emails with generated login credentials
- Automatic password generation using consistent pattern
- Professional HTML email templates
- Bulk sending with progress tracking

### ✅ **Test Notifications**
- Send test assignment notifications
- Select specific tests from available options
- Filter students who have the test assigned
- Professional test notification templates

### ✅ **Exam Reminders**
- Send reminders for unattempted tests
- Select from unattempted tests only
- Filter students who haven't attempted the test
- Custom reminder email templates

### ✅ **Student Management**
- View students by campus, course, and batch
- Display student details and contact information
- Filter and search capabilities

### ✅ **Test Management**
- View all available tests in the system
- Display test details and metadata
- Test selection for notifications

## Prerequisites

### Environment Variables
Make sure these environment variables are set:

```bash
# Email Service (Brevo)
BREVO_API_KEY=your_brevo_api_key
SENDER_EMAIL=your_sender_email@domain.com
SENDER_NAME=VERSANT System

# SMS Service (BulkSMS) - Optional
BULKSMS_API_KEY=your_bulksms_api_key
BULKSMS_SENDER_ID=your_sender_id
```

### Dependencies
The script uses existing project dependencies:
- `bcrypt` - Password hashing
- `brevo_python` - Email service
- `pymongo` - Database operations
- `jinja2` - Template rendering

## Usage

### 1. **Running the Script**

```bash
cd backend
python manual_student_notifications.py
```

### 2. **Main Menu Options**

```
🎓 VERSANT Student Notification Manager
============================================================
1. Send Welcome Emails (with credentials)
2. Send Test Notifications
3. Send Exam Reminders
4. View Students by Filter
5. View Available Tests
6. Exit
============================================================
```

### 3. **Workflow Examples**

#### **Sending Welcome Emails**

1. Select option `1` from the main menu
2. Choose campus from the list
3. Choose course for the selected campus
4. Choose batch for the selected course and campus
5. Review the list of students
6. Confirm to send welcome emails

**What happens:**
- Generates passwords using pattern: `first4letters + last4digits`
- Updates student passwords in database
- Sends professional welcome emails with credentials
- Tracks success/failure for each student

#### **Sending Test Notifications**

1. Select option `2` from the main menu
2. Choose campus, course, and batch
3. Select a test from available tests
4. Review students who have this test assigned
5. Confirm to send notifications

**What happens:**
- Filters students who have the selected test assigned
- Sends test notification emails with test details
- Includes direct links to the test

#### **Sending Exam Reminders**

1. Select option `3` from the main menu
2. Choose campus, course, and batch
3. Select an unattempted test
4. Review students who haven't attempted the test
5. Confirm to send reminders

**What happens:**
- Filters students who haven't attempted the selected test
- Sends reminder emails for unattempted tests
- Only shows tests that are still active

## Password Generation

The script uses a consistent password generation pattern:

```python
password = f"{first_name[:4].lower()}{roll_number[-4:]}"
```

**Examples:**
- Student: "John Smith", Roll: "CS2024001" → Password: "john0001"
- Student: "Alice Johnson", Roll: "IT2024005" → Password: "alic0005"

**Fallback:** If name or roll number is missing, generates a random 8-character password.

## Email Templates

### Welcome Email Template
- **File:** `backend/templates/emails/student_credentials.html`
- **Features:** Professional design, VERSANT branding, credentials table
- **Fallback:** Automatic fallback template if main template fails

### Test Notification Template
- **File:** `backend/templates/emails/test_notification.html`
- **Features:** Test details, direct links, professional styling
- **Used for:** Both test notifications and exam reminders

## Error Handling

### Resilient Design
- **Email failures don't stop processing** - continues with other students
- **Template fallbacks** ensure emails are always sent
- **Comprehensive logging** for debugging
- **Progress tracking** shows real-time status

### Error Recovery
- Invalid student data is skipped with logging
- Missing templates use fallback versions
- Database errors are logged and reported
- Network issues are handled gracefully

## Logging

The script creates detailed logs:

- **File:** `student_notifications.log`
- **Console:** Real-time progress updates
- **Levels:** INFO, WARNING, ERROR
- **Format:** Timestamp, Level, Message

## Database Operations

### Student Filtering
```python
# Filter students by campus, course, and batch
query = {
    'role': 'student',
    'is_active': True,
    'campus_id': ObjectId(campus_id),
    'course_id': ObjectId(course_id),
    'batch_id': ObjectId(batch_id)
}
```

### Password Updates
```python
# Update student password
password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
db.users.update_one(
    {'_id': ObjectId(student_id)},
    {'$set': {'password_hash': password_hash}}
)
```

## Security Considerations

### Password Security
- Passwords are hashed using bcrypt
- Consistent generation pattern for easy student access
- Random fallback for missing data

### Data Protection
- No sensitive data logged
- Secure database connections
- Input validation and sanitization

## Troubleshooting

### Common Issues

1. **Email Service Not Working**
   - Check `BREVO_API_KEY` and `SENDER_EMAIL` environment variables
   - Verify Brevo account status
   - Check network connectivity

2. **No Students Found**
   - Verify campus, course, and batch exist
   - Check student data in database
   - Ensure students are marked as active

3. **Template Errors**
   - Check template files exist in `backend/templates/emails/`
   - Verify Jinja2 template syntax
   - Fallback templates will be used automatically

4. **Database Connection Issues**
   - Check MongoDB connection
   - Verify database credentials
   - Check network connectivity

### Debug Mode

Enable detailed logging by modifying the logging level:

```python
logging.basicConfig(level=logging.DEBUG)
```

## Performance

### Bulk Operations
- Processes students in batches
- Progress tracking for large operations
- Memory-efficient processing
- Error isolation (one failure doesn't stop others)

### Scalability
- Handles large student datasets
- Efficient database queries
- Minimal memory footprint
- Concurrent processing ready

## Integration

### With Existing System
- Uses existing email service (`utils/email_service.py`)
- Uses existing SMS service (`utils/sms_service.py`)
- Uses existing database models
- Compatible with existing templates

### Future Enhancements
- SMS notifications support
- Batch processing improvements
- Advanced filtering options
- Scheduled notifications
- Template customization

## Support

For issues or questions:
1. Check the logs in `student_notifications.log`
2. Verify environment variables
3. Test with a small group of students first
4. Check database connectivity and data integrity

---

**Note:** This script is designed to be robust and continue processing even when individual operations fail, ensuring maximum delivery of notifications to students.
