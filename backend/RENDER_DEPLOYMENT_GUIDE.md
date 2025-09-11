# 🚀 Render Deployment Guide - Enterprise Backend

This guide covers deploying the VERSANT enterprise backend on Render for 200-500 concurrent users.

## 📋 Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **MongoDB Database**: Set up MongoDB Atlas or use Render's MongoDB service
3. **AWS S3 Bucket**: For file storage (optional)

## 🔧 Render Configuration

### 1. Create New Web Service

1. Go to Render Dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the `backend` folder as root directory

### 2. Service Settings

**Basic Settings:**
- **Name**: `versant-backend-enterprise`
- **Environment**: `Python 3`
- **Region**: `Oregon (US West)`
- **Branch**: `main` (or your deployment branch)

**Build & Deploy:**
- **Build Command**: 
  ```bash
  pip install --upgrade pip && pip install -r requirements_render.txt
  ```
- **Start Command**: 
  ```bash
  gunicorn --worker-class eventlet --workers 4 --worker-connections 1000 --timeout 300 --keepalive 5 --bind 0.0.0.0:$PORT main:app
  ```

### 3. Environment Variables

Add these environment variables in Render dashboard:

**Required:**
```
FLASK_DEBUG=False
DEV_MODE=False
ALLOW_ALL_CORS=true
JWT_SECRET_KEY=your_very_secure_jwt_secret_key_here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/versant_enterprise
```

**Optional (for AWS S3):**
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_bucket_name
AWS_REGION=us-east-1
```

**Optional (for email/SMS):**
```
BREVO_API_KEY=your_brevo_api_key
BULKSMS_API_KEY=your_bulksms_api_key
```

### 4. Advanced Settings

**Health Check:**
- **Health Check Path**: `/health`

**Auto-Deploy:**
- ✅ Enable auto-deploy from main branch

**Instance Type:**
- **Starter Plan**: Good for 50-100 concurrent users
- **Standard Plan**: Recommended for 100-300 concurrent users  
- **Pro Plan**: Required for 300-500 concurrent users

## 📊 Performance Optimization

### 1. Render-Specific Optimizations

The backend is already optimized for Render with:
- ✅ **Eventlet workers** for high concurrency
- ✅ **Connection pooling** for database efficiency
- ✅ **Response caching** for faster responses
- ✅ **Background task processing** for non-blocking operations

### 2. Scaling Configuration

**For 50-100 users (Starter Plan):**
```bash
gunicorn --worker-class eventlet --workers 2 --worker-connections 500 --timeout 300 --bind 0.0.0.0:$PORT main:app
```

**For 100-300 users (Standard Plan):**
```bash
gunicorn --worker-class eventlet --workers 4 --worker-connections 1000 --timeout 300 --bind 0.0.0.0:$PORT main:app
```

**For 300-500 users (Pro Plan):**
```bash
gunicorn --worker-class eventlet --workers 8 --worker-connections 2000 --timeout 300 --bind 0.0.0.0:$PORT main:app
```

## 🔍 Monitoring & Health Checks

### 1. Health Check Endpoints

- `GET /health` - Basic health check
- `GET /performance/metrics` - Detailed performance metrics
- `GET /performance/background-tasks` - Background task status

### 2. Render Monitoring

Render provides built-in monitoring:
- **Logs**: Real-time application logs
- **Metrics**: CPU, Memory, Response times
- **Alerts**: Automatic alerts for failures

### 3. Custom Monitoring

Access performance metrics:
```bash
curl https://your-app.onrender.com/performance/metrics
```

## 🚀 Deployment Steps

### 1. Initial Deployment

1. **Push to GitHub**: Ensure all code is pushed to your repository
2. **Create Service**: Follow the configuration above
3. **Set Environment Variables**: Add all required environment variables
4. **Deploy**: Click "Create Web Service"

### 2. Post-Deployment

1. **Test Health Check**: 
   ```bash
   curl https://your-app.onrender.com/health
   ```

2. **Test Performance**:
   ```bash
   curl https://your-app.onrender.com/performance/metrics
   ```

3. **Update Frontend**: Update your frontend API URLs to point to Render

### 3. Scaling

**Horizontal Scaling (Multiple Instances):**
- Upgrade to Pro plan
- Enable multiple instances
- Use load balancer

**Vertical Scaling (More Resources):**
- Upgrade instance type
- Increase worker count
- Optimize database queries

## 🔧 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check `requirements_render.txt` for all dependencies
   - Verify Python version compatibility
   - Check build logs for specific errors

2. **Runtime Errors**
   - Check application logs in Render dashboard
   - Verify environment variables are set correctly
   - Test database connectivity

3. **Performance Issues**
   - Monitor CPU and memory usage
   - Check database connection limits
   - Optimize worker configuration

### Debug Commands

```bash
# Check service status
curl https://your-app.onrender.com/health

# Check performance metrics
curl https://your-app.onrender.com/performance/metrics

# Check background tasks
curl https://your-app.onrender.com/performance/background-tasks
```

## 📈 Expected Performance on Render

| Plan | Concurrent Users | Response Time | Cost/Month |
|------|------------------|---------------|------------|
| Starter | 50-100 | <2s | $7 |
| Standard | 100-300 | <1.5s | $25 |
| Pro | 300-500 | <1s | $85 |

## 🔒 Security Considerations

1. **Environment Variables**: Never commit secrets to repository
2. **HTTPS**: Render provides automatic HTTPS
3. **CORS**: Configure CORS for your frontend domain
4. **Database**: Use MongoDB Atlas with authentication
5. **API Keys**: Rotate API keys regularly

## 📞 Support

- **Render Support**: [Render Documentation](https://render.com/docs)
- **Application Logs**: Available in Render dashboard
- **Performance Issues**: Check `/performance/metrics` endpoint

---

**🎯 Your enterprise backend is now ready for Render deployment with 200-500 concurrent user support!**