# 🚀 OneSignal Push Notifications Setup Guide

## **Overview**
This guide will help you set up OneSignal push notifications to replace the VAPID system in your VERSANT application. OneSignal provides better cross-browser compatibility, mobile support, and easier management.

## **Prerequisites**
- OneSignal account (free tier available)
- Access to your application's environment configuration
- Admin access to your VERSANT application

## **Step 1: OneSignal Account Setup**

### 1.1 Create OneSignal Account
1. Go to [OneSignal.com](https://onesignal.com)
2. Sign up for a free account
3. Create a new app for your VERSANT project

### 1.2 Configure Web Push
1. In your OneSignal dashboard, go to **Settings > Platforms**
2. Click **Web Push** and configure:
   - **Site Name**: VERSANT English Testing
   - **Site URL**: Your application URL (e.g., `https://crt.pydahsoft.in`)
   - **Default Notification Icon**: Upload your app icon
   - **Chrome Web Notification Icon**: Upload your app icon
3. Save the configuration

### 1.3 Get API Credentials
1. Go to **Settings > Keys & IDs**
2. Copy the following:
   - **App ID** (e.g., `12345678-1234-1234-1234-123456789012`)
   - **REST API Key** (e.g., `YzA2YzQ4Y2MtYzA2Yy00YzQ4Y2MtYzA2Yy00YzQ4Y2MtYzA2Yy00YzQ4Y2M`)

## **Step 2: Backend Configuration**

### 2.1 Environment Variables
Add these to your `.env` file:

```env
# OneSignal Configuration
ONESIGNAL_APP_ID=your_onesignal_app_id_here
ONESIGNAL_REST_API_KEY=your_onesignal_rest_api_key_here
```

### 2.2 Install Dependencies
The OneSignal service uses the `requests` library which should already be installed. If not:

```bash
pip install requests
```

### 2.3 Test Backend Connection
1. Start your backend server
2. Visit: `http://localhost:8000/onesignal/status`
3. You should see OneSignal connection status

## **Step 3: Frontend Configuration**

### 3.1 Environment Variables
Add this to your frontend `.env` file:

```env
# OneSignal Configuration
VITE_ONESIGNAL_APP_ID=your_onesignal_app_id_here
```

### 3.2 Test Frontend Integration
1. Start your frontend server
2. Visit: `http://localhost:3000/test/onesignal`
3. Follow the test interface to verify OneSignal integration

## **Step 4: User Identification Setup**

### 4.1 User Login Integration
When users log in, they need to be identified with OneSignal:

```javascript
// In your login success handler
const { playerId } = useOneSignalNotifications();

// After successful login, identify user with OneSignal
if (playerId) {
  await api.post('/onesignal/user/identify', {
    onesignal_player_id: playerId
  });
}
```

### 4.2 User Segments
Users are automatically segmented by:
- **Role**: superadmin, campus_admin, course_admin, student
- **Campus ID**: For campus-specific notifications
- **Course ID**: For course-specific notifications

## **Step 5: Sending Notifications**

### 5.1 Individual User Notifications
```python
# Backend Python
from utils.onesignal_service import get_onesignal_service

onesignal = get_onesignal_service()
onesignal.send_notification(
    user_id="user_mongodb_id",
    notification_data={
        "title": "New Test Available",
        "message": "A new test has been assigned to you",
        "type": "test_created",
        "url": "/student/online-exams/123",
        "priority": 10
    }
)
```

### 5.2 Bulk Notifications
```python
# Send to all students
onesignal.send_bulk_notification(
    user_ids=["user1", "user2", "user3"],
    notification_data={
        "title": "System Maintenance",
        "message": "The system will be under maintenance tonight",
        "type": "system",
        "priority": 8
    }
)
```

### 5.3 Role-based Notifications
```python
# Send to all campus admins
onesignal.send_segment_notification(
    segment="campus_admin",
    notification_data={
        "title": "New Student Registration",
        "message": "5 new students have registered",
        "type": "student_registration",
        "priority": 9
    }
)
```

## **Step 6: API Endpoints**

### 6.1 OneSignal Status
- **GET** `/onesignal/status` - Check OneSignal configuration and connection

### 6.2 Send Notifications
- **POST** `/onesignal/send` - Send notifications to users, roles, or segments
- **POST** `/onesignal/test` - Send test notification to current user

### 6.3 User Management
- **POST** `/onesignal/user/identify` - Identify user with OneSignal
- **GET** `/onesignal/user/segments` - Get user segment information

## **Step 7: Testing**

### 7.1 Test Individual Notifications
1. Go to `/test/onesignal`
2. Subscribe to notifications
3. Send a test notification
4. Verify notification appears

### 7.2 Test Bulk Notifications
1. Use the bulk test feature in the test interface
2. Check that notifications are sent to all target users
3. Verify delivery in OneSignal dashboard

### 7.3 Test Role-based Notifications
1. Login as different user roles
2. Send role-specific notifications
3. Verify correct users receive notifications

## **Step 8: Production Deployment**

### 8.1 Environment Variables
Ensure these are set in your production environment:
- `ONESIGNAL_APP_ID`
- `ONESIGNAL_REST_API_KEY`
- `VITE_ONESIGNAL_APP_ID`

### 8.2 OneSignal Dashboard
1. Update your OneSignal app settings with production URLs
2. Configure production notification icons
3. Set up any additional segments or tags

### 8.3 Monitoring
- Monitor notification delivery rates in OneSignal dashboard
- Check error logs for failed notifications
- Set up alerts for high failure rates

## **Step 9: Migration from VAPID**

### 9.1 Gradual Migration
1. Keep VAPID system running initially
2. Test OneSignal thoroughly
3. Gradually migrate users to OneSignal
4. Remove VAPID system once OneSignal is stable

### 9.2 User Communication
- Notify users about the new notification system
- Provide instructions for enabling notifications
- Handle any user concerns or issues

## **Troubleshooting**

### Common Issues

#### 1. OneSignal Not Initializing
- Check that `VITE_ONESIGNAL_APP_ID` is set correctly
- Verify the App ID is valid in OneSignal dashboard
- Check browser console for errors

#### 2. Notifications Not Sending
- Verify `ONESIGNAL_APP_ID` and `ONESIGNAL_REST_API_KEY` are correct
- Check OneSignal dashboard for API errors
- Ensure users are properly identified

#### 3. Notifications Not Displaying
- Check browser notification permissions
- Verify service worker is registered
- Check OneSignal dashboard for delivery status

#### 4. User Identification Issues
- Ensure users are logged in before identifying with OneSignal
- Check that player ID is being sent to backend
- Verify user segments are created correctly

### Debug Commands

```bash
# Check OneSignal status
curl http://localhost:8000/onesignal/status

# Test notification
curl -X POST http://localhost:8000/onesignal/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Test notification"}'
```

## **Support**

- OneSignal Documentation: https://documentation.onesignal.com/
- OneSignal Support: https://onesignal.com/support
- VERSANT Project Issues: Contact your development team

## **Next Steps**

1. Set up OneSignal account and get credentials
2. Configure environment variables
3. Test the integration using the test interface
4. Deploy to production
5. Monitor and optimize notification delivery

---

**Note**: This implementation provides a robust, cross-browser push notification system that's easier to manage than VAPID and offers better delivery rates and analytics.
