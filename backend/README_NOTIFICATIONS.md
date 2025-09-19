# 🎓 VERSANT Student Notification Manager

## Quick Start

### Windows
```bash
cd backend
run_notifications.bat
```

### Linux/Mac
```bash
cd backend
chmod +x run_notifications.sh
./run_notifications.sh
```

### Manual
```bash
cd backend
python manual_student_notifications.py
```

## What This Script Does

✅ **Sends Welcome Emails** with student credentials  
✅ **Sends Test Notifications** for assigned tests  
✅ **Sends Exam Reminders** for unattempted tests  
✅ **Filters Students** by campus, course, and batch  
✅ **Progress Tracking** with real-time updates  
✅ **Error Handling** - continues even if some emails fail  

## Perfect for Project Initialization

This script is specifically designed for your project initialization phase where you need to:

1. **Send credentials to all students** in specific batches
2. **Notify students about tests** they need to take
3. **Send reminders** for tests they haven't attempted yet
4. **Manage bulk communications** efficiently

## Key Features

### 🔐 **Smart Password Generation**
- Pattern: `first4letters + last4digits`
- Example: "John Smith" + "CS2024001" = "john0001"
- Automatic fallback for missing data

### 📧 **Professional Email Templates**
- Welcome emails with VERSANT branding
- Test notifications with direct links
- Responsive HTML design
- Automatic fallback templates

### 🎯 **Intelligent Filtering**
- Filter by campus, course, and batch
- Show only relevant students
- Select specific tests for notifications
- Handle multiple test assignments

### 🛡️ **Robust Error Handling**
- Continues processing even if some emails fail
- Detailed logging for debugging
- Progress tracking for large operations
- Graceful degradation

## Environment Setup

Make sure these environment variables are set:

```bash
# Required for email service
BREVO_API_KEY=your_brevo_api_key
SENDER_EMAIL=your_sender_email@domain.com
SENDER_NAME=VERSANT System

# Optional for SMS service
BULKSMS_API_KEY=your_bulksms_api_key
BULKSMS_SENDER_ID=your_sender_id
```

## Testing

Before using the script, run the test suite:

```bash
python test_notification_script.py
```

This will verify:
- Database connections
- Email configuration
- Template rendering
- Student filtering
- Password generation

## Usage Examples

### 1. Send Welcome Emails to All Students in a Batch
1. Run the script
2. Select "1. Send Welcome Emails"
3. Choose campus → course → batch
4. Confirm to send emails
5. Watch progress in real-time

### 2. Notify Students About a Specific Test
1. Run the script
2. Select "2. Send Test Notifications"
3. Choose campus → course → batch
4. Select the test to notify about
5. Confirm to send notifications

### 3. Send Reminders for Unattempted Tests
1. Run the script
2. Select "3. Send Exam Reminders"
3. Choose campus → course → batch
4. Select unattempted test
5. Confirm to send reminders

## Files Created

- `manual_student_notifications.py` - Main script
- `test_notification_script.py` - Test suite
- `STUDENT_NOTIFICATION_GUIDE.md` - Detailed documentation
- `run_notifications.bat` - Windows launcher
- `run_notifications.sh` - Linux/Mac launcher

## Logs

The script creates detailed logs in `student_notifications.log` for debugging and monitoring.

## Support

If you encounter issues:
1. Check the logs
2. Run the test script
3. Verify environment variables
4. Test with a small group first

---

**Ready to use!** This script will help you efficiently manage student communications during your project initialization phase. 🚀
