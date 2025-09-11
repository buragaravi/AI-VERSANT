# 🚀 Enterprise Deployment Guide - 200-500 Concurrent Users

This guide covers deploying the VERSANT backend to handle 200-500 concurrent users with maximum performance and reliability.

## 📋 Prerequisites

### System Requirements
- **CPU**: 8+ cores (16+ recommended)
- **RAM**: 16GB+ (32GB+ recommended)
- **Storage**: 100GB+ SSD
- **Network**: 1Gbps+ bandwidth
- **OS**: Ubuntu 20.04+ or Amazon Linux 2

### Software Requirements
```bash
# Python 3.8+
python3 --version

# Required packages
pip install -r requirements.txt

# Additional enterprise packages
pip install gunicorn eventlet psutil aiohttp
```

## 🔧 Configuration

### 1. Environment Variables
Create `.env` file with enterprise settings:

```bash
# Server Configuration
PORT=8000
FLASK_DEBUG=False
DEV_MODE=False

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/versant_enterprise
DB_POOL_SIZE=200

# Performance Configuration
MAX_WORKERS=100
CACHE_SIZE=10000
WORKER_CONNECTIONS=5000

# Security
JWT_SECRET_KEY=your_very_secure_jwt_secret_key_here
ALLOW_ALL_CORS=true

# AWS Configuration (if using S3)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_bucket_name
AWS_REGION=us-east-1
```

### 2. System Optimization

#### Ubuntu/Debian:
```bash
# Increase file descriptor limits
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Optimize kernel parameters
echo "net.core.somaxconn = 65536" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65536" >> /etc/sysctl.conf
echo "vm.swappiness = 10" >> /etc/sysctl.conf
sysctl -p

# Create RAM disk for temporary files
mkdir -p /dev/shm/versant
chmod 1777 /dev/shm/versant
```

#### Amazon Linux:
```bash
# Install required packages
sudo yum update -y
sudo yum install -y python3 python3-pip git

# Configure system limits
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf
```

## 🚀 Deployment Methods

### Method 1: Direct Gunicorn (Recommended)

```bash
# Start enterprise server
python start_enterprise.py

# Or manually with Gunicorn
gunicorn --config gunicorn_enterprise.py main:app
```

### Method 2: Systemd Service

Create `/etc/systemd/system/versant-backend.service`:

```ini
[Unit]
Description=VERSANT Enterprise Backend
After=network.target

[Service]
Type=exec
User=ubuntu
Group=ubuntu
WorkingDirectory=/path/to/your/backend
Environment=PATH=/usr/bin:/usr/local/bin
ExecStart=/usr/bin/python3 start_enterprise.py
Restart=always
RestartSec=10

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable versant-backend
sudo systemctl start versant-backend
sudo systemctl status versant-backend
```

### Method 3: Docker (Optional)

Create `Dockerfile.enterprise`:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create non-root user
RUN useradd -m -u 1000 versant
USER versant

# Expose port
EXPOSE 8000

# Start command
CMD ["python", "start_enterprise.py"]
```

Build and run:
```bash
docker build -f Dockerfile.enterprise -t versant-enterprise .
docker run -d -p 8000:8000 --name versant-backend versant-enterprise
```

## 📊 Monitoring & Performance

### 1. Performance Monitoring

Access monitoring endpoints:
- `GET /performance/metrics` - Real-time performance metrics
- `GET /performance/background-tasks` - Background task status
- `GET /dev/async-status` - Async system status (dev mode)

### 2. Load Testing

Run load tests to verify performance:
```bash
# Install load testing dependencies
pip install aiohttp

# Run load test
python load_test.py
```

### 3. Health Checks

Set up health monitoring:
```bash
# Basic health check
curl http://localhost:8000/health

# Detailed metrics
curl http://localhost:8000/performance/metrics
```

## 🔧 Performance Tuning

### 1. Database Optimization

```javascript
// MongoDB indexes for high concurrency
db.users.createIndex({ "username": 1 }, { unique: true })
db.users.createIndex({ "email": 1 }, { unique: true })
db.students.createIndex({ "user_id": 1 })
db.students.createIndex({ "batch_id": 1 })
db.students.createIndex({ "course_id": 1 })
db.test_results.createIndex({ "student_id": 1, "test_id": 1 })
db.test_results.createIndex({ "submitted_at": -1 })
```

### 2. Memory Optimization

The system automatically optimizes:
- Garbage collection thresholds
- Memory allocation patterns
- Connection pooling
- Response caching

### 3. Network Optimization

```bash
# Optimize TCP settings
echo "net.core.rmem_max = 16777216" >> /etc/sysctl.conf
echo "net.core.wmem_max = 16777216" >> /etc/sysctl.conf
echo "net.ipv4.tcp_rmem = 4096 65536 16777216" >> /etc/sysctl.conf
echo "net.ipv4.tcp_wmem = 4096 65536 16777216" >> /etc/sysctl.conf
sysctl -p
```

## 📈 Expected Performance

### Capacity
- **Concurrent Users**: 200-500
- **Requests/Second**: 1000-2000
- **Response Time**: <2s average, <5s 95th percentile
- **Memory Usage**: 8-16GB
- **CPU Usage**: 60-80%

### Scaling Points
- **200 users**: Single server, 16GB RAM
- **300 users**: Single server, 32GB RAM
- **400+ users**: Load balancer + multiple servers
- **500+ users**: Horizontal scaling required

## 🚨 Troubleshooting

### Common Issues

1. **High Memory Usage**
   ```bash
   # Check memory usage
   free -h
   ps aux --sort=-%mem | head
   
   # Restart if needed
   sudo systemctl restart versant-backend
   ```

2. **Connection Errors**
   ```bash
   # Check file descriptor limits
   ulimit -n
   
   # Check active connections
   netstat -an | grep :8000 | wc -l
   ```

3. **Slow Response Times**
   ```bash
   # Check system load
   top
   htop
   
   # Check database connections
   curl http://localhost:8000/performance/metrics
   ```

### Logs

```bash
# Application logs
journalctl -u versant-backend -f

# Gunicorn logs
tail -f /var/log/versant-backend.log
```

## 🔒 Security Considerations

1. **Firewall Configuration**
   ```bash
   # Allow only necessary ports
   sudo ufw allow 8000/tcp
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```

2. **SSL/TLS Setup**
   - Use reverse proxy (Nginx) for SSL termination
   - Configure Let's Encrypt certificates
   - Enable HTTPS redirects

3. **Database Security**
   - Use MongoDB authentication
   - Enable SSL for database connections
   - Regular security updates

## 📞 Support

For enterprise support and scaling beyond 500 users:
- Contact: support@pydahsoft.in
- Documentation: [Internal Wiki]
- Monitoring: [Grafana Dashboard]

---

**🎯 This configuration is optimized for 200-500 concurrent users with excellent performance and reliability.**
