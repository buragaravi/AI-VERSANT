#!/usr/bin/env python3
"""
Ultra-scalable startup script for 1000+ concurrent users
Optimized for maximum performance and reliability
"""

import os
import sys
import subprocess
import multiprocessing
import psutil
import logging
import time
import signal
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class UltraScalableStarter:
    """Ultra-scalable application starter"""
    
    def __init__(self):
        self.processes = []
        self.running = True
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"🛑 Received signal {signum}, shutting down...")
        self.running = False
        self._cleanup_processes()
        sys.exit(0)
    
    def _cleanup_processes(self):
        """Clean up running processes"""
        for process in self.processes:
            try:
                process.terminate()
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
            except Exception as e:
                logger.error(f"❌ Error cleaning up process: {e}")
    
    def check_system_requirements(self):
        """Check if system meets requirements for 1000+ concurrent users"""
        logger.info("🔍 Checking system requirements...")
        
        # Check CPU
        cpu_count = multiprocessing.cpu_count()
        if cpu_count < 4:
            logger.warning(f"⚠️ Low CPU count: {cpu_count}. Recommended: 4+ for 1000+ concurrent users")
        
        # Check memory
        memory_gb = psutil.virtual_memory().total / (1024**3)
        if memory_gb < 8:
            logger.warning(f"⚠️ Low memory: {memory_gb:.1f}GB. Recommended: 8GB+ for 1000+ concurrent users")
        elif memory_gb < 16:
            logger.warning(f"⚠️ Medium memory: {memory_gb:.1f}GB. Recommended: 16GB+ for optimal performance")
        
        # Check disk space
        disk_usage = psutil.disk_usage('/')
        disk_free_gb = disk_usage.free / (1024**3)
        if disk_free_gb < 10:
            logger.warning(f"⚠️ Low disk space: {disk_free_gb:.1f}GB free. Recommended: 10GB+")
        
        # Check Python version
        python_version = sys.version_info
        if python_version < (3, 8):
            logger.error(f"❌ Python version {python_version.major}.{python_version.minor} is too old. Required: 3.8+")
            return False
        
        logger.info(f"✅ System check passed:")
        logger.info(f"   CPU Cores: {cpu_count}")
        logger.info(f"   Memory: {memory_gb:.1f}GB")
        logger.info(f"   Disk Free: {disk_free_gb:.1f}GB")
        logger.info(f"   Python: {python_version.major}.{python_version.minor}.{python_version.micro}")
        
        return True
    
    def install_dependencies(self):
        """Install required dependencies"""
        logger.info("📦 Installing dependencies...")
        
        try:
            # Install Python dependencies
            subprocess.run([
                sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'
            ], check=True, cwd=Path(__file__).parent)
            
            # Install additional dependencies for ultra-scalable performance
            additional_deps = [
                'redis>=4.0.0',
                'psutil>=5.8.0',
                'gevent>=21.12.0',
                'gunicorn>=20.1.0',
                'eventlet>=0.33.0'
            ]
            
            for dep in additional_deps:
                subprocess.run([
                    sys.executable, '-m', 'pip', 'install', dep
                ], check=True)
            
            logger.info("✅ Dependencies installed successfully")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Failed to install dependencies: {e}")
            return False
    
    def setup_environment(self):
        """Setup environment variables and configuration"""
        logger.info("🔧 Setting up environment...")
        
        # Set environment variables for ultra-scalable performance
        env_vars = {
            'PYTHONUNBUFFERED': '1',
            'PYTHONIOENCODING': 'utf-8',
            'FLASK_ENV': 'production',
            'FLASK_DEBUG': '0',
            'GUNICORN_WORKERS': str(min(multiprocessing.cpu_count() * 4, 32)),
            'GUNICORN_WORKER_CONNECTIONS': '2000',
            'GUNICORN_TIMEOUT': '300',
            'MONGODB_MAX_POOL_SIZE': '500',
            'MONGODB_MIN_POOL_SIZE': '50',
            'REDIS_URL': os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
            'CACHE_TTL': '300',
            'LOG_LEVEL': 'INFO'
        }
        
        for key, value in env_vars.items():
            os.environ[key] = value
            logger.info(f"   {key}={value}")
        
        logger.info("✅ Environment setup completed")
        return True
    
    def start_application(self):
        """Start the ultra-scalable application"""
        logger.info("🚀 Starting ultra-scalable application...")
        
        try:
            # Calculate optimal workers
            cpu_count = multiprocessing.cpu_count()
            memory_gb = psutil.virtual_memory().total / (1024**3)
            
            if memory_gb >= 16:
                workers = min(cpu_count * 8, 64)
            elif memory_gb >= 8:
                workers = min(cpu_count * 6, 48)
            else:
                workers = min(cpu_count * 4, 32)
            
            workers = max(4, workers)  # Minimum 4 workers
            
            # Start Gunicorn with ultra-scalable configuration
            cmd = [
                'gunicorn',
                '--config', 'gunicorn_ultra_scalable.py',
                '--workers', str(workers),
                '--worker-class', 'gevent',
                '--worker-connections', '2000',
                '--timeout', '300',
                '--keepalive', '30',
                '--max-requests', '2000',
                '--max-requests-jitter', '200',
                '--preload-app',
                '--bind', f"0.0.0.0:{os.getenv('PORT', '8000')}",
                'main:app'
            ]
            
            logger.info(f"   Command: {' '.join(cmd)}")
            logger.info(f"   Workers: {workers}")
            logger.info(f"   Max Concurrent: {workers * 2000:,}")
            logger.info(f"   Target: 1000+ concurrent users")
            
            # Start the process
            process = subprocess.Popen(cmd, cwd=Path(__file__).parent)
            self.processes.append(process)
            
            # Wait for process to start
            time.sleep(5)
            
            if process.poll() is None:
                logger.info("✅ Ultra-scalable application started successfully")
                return True
            else:
                logger.error("❌ Application failed to start")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error starting application: {e}")
            return False
    
    def start_monitoring(self):
        """Start monitoring processes"""
        logger.info("📊 Starting monitoring...")
        
        try:
            # Start performance monitoring
            monitoring_script = Path(__file__).parent / 'utils' / 'ultra_scalable_monitor.py'
            if monitoring_script.exists():
                process = subprocess.Popen([
                    sys.executable, str(monitoring_script)
                ], cwd=Path(__file__).parent)
                self.processes.append(process)
                logger.info("✅ Performance monitoring started")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error starting monitoring: {e}")
            return False
    
    def start_nginx(self):
        """Start Nginx load balancer (if available)"""
        logger.info("🌐 Starting Nginx load balancer...")
        
        try:
            # Check if Nginx is available
            nginx_config = Path(__file__).parent / 'nginx_ultra_scalable.conf'
            if nginx_config.exists():
                # Start Nginx with ultra-scalable configuration
                process = subprocess.Popen([
                    'nginx', '-c', str(nginx_config)
                ])
                self.processes.append(process)
                logger.info("✅ Nginx load balancer started")
                return True
            else:
                logger.warning("⚠️ Nginx configuration not found, skipping load balancer")
                return False
                
        except FileNotFoundError:
            logger.warning("⚠️ Nginx not found, skipping load balancer")
            return False
        except Exception as e:
            logger.error(f"❌ Error starting Nginx: {e}")
            return False
    
    def run(self):
        """Run the ultra-scalable application"""
        logger.info("🚀 Starting Ultra-Scalable VERSANT Backend...")
        logger.info("   Target: 1000+ concurrent users")
        logger.info("   Performance: MAXIMUM")
        
        # Check system requirements
        if not self.check_system_requirements():
            logger.error("❌ System requirements not met")
            return False
        
        # Install dependencies
        if not self.install_dependencies():
            logger.error("❌ Failed to install dependencies")
            return False
        
        # Setup environment
        if not self.setup_environment():
            logger.error("❌ Failed to setup environment")
            return False
        
        # Start monitoring
        self.start_monitoring()
        
        # Start Nginx (optional)
        self.start_nginx()
        
        # Start application
        if not self.start_application():
            logger.error("❌ Failed to start application")
            return False
        
        logger.info("🎉 Ultra-scalable application is running!")
        logger.info("   Ready for 1000+ concurrent users")
        logger.info("   Press Ctrl+C to stop")
        
        # Keep running
        try:
            while self.running:
                time.sleep(1)
                
                # Check if main process is still running
                if self.processes and self.processes[0].poll() is not None:
                    logger.error("❌ Main application process died")
                    break
                    
        except KeyboardInterrupt:
            logger.info("🛑 Shutdown requested")
        finally:
            self._cleanup_processes()
            logger.info("👋 Ultra-scalable application stopped")

def main():
    """Main entry point"""
    starter = UltraScalableStarter()
    starter.run()

if __name__ == '__main__':
    main()
