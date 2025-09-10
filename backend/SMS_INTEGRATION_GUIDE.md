# 📱 Study Edge Apex - SMS Integration Guide

## 🎯 **Overview**

This guide explains how to integrate the new SMS system with your Study Edge Apex application. The system includes:

1. **Student Registration SMS** - Send credentials when users register
2. **Test Scheduled SMS** - Notify students when tests are created
3. **Automated Test Reminders** - Send reminders for unattempted tests

## 📋 **New SMS Templates**

### **1. Student Credentials Template**
```
Welcome to Pydah Apex, Your Credentials
username: {username}
password: {password}
Login with {login_url} - Pydah Apex
```

### **2. Test Scheduled Template**
```
A new test {test_name} has been scheduled at {start_time} for you. Please make sure to attempt it within 24hours.
exam link: {exam_link} - Pydah Apex
```

### **3. Test Reminder Template**
```
you haven't attempted your scheduled test {test_name} yet. Please complete it as soon as possible.
exam link:{exam_link} - Pydah Apex
```

## 🚀 **Integration Steps**

### **Step 1: Update Your Existing Code**

#### **A. Student Registration (Auth Routes)**
Add SMS sending to your student registration process:

```python
# In your student registration route
from utils.sms_service import send_student_credentials_sms

# After creating student account
if student.get('mobile'):
    sms_result = send_student_credentials_sms(
        phone_number=student['mobile'],
        username=student['username'],
        password=generated_password,
        login_url="https://crt.pydahsoft.in"
    )
    print(f"SMS sent: {sms_result}")
```

#### **B. Online Test Creation (Test Management)**
Add SMS sending when creating online tests:

```python
# In your online test creation route
from utils.test_reminder_system import send_test_scheduled_notifications
from test_reminder_scheduler import schedule_test_reminders

# After creating online exam
test_id = str(online_exam['test_id'])

# Send immediate notifications
sms_result = send_test_scheduled_notifications(test_id)

# Schedule automated reminders
schedule_test_reminders(
    test_id=test_id,
    start_time=online_exam['start_date'],
    end_time=online_exam['end_date']
)
```

### **Step 2: Start the Application with SMS Support**

#### **Option A: Using the New Startup Script**
```bash
python start_with_reminders.py
```

#### **Option B: Using Gunicorn with Reminders**
```bash
# Start reminder system in background
python test_reminder_scheduler.py &

# Start main application
gunicorn --config gunicorn_ec2_optimized.py application:application
```

### **Step 3: Configure SMS Settings**

Update your `.env` file:
```env
# SMS Configuration
BULKSMS_API_KEY=your_api_key_here
BULKSMS_SENDER_ID=PYDAHK
BULKSMS_ENGLISH_API_URL=https://www.bulksmsapps.com/api/apismsv2.aspx
BULKSMS_UNICODE_API_URL=https://www.bulksmsapps.com/api/apibulkv2.aspx
```

## 📊 **API Endpoints**

### **SMS Management Endpoints**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sms-management/send-student-credentials` | POST | Send credentials SMS |
| `/sms-management/send-test-scheduled` | POST | Send test scheduled SMS |
| `/sms-management/send-test-reminders` | POST | Send test reminder SMS |
| `/sms-management/schedule-test-reminders` | POST | Schedule automated reminders |
| `/sms-management/cancel-test-reminders` | POST | Cancel scheduled reminders |
| `/sms-management/process-all-reminders` | POST | Process all pending reminders |
| `/sms-management/sms-balance` | GET | Check SMS balance |
| `/sms-management/sms-configuration` | GET | Check SMS configuration |

### **Example API Usage**

#### **Send Student Credentials**
```bash
curl -X POST http://localhost:8000/sms-management/send-student-credentials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "student_id": "student_id_here",
    "username": "student_username",
    "password": "student_password",
    "login_url": "https://crt.pydahsoft.in"
  }'
```

#### **Send Test Scheduled Notifications**
```bash
curl -X POST http://localhost:8000/sms-management/send-test-scheduled \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "test_id": "test_id_here"
  }'
```

## 🔄 **Automated Reminder System**

### **How It Works**

1. **Test Creation**: When an online test is created, the system:
   - Sends immediate SMS to all assigned students
   - Schedules automated reminders at 6h, 12h, 24h intervals
   - Continues reminders every 6h until test ends

2. **Reminder Schedule**:
   - **6 hours**: First reminder
   - **12 hours**: Second reminder  
   - **24 hours**: Third reminder
   - **30+ hours**: Every 6 hours until test ends

3. **Student Targeting**: Only students assigned to the test's course/batch receive reminders

### **Reminder Logic**

```python
# The system automatically:
# 1. Gets all students assigned to the test
# 2. Checks which students haven't attempted
# 3. Sends reminders only to unattempted students
# 4. Stops sending when test ends or all students attempt
```

## 📱 **SMS Configuration**

### **Required Environment Variables**

```env
BULKSMS_API_KEY=your_bulksms_api_key
BULKSMS_SENDER_ID=PYDAHK
BULKSMS_ENGLISH_API_URL=https://www.bulksmsapps.com/api/apismsv2.aspx
BULKSMS_UNICODE_API_URL=https://www.bulksmsapps.com/api/apibulkv2.aspx
```

### **SMS Service Status**

Check if SMS is properly configured:
```bash
curl -X GET http://localhost:8000/sms-management/sms-configuration \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🚨 **Important Notes**

### **1. Course/Batch Filtering**
- Reminders are sent only to students assigned to the test's course/batch
- The system automatically filters students based on test assignments

### **2. Test Status Checking**
- Reminders stop when test ends
- Reminders stop when all students have attempted
- System checks test status before sending each reminder

### **3. Error Handling**
- SMS failures are logged but don't stop the system
- Email notifications are sent as backup
- Failed SMS attempts are retried on next cycle

### **4. Performance Considerations**
- Reminder system runs in background
- SMS sending is asynchronous
- Database queries are optimized for large student lists

## 🔧 **Troubleshooting**

### **Common Issues**

1. **SMS Not Sending**
   - Check API key configuration
   - Verify mobile number format
   - Check SMS balance

2. **Reminders Not Working**
   - Ensure reminder system is started
   - Check test assignment to students
   - Verify test start/end times

3. **High SMS Costs**
   - Monitor SMS balance regularly
   - Consider reducing reminder frequency
   - Use email as primary notification

### **Monitoring**

```bash
# Check SMS balance
curl -X GET http://localhost:8000/sms-management/sms-balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Process all pending reminders manually
curl -X POST http://localhost:8000/sms-management/process-all-reminders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📈 **Expected Results**

After integration, you should see:

1. **Student Registration**: Automatic SMS with credentials
2. **Test Creation**: Immediate SMS to all assigned students
3. **Automated Reminders**: Regular reminders for unattempted tests
4. **Course/Batch Targeting**: Only relevant students receive notifications
5. **Performance**: 100+ concurrent users with SMS support

## 🎯 **Next Steps**

1. **Deploy the updated code** to your EC2 instance
2. **Configure SMS settings** in your environment
3. **Test the integration** with a sample test
4. **Monitor SMS usage** and costs
5. **Adjust reminder frequency** if needed

Your Study Edge Apex application now has comprehensive SMS support with automated reminders! 🚀
