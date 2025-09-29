const express = require('express');
const cors = require('cors');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(limiter);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// VAPID Keys (Generated for Web Push)
const publicVapidKey = 'BFzOWUz3c53aYy6R0fcM2jr2RFZQtvr1_Y6s6Ip82G9XqSbH3rBDZvQf-jHzQ-x6bvT3RenRmYJnAeXHJFY4HcI';
const privateVapidKey = 'WIEp51UZ-37StBgwRM9SRXAhh5m0GW1mHe97X0u_oXg';

// Configure VAPID details
webpush.setVapidDetails(
  'mailto:test@staysync.com', // Replace with your actual email
  publicVapidKey,
  privateVapidKey
);

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');

// Import middleware
const { verifyToken } = require('./middleware/auth');

// Import models
const User = require('./models/User');
const Subscription = require('./models/Subscription');
const Notification = require('./models/Notification');

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

// Get VAPID public key
app.get('/api/vapid-key', (req, res) => {
  res.json({ publicKey: publicVapidKey });
});

// Subscribe user to push notifications
app.post('/subscribe', verifyToken, async (req, res) => {
  try {
    const subscription = req.body;
    const userId = req.userId; // Get userId from auth middleware if available
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Subscription is required' });
    }

    // Check if subscription already exists
    const existingSubscription = await Subscription.findOne({ 
      endpoint: subscription.endpoint 
    });

    if (existingSubscription) {
      // Update existing subscription
      existingSubscription.keys = subscription.keys;
      existingSubscription.isActive = true;
      existingSubscription.lastUsed = new Date();
      if (userId) {
        existingSubscription.userId = userId;
      }
      await existingSubscription.save();
      console.log('Updated existing subscription');
    } else {
      // Create new subscription
      const newSubscription = new Subscription({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        isActive: true,
        userId: userId || null
      });
      await newSubscription.save();
      console.log('Added new subscription');
    }

    const totalSubscriptions = await Subscription.countDocuments({ isActive: true });

    res.status(201).json({ 
      message: 'Subscription saved successfully',
      totalSubscriptions
    });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ error: 'Server error saving subscription' });
  }
});

// Anonymous subscription endpoint (for users not logged in)
app.post('/subscribe-anonymous', async (req, res) => {
  try {
    const subscription = req.body;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Subscription is required' });
    }

    // Check if subscription already exists
    const existingSubscription = await Subscription.findOne({ 
      endpoint: subscription.endpoint 
    });

    if (existingSubscription) {
      // Update existing subscription
      existingSubscription.keys = subscription.keys;
      existingSubscription.isActive = true;
      existingSubscription.lastUsed = new Date();
      await existingSubscription.save();
      console.log('Updated existing anonymous subscription');
    } else {
      // Create new anonymous subscription
      const newSubscription = new Subscription({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        isActive: true,
        userId: null
      });
      await newSubscription.save();
      console.log('Added new anonymous subscription');
    }

    const totalSubscriptions = await Subscription.countDocuments({ isActive: true });

    res.status(201).json({ 
      message: 'Anonymous subscription saved successfully',
      totalSubscriptions
    });
  } catch (error) {
    console.error('Anonymous subscription error:', error);
    res.status(500).json({ error: 'Server error saving subscription' });
  }
});

// Unsubscribe user
app.post('/unsubscribe', verifyToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    const subscription = await Subscription.findOne({ 
      endpoint,
      userId: req.userId // Only allow users to unsubscribe their own subscriptions
    });
    
    if (subscription) {
      subscription.isActive = false;
      await subscription.save();
      console.log('Deactivated subscription');
      res.json({ message: 'Unsubscribed successfully' });
    } else {
      res.status(404).json({ error: 'Subscription not found' });
    }
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Server error unsubscribing' });
  }
});

// Get subscription count
app.get('/api/subscriptions/count', async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ isActive: true })
      .populate('userId', 'username')
      .sort({ createdAt: -1 });

    res.json({ 
      count: subscriptions.length,
      subscriptions: subscriptions.map(sub => ({
        endpoint: sub.endpoint.substring(0, 50) + '...',
        userId: sub.userId ? sub.userId.username : 'Anonymous',
        subscribedAt: sub.createdAt,
        lastUsed: sub.lastUsed
      }))
    });
  } catch (error) {
    console.error('Get subscriptions count error:', error);
    res.status(500).json({ error: 'Server error getting subscription count' });
  }
});

// Send push notification to all subscribers (legacy route for backward compatibility)
app.post('/api/send-notification', async (req, res) => {
  try {
    const { title, body, icon, url, tag } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    // Get all active subscriptions
    const subscriptions = await Subscription.find({ isActive: true });

    if (subscriptions.length === 0) {
      return res.status(400).json({ error: 'No active subscriptions found' });
    }

    const payload = JSON.stringify({
      title: title,
      body: body,
      icon: icon || '/icon.svg',
      badge: '/icon.svg',
      url: url || '/',
      tag: tag || `broadcast-${Date.now()}`,
      timestamp: Date.now()
    });

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(subscription, payload);
        successCount++;
        await subscription.updateLastUsed();
        console.log(`Notification sent successfully to: ${subscription.endpoint.substring(0, 50)}...`);
      } catch (error) {
        errorCount++;
        console.error('Error sending notification:', error);
        errors.push({
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          error: error.message,
          statusCode: error.statusCode
        });
        
        // Remove invalid subscriptions
        if (error.statusCode === 410) {
          subscription.isActive = false;
          await subscription.save();
          console.log('Removed invalid subscription (410 Gone)');
        }
      }
    }

    res.json({ 
      success: true, 
      message: `Notifications sent successfully`,
      sentTo: successCount,
      totalSubscriptions: subscriptions.length,
      errors: errors,
      payload: JSON.parse(payload)
    });

  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ 
      error: 'Failed to send notifications',
      details: error.message 
    });
  }
});

// Send push notification to specific subscription
app.post('/api/send-notification/subscription', async (req, res) => {
  try {
    const { endpoint, title, body, icon, url, tag } = req.body;

    if (!endpoint || !title || !body) {
      return res.status(400).json({ error: 'Endpoint, title and body are required' });
    }

    const subscription = subscriptions.find(sub => sub.endpoint === endpoint);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const payload = JSON.stringify({
      title: title,
      body: body,
      icon: icon || '/icon.svg',
      badge: '/icon.svg',
      url: url || '/',
      tag: tag || 'default',
      timestamp: Date.now()
    });

    await webpush.sendNotification(subscription, payload);

    res.json({ 
      success: true, 
      message: 'Notification sent successfully',
      payload: JSON.parse(payload)
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ 
      error: 'Failed to send notification',
      details: error.message 
    });
  }
});

// Test endpoint to send a quick notification
app.get('/api/test-notification', async (req, res) => {
  try {
    const payload = JSON.stringify({
      title: 'Test Notification from Stay Sync!',
      body: 'This is a test notification sent via Web Push API 🚀',
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      url: '/',
      tag: 'test',
      timestamp: Date.now()
    });

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Get all active subscriptions
    const subscriptions = await Subscription.find({ isActive: true });

    if (subscriptions.length === 0) {
      return res.status(400).json({ error: 'No active subscriptions found' });
    }

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(subscription, payload);
        successCount++;
        await subscription.updateLastUsed();
        console.log(`Test notification sent successfully to: ${subscription.endpoint.substring(0, 50)}...`);
      } catch (error) {
        errorCount++;
        console.error('Error sending test notification:', error);
        errors.push({
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          error: error.message,
          statusCode: error.statusCode
        });
        
        // Remove invalid subscriptions
        if (error.statusCode === 410) {
          subscription.isActive = false;
          await subscription.save();
          console.log('Removed invalid subscription (410 Gone)');
        }
      }
    }

    res.json({ 
      success: true, 
      message: 'Test notification sent successfully',
      sentTo: successCount,
      totalSubscriptions: subscriptions.length,
      errors: errors
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ 
      error: 'Failed to send test notification',
      details: error.message 
    });
  }
});

// Create default admin user if none exists
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const admin = new User({
        username: 'admin',
        password: 'admin123',
        role: 'admin'
      });
      await admin.save();
      console.log('👤 Default admin user created:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   ⚠️  Please change the password after first login!');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

app.listen(PORT, async () => {
  console.log(`🚀 Web Push Notification Server running on http://localhost:${PORT}`);
  console.log(`🔑 VAPID Public Key: ${publicVapidKey.substring(0, 20)}...`);
  console.log(`📊 MongoDB Connected`);
  
  // Create default admin user
  await createDefaultAdmin();
  
  console.log(`📱 Ready to receive push subscriptions!`);
  console.log(`🔐 Authentication system ready!`);
});