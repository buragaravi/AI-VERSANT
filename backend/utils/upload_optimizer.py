"""
Upload process optimizer to prevent resource exhaustion
"""
import gc
import time
import threading
from flask import current_app
import logging

logger = logging.getLogger(__name__)

class UploadOptimizer:
    """Optimizes upload process to prevent resource exhaustion"""
    
    def __init__(self):
        self.cleanup_interval = 10  # Cleanup every 10 students
        self.last_cleanup = 0
    
    def should_cleanup(self, processed_count):
        """Check if cleanup should be performed"""
        return (processed_count % self.cleanup_interval == 0 and 
                processed_count > 0)
    
    def perform_cleanup(self):
        """Perform memory and connection cleanup"""
        try:
            current_time = time.time()
            
            # Only cleanup if enough time has passed
            if current_time - self.last_cleanup < 5:  # 5 second minimum interval
                return
            
            logger.info("🧹 Performing upload cleanup...")
            
            # Force garbage collection
            collected = gc.collect()
            logger.info(f"🗑️ Garbage collected {collected} objects")
            
            # Update last cleanup time
            self._last_cleanup = current_time
            
            # Log memory usage
            try:
                import psutil
                process = psutil.Process()
                memory_info = process.memory_info()
                memory_mb = memory_info.rss / (1024 * 1024)
                logger.info(f"💾 Memory usage: {memory_mb:.1f} MB")
            except ImportError:
                pass
                
        except Exception as e:
            logger.error(f"❌ Error during cleanup: {e}")
    
    def optimize_for_batch_size(self, batch_size):
        """Optimize settings based on batch size"""
        if batch_size > 100:
            # Large batch - more aggressive cleanup
            self.cleanup_interval = 5
            logger.info(f"📊 Large batch detected ({batch_size} students), using aggressive cleanup")
        elif batch_size > 50:
            # Medium batch - moderate cleanup
            self.cleanup_interval = 10
            logger.info(f"📊 Medium batch detected ({batch_size} students), using moderate cleanup")
        else:
            # Small batch - minimal cleanup
            self.cleanup_interval = 20
            logger.info(f"📊 Small batch detected ({batch_size} students), using minimal cleanup")
    
    def log_progress(self, processed, total, phase=""):
        """Log progress with memory info"""
        try:
            import psutil
            process = psutil.Process()
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / (1024 * 1024)
            
            percentage = (processed / total) * 100 if total > 0 else 0
            logger.info(f"📈 {phase}Progress: {processed}/{total} ({percentage:.1f}%) - Memory: {memory_mb:.1f} MB")
        except ImportError:
            percentage = (processed / total) * 100 if total > 0 else 0
            logger.info(f"📈 {phase}Progress: {processed}/{total} ({percentage:.1f}%)")

# Global upload optimizer instance
upload_optimizer = UploadOptimizer()

def optimize_upload_process(batch_size):
    """Optimize upload process for the given batch size"""
    upload_optimizer.optimize_for_batch_size(batch_size)

def cleanup_if_needed(processed_count):
    """Perform cleanup if needed"""
    if upload_optimizer.should_cleanup(processed_count):
        upload_optimizer.perform_cleanup()

def log_upload_progress(processed, total, phase=""):
    """Log upload progress with system info"""
    upload_optimizer.log_progress(processed, total, phase)
