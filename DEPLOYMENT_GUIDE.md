# 🚀 AI-VERSANT Deployment Guide

This guide covers multiple deployment options for the AI-VERSANT application using CI/CD pipelines.

## 📋 Prerequisites

- GitHub repository with the code
- Docker Hub account (for container registry)
- One or more of the following deployment targets:
  - Render.com account
  - AWS EC2 instance
  - Any cloud provider supporting Docker

## 🔧 Setup Instructions

### 1. **GitHub Secrets Configuration**

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add these secrets:

#### Required Secrets:
```bash
# Docker Hub
DOCKER_USERNAME=your_docker_hub_username
DOCKER_PASSWORD=your_docker_hub_password

# Application Environment Variables
JWT_SECRET_KEY=your_super_secure_jwt_secret_key_here_2024
AWS_ACCESS_KEY=your_aws_access_key_here
AWS_SECRET_KEY=your_aws_secret_key_here
AWS_S3_BUCKET=your_s3_bucket_name_here
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BULKSMS_USERNAME=your_bulksms_username_here
BULKSMS_PASSWORD=your_bulksms_password_here
```

#### Optional Secrets (for specific deployment targets):
```bash
# Render.com
RENDER_API_KEY=your_render_api_key
RENDER_BACKEND_SERVICE_ID=your_render_backend_service_id
RENDER_FRONTEND_SERVICE_ID=your_render_frontend_service_id

# AWS EC2
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
EC2_HOST=your_ec2_public_ip
EC2_USERNAME=ubuntu
EC2_SSH_KEY=your_ec2_private_ssh_key
EC2_PORT=22

# Notifications
SLACK_WEBHOOK_URL=your_slack_webhook_url_for_notifications
```

### 2. **Environment Configuration**

Copy the environment template and configure it:
```bash
cp env.example .env
# Edit .env with your actual values
```

## 🚀 Deployment Options

### Option 1: **Render.com (Recommended for Beginners)**

1. **Create Render Services:**
   - Go to [Render.com](https://render.com)
   - Create a new "Web Service" for backend
   - Create a new "Static Site" for frontend

2. **Configure Backend Service:**
   - Connect your GitHub repository
   - Set build command: `cd backend && pip install -r requirements.txt`
   - Set start command: `cd backend && python main.py`
   - Add environment variables from your `.env` file

3. **Configure Frontend Service:**
   - Connect your GitHub repository
   - Set build command: `cd frontend && npm install && npm run build`
   - Set publish directory: `frontend/dist`
   - Add environment variables for API URLs

4. **Update GitHub Secrets:**
   - Add your Render service IDs and API key to GitHub secrets

### Option 2: **AWS EC2 (Full Control)**

1. **Launch EC2 Instance:**
   ```bash
   # Ubuntu 22.04 LTS recommended
   # Instance type: t3.medium or larger
   # Security groups: Allow ports 22, 80, 443, 8000, 3000
   ```

2. **Configure EC2 Instance:**
   ```bash
   # SSH into your instance
   ssh -i your-key.pem ubuntu@your-ec2-ip
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker ubuntu
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   
   # Clone your repository
   git clone https://github.com/yourusername/ai-versant.git
   cd ai-versant
   ```

3. **Deploy with Docker Compose:**
   ```bash
   # Copy environment file
   cp env.example .env
   # Edit .env with your values
   
   # Start services
   docker-compose up -d
   
   # Check status
   docker-compose ps
   docker-compose logs -f
   ```

### Option 3: **Docker Hub + Any Cloud Provider**

1. **Build and Push Images:**
   ```bash
   # Build backend
   docker build -t yourusername/ai-versant-backend ./backend
   docker push yourusername/ai-versant-backend
   
   # Build frontend
   docker build -t yourusername/ai-versant-frontend ./frontend
   docker push yourusername/ai-versant-frontend
   ```

2. **Deploy on any cloud provider:**
   - Use the pushed Docker images
   - Configure environment variables
   - Set up reverse proxy (Nginx) if needed

## 🔄 CI/CD Pipeline Features

The GitHub Actions workflow includes:

### **Automated Testing:**
- ✅ Backend Python tests with pytest
- ✅ Frontend JavaScript/React tests
- ✅ Code linting and formatting checks
- ✅ Security vulnerability scanning

### **Automated Building:**
- ✅ Docker image building and pushing
- ✅ Frontend production build
- ✅ Multi-platform support

### **Automated Deployment:**
- ✅ Render.com deployment
- ✅ AWS EC2 deployment
- ✅ Docker Hub registry updates

### **Monitoring & Notifications:**
- ✅ Health checks for all services
- ✅ Slack notifications for success/failure
- ✅ Coverage reports and security scans

## 🛠️ Manual Deployment Commands

### **Local Development:**
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py

# Frontend
cd frontend
npm install
npm run dev
```

### **Production with Docker:**
```bash
# Using Docker Compose
docker-compose up -d

# Using individual containers
docker run -d --name mongodb -p 27017:27017 mongo:6.0
docker run -d --name backend -p 8000:8000 --env-file .env yourusername/ai-versant-backend
docker run -d --name frontend -p 3000:80 yourusername/ai-versant-frontend
```

## 🔍 Health Checks

After deployment, verify everything is working:

```bash
# Backend health
curl http://your-domain:8000/health

# Frontend
curl http://your-domain:3000

# Database connection
curl http://your-domain:8000/superadmin/database-status
```

## 🚨 Troubleshooting

### **Common Issues:**

1. **Port Conflicts:**
   - Ensure ports 8000, 3000, 27017 are available
   - Check firewall settings

2. **Environment Variables:**
   - Verify all required environment variables are set
   - Check secret values in GitHub Actions

3. **Database Connection:**
   - Ensure MongoDB is running and accessible
   - Check connection string format

4. **CORS Issues:**
   - Verify CORS_ORIGINS includes your frontend URL
   - Check ALLOW_ALL_CORS setting

### **Logs:**
```bash
# Docker Compose logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb

# Individual container logs
docker logs ai-versant-backend
docker logs ai-versant-frontend
```

## 📊 Monitoring

### **Performance Monitoring:**
- Backend metrics: `http://your-domain:8000/performance/metrics`
- System health: `http://your-domain:8000/performance/health`

### **Database Monitoring:**
- Connection status: `http://your-domain:8000/superadmin/database-status`
- Debug connection: `http://your-domain:8000/superadmin/debug-database-connection`

## 🔐 Security Considerations

1. **Environment Variables:**
   - Never commit `.env` files to version control
   - Use strong, unique passwords and API keys
   - Rotate secrets regularly

2. **Network Security:**
   - Use HTTPS in production
   - Configure proper firewall rules
   - Use VPN for database access if needed

3. **Application Security:**
   - Keep dependencies updated
   - Regular security scans
   - Monitor for vulnerabilities

## 📈 Scaling

### **Horizontal Scaling:**
- Use load balancers for multiple backend instances
- Implement Redis for session management
- Use MongoDB replica sets for database scaling

### **Vertical Scaling:**
- Increase EC2 instance size
- Add more memory and CPU
- Optimize database queries

## 🆘 Support

If you encounter issues:

1. Check the GitHub Actions logs
2. Review application logs
3. Verify environment configuration
4. Test individual components
5. Check network connectivity

---

**🎉 Congratulations!** Your AI-VERSANT application is now ready for production deployment with full CI/CD automation!
