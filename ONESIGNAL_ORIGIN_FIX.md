# 🔧 OneSignal Origin Configuration Fix

## **Issue Identified:**
OneSignal is configured for `https://raviburaga.shop` but you're testing on `http://localhost:3000`, causing an origin mismatch error.

## **Solutions:**

### **Option 1: Configure OneSignal for Localhost (Recommended for Development)**

1. **Go to OneSignal Dashboard:**
   - Visit [OneSignal Dashboard](https://app.onesignal.com)
   - Go to your app settings
   - Navigate to **Settings > Platforms > Web Push**

2. **Add Localhost to Allowed Origins:**
   - In the **Site URL** field, add: `http://localhost:3000`
   - Or use: `http://localhost:*` to allow any localhost port
   - Save the configuration

3. **Alternative: Use Subdomain Configuration:**
   - Set **Site URL** to: `http://localhost:3000`
   - This will allow localhost testing

### **Option 2: Use Production Domain for Testing**

1. **Update your hosts file** (Windows):
   ```
   # Add this line to C:\Windows\System32\drivers\etc\hosts
   127.0.0.1 raviburaga.shop
   ```

2. **Access via production domain:**
   - Visit: `http://raviburaga.shop:3000`
   - This will match your OneSignal configuration

### **Option 3: Create Separate OneSignal App for Development**

1. **Create new OneSignal app:**
   - Create a new app in OneSignal dashboard
   - Configure it for `http://localhost:3000`
   - Use this App ID for development

2. **Update environment variables:**
   ```env
   # Development
   VITE_ONESIGNAL_APP_ID=your_dev_app_id_here
   
   # Production
   VITE_ONESIGNAL_APP_ID_PROD=your_prod_app_id_here
   ```

## **Quick Fix for Testing:**

### **Method 1: Update OneSignal Dashboard (Easiest)**
1. Go to OneSignal Dashboard
2. Settings > Platforms > Web Push
3. Change **Site URL** to: `http://localhost:3000`
4. Save and test

### **Method 2: Use Environment-based Configuration**
Update your OneSignal initialization to handle different environments:

```javascript
// In OneSignalNotificationManager.jsx
const getOneSignalConfig = () => {
  const isDevelopment = window.location.hostname === 'localhost';
  
  return {
    appId: appId,
    notifyButton: { enable: false },
    allowLocalhostAsSecureOrigin: true,
    autoRegister: false,
    origin: isDevelopment ? 'http://localhost:3000' : 'https://raviburaga.shop',
    strictOrigin: !isDevelopment
  };
};
```

## **Current Status:**
- ✅ OneSignal SDK is loading successfully
- ✅ App ID is configured correctly
- ❌ Origin mismatch preventing initialization
- 🔄 Multiple initialization attempts (fixed)

## **Next Steps:**
1. Choose one of the solutions above
2. Test the OneSignal integration
3. Verify notifications work on localhost
4. Configure production domain when ready

## **Recommended Action:**
**Update OneSignal Dashboard** to allow localhost testing by changing the Site URL to `http://localhost:3000`. This is the quickest fix for development.
