# Gunicorn Worker Optimization Guide

## Overview
This document explains the CPU-based worker optimization implemented across all Gunicorn configuration files in the VERSANT backend.

## CPU-Based Worker Calculation

### Formula
```
workers = min((CPU_cores * 2) + 1, max_workers)
```

### Rationale
- **Base Formula**: `(2 * CPU cores) + 1` is the industry standard for I/O-bound Flask applications
- **Why 2x CPU cores**: Our application is I/O-intensive (database, email, SMS, file uploads)
- **Why +1**: Provides a master process that can handle worker management
- **Why capped**: Prevents resource exhaustion on high-core systems

### Configuration by Environment

| Environment | CPU Formula | Max Workers | Worker Class | Notes |
|-------------|-------------|-------------|--------------|-------|
| **Default** | `(2 * CPU) + 1` | 8 | eventlet | General purpose |
| **AWS EC2** | `(2 * CPU) + 1` | 12 | eventlet | Balanced for cloud |
| **EC2 Free Tier** | `(2 * CPU) + 1` | 6 | sync | Conservative for 1GB RAM |
| **Render.com** | `(2 * CPU) + 1` | 16 | gevent | Cloud optimized |
| **Cloud Platforms** | `(2 * CPU) + 1` | 8 | gevent | Conservative for cloud |
| **Unix/Linux** | `(2 * CPU) + 1` | 12 | gevent | Production servers |
| **Enterprise** | `(2 * CPU) + 1` | 16 | eventlet | High-performance |
| **Ultra-Scalable** | Memory-adjusted | 24 | eventlet | Advanced resource calculation |

### Ultra-Scalable Configuration
The `gunicorn_ultra_scalable.py` uses an advanced calculation that considers both CPU and memory:

```python
base_workers = (cpu_count * 2) + 1

if memory_gb >= 16:    # High-memory system
    workers = min(base_workers * 2, 24)   # Up to 24 workers
elif memory_gb >= 8:   # Medium-memory system  
    workers = min(base_workers * 1.5, 18) # Up to 18 workers
elif memory_gb >= 4:   # Low-memory system
    workers = min(base_workers, 12)       # Up to 12 workers
else:                  # Very low memory
    workers = min(base_workers * 0.75, 8) # Up to 8 workers
```

## Benefits

### 1. **Optimal Resource Utilization**
- Automatically scales with available CPU cores
- Prevents over-provisioning on high-core systems
- Ensures minimum viable workers on low-core systems

### 2. **Performance Optimization**
- **I/O-bound workloads**: Multiple workers handle concurrent database/email/SMS operations
- **Eventlet/Gevent**: Each worker can handle 1000+ concurrent connections
- **Memory efficiency**: Prevents memory bloat from too many workers

### 3. **Cost Optimization**
- **Cloud platforms**: Right-sizes workers based on instance type
- **Free tiers**: Conservative settings prevent resource exhaustion
- **Auto-scaling**: Adapts to different server configurations

## Examples

### 1-Core System (EC2 Free Tier)
```
CPU cores: 1
Workers: min((1 * 2) + 1, 6) = 3 workers
```

### 2-Core System (Small VPS)
```
CPU cores: 2  
Workers: min((2 * 2) + 1, 8) = 5 workers
```

### 4-Core System (Medium Server)
```
CPU cores: 4
Workers: min((4 * 2) + 1, 12) = 9 workers
```

### 8-Core System (Large Server)
```
CPU cores: 8
Workers: min((8 * 2) + 1, 16) = 16 workers (capped)
```

## Monitoring

### Key Metrics to Monitor
1. **CPU Usage**: Should be 60-80% under load
2. **Memory Usage**: Each worker ~50-200MB
3. **Response Time**: Should remain stable with worker count
4. **Throughput**: Requests per second should scale with workers

### Signs of Over-provisioning
- CPU usage consistently below 50%
- High memory usage without high throughput
- Worker processes frequently idle

### Signs of Under-provisioning  
- CPU usage consistently above 90%
- High response times under load
- Request queue buildup

## Migration Notes

### Before (Aggressive)
```python
# Old aggressive settings
workers = min(multiprocessing.cpu_count() * 8, 32)  # Too many!
```

### After (Optimized)
```python
# New CPU-based settings
cpu_count = multiprocessing.cpu_count()
workers = min((cpu_count * 2) + 1, 12)  # Balanced
```

### Performance Impact
- **Reduced memory usage**: 50-75% less memory consumption
- **Better stability**: Fewer context switches and process overhead
- **Improved reliability**: Less likely to hit resource limits
- **Cost savings**: Lower resource requirements on cloud platforms

## Best Practices

### 1. **Start Conservative**
- Begin with the calculated worker count
- Monitor performance under real load
- Adjust based on actual usage patterns

### 2. **Environment-Specific Tuning**
- **Development**: Use fewer workers for faster startup
- **Staging**: Match production worker count
- **Production**: Monitor and adjust based on metrics

### 3. **Resource Monitoring**
- Set up alerts for CPU/memory usage
- Monitor worker process health
- Track request queue depth

### 4. **Load Testing**
- Test with expected concurrent users
- Verify worker count handles peak load
- Ensure graceful degradation under stress

## Configuration Files Updated

All Gunicorn configuration files have been updated with CPU-based worker optimization:

- ✅ `gunicorn_config.py` - Default configuration
- ✅ `gunicorn_aws_optimized.py` - AWS EC2 optimized  
- ✅ `gunicorn_ec2_optimized.py` - EC2 free tier
- ✅ `gunicorn_render_optimized.py` - Render.com
- ✅ `gunicorn_render_config.py` - Render.com basic
- ✅ `gunicorn_cloud_config.py` - General cloud platforms
- ✅ `gunicorn_unix_config.py` - Unix/Linux production
- ✅ `gunicorn_enterprise.py` - Enterprise deployment
- ✅ `gunicorn_ultra_scalable.py` - Advanced resource calculation

## Conclusion

The CPU-based worker optimization ensures optimal performance across all deployment environments while preventing resource exhaustion. This approach scales automatically with available hardware and provides consistent performance characteristics across different hosting platforms.
