# Service Worker MIME Type Fix for Vercel Deployment

## 🚨 **Problem**
The Service Worker (`sw.js`) is being served with the wrong MIME type (`text/html` instead of `application/javascript`) on Vercel, causing push notification registration to fail.

## ✅ **Solution**

### **1. Vercel Configuration File**
Created `frontend/vercel.json` with proper headers:

```json
{
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/javascript"
        },
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/sw.js",
      "destination": "/sw.js"
    }
  ]
}
```

### **2. Enhanced Service Worker Registration**
Updated `PushNotificationManager.jsx` with:
- Better error handling for MIME type issues
- Check for existing service worker registration
- Proper scope configuration
- User-friendly error messages

### **3. Deployment Steps**

1. **Commit the changes:**
   ```bash
   git add frontend/vercel.json
   git add frontend/src/components/common/PushNotificationManager.jsx
   git commit -m "Fix Service Worker MIME type issue for Vercel deployment"
   ```

2. **Deploy to Vercel:**
   ```bash
   git push origin main
   # or
   vercel --prod
   ```

3. **Verify the fix:**
   - Check that `https://your-domain.vercel.app/sw.js` returns `Content-Type: application/javascript`
   - Test push notification registration in the browser

### **4. Alternative Solutions (if the above doesn't work)**

#### **Option A: Move Service Worker to Root**
Move `sw.js` from `frontend/public/sw.js` to `frontend/sw.js` and update the registration:

```javascript
const registration = await navigator.serviceWorker.register('/sw.js');
```

#### **Option B: Use a Different Path**
Register the service worker with a different path:

```javascript
const registration = await navigator.serviceWorker.register('/static/sw.js');
```

#### **Option C: Add to package.json**
Add a build script to copy the service worker:

```json
{
  "scripts": {
    "build": "vite build && cp public/sw.js dist/sw.js"
  }
}
```

### **5. Testing the Fix**

1. **Check MIME Type:**
   ```bash
   curl -I https://your-domain.vercel.app/sw.js
   # Should return: Content-Type: application/javascript
   ```

2. **Test in Browser:**
   - Open browser dev tools
   - Go to Application > Service Workers
   - Check if the service worker is registered without errors

3. **Test Push Notifications:**
   - Try to enable push notifications
   - Check for any console errors
   - Verify the subscription is created

### **6. Common Issues and Solutions**

#### **Issue: Still getting MIME type error**
**Solution:** Clear browser cache and try again, or use incognito mode.

#### **Issue: Service Worker not updating**
**Solution:** Unregister the old service worker in browser dev tools and refresh.

#### **Issue: 404 error for sw.js**
**Solution:** Ensure the file is in the correct location (`frontend/public/sw.js`).

### **7. Verification Checklist**

- [ ] `vercel.json` file is in the frontend directory
- [ ] Service Worker file is in `frontend/public/sw.js`
- [ ] MIME type is `application/javascript`
- [ ] No console errors during registration
- [ ] Push notification permission can be granted
- [ ] Subscription is created successfully

## 🎯 **Expected Result**

After deploying with these changes:
- Service Worker should register without MIME type errors
- Push notifications should work correctly
- Users should be able to subscribe to notifications
- Real push notifications should be delivered

## 📞 **Support**

If the issue persists after following these steps:
1. Check Vercel deployment logs
2. Verify the `vercel.json` configuration
3. Test with a different browser
4. Check if there are any build-time issues

---

**Status**: Ready for deployment  
**Priority**: High  
**Date**: January 18, 2025
