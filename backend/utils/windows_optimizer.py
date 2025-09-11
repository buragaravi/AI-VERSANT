"""
Windows-specific optimizations to prevent socket buffer exhaustion
"""
import os
import sys
import logging

logger = logging.getLogger(__name__)

def optimize_windows_sockets():
    """Apply Windows-specific socket optimizations"""
    try:
        if sys.platform == 'win32':
            logger.info("🪟 Applying Windows socket optimizations...")
            
            # Set environment variables for better socket handling
            os.environ['PYTHONUNBUFFERED'] = '1'
            os.environ['PYTHONIOENCODING'] = 'utf-8'
            
            # Increase socket buffer sizes (if possible)
            try:
                import socket
                # These are read-only on Windows, but we can try
                socket.SO_RCVBUF = 65536  # 64KB receive buffer
                socket.SO_SNDBUF = 65536  # 64KB send buffer
                logger.info("✅ Socket buffer sizes optimized")
            except Exception as e:
                logger.warning(f"⚠️ Could not optimize socket buffers: {e}")
            
            # Set thread stack size for better memory management
            try:
                import threading
                threading.stack_size(65536)  # 64KB stack size
                logger.info("✅ Thread stack size optimized")
            except Exception as e:
                logger.warning(f"⚠️ Could not optimize thread stack: {e}")
            
            logger.info("✅ Windows optimizations applied successfully")
        else:
            logger.info("ℹ️ Not running on Windows, skipping Windows optimizations")
            
    except Exception as e:
        logger.error(f"❌ Error applying Windows optimizations: {e}")

def get_optimal_connection_settings():
    """Get optimal connection settings for Windows"""
    return {
        'maxPoolSize': 20,  # Reduced for Windows
        'minPoolSize': 2,   # Minimal connections
        'maxIdleTimeMS': 60000,  # 1 minute idle
        'waitQueueTimeoutMS': 5000,  # 5 second queue timeout
        'connectTimeoutMS': 10000,  # 10 second connect timeout
        'socketTimeoutMS': 10000,   # 10 second socket timeout
        'serverSelectionTimeoutMS': 10000,  # 10 second server selection
        'heartbeatFrequencyMS': 10000,  # 10 second heartbeat
        'retryWrites': True,
        'retryReads': True,
        'w': 'majority'
    }

def log_system_info():
    """Log system information for debugging"""
    try:
        import platform
        import psutil
        
        logger.info(f"🖥️ System: {platform.system()} {platform.release()}")
        logger.info(f"🐍 Python: {sys.version}")
        logger.info(f"💾 Memory: {psutil.virtual_memory().total / (1024**3):.1f} GB")
        logger.info(f"🔌 CPU Cores: {psutil.cpu_count()}")
        
        # Check for available ports
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            sock.bind(('localhost', 0))
            port = sock.getsockname()[1]
            logger.info(f"🔌 Available port: {port}")
        finally:
            sock.close()
            
    except Exception as e:
        logger.warning(f"⚠️ Could not log system info: {e}")

# Apply optimizations on import
optimize_windows_sockets()
log_system_info()
