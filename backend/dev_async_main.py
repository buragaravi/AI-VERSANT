#!/usr/bin/env python3
"""
Development Main with Async Features
Shows async activity in console for testing
"""

import os
import sys
from main import create_app, socketio

def init_async_dev():
    """Initialize async system for development"""
    try:
        from utils.async_processor import init_async_system, async_processor, db_pool, response_cache
        init_async_system()
        
        print("🚀 Async Development Mode Initialized!")
        print(f"   Workers: {async_processor.max_workers}")
        print(f"   DB Pool: {db_pool.max_connections} connections")
        print(f"   Cache: {response_cache.max_size} entries")
        print("   Monitoring: Enabled")
        
        return True
    except Exception as e:
        print(f"⚠️ Async initialization failed: {e}")
        return False

def add_async_logging():
    """Add logging to show async activity"""
    import logging
    
    # Create async logger
    async_logger = logging.getLogger('async_dev')
    async_logger.setLevel(logging.INFO)
    
    # Create console handler
    handler = logging.StreamHandler()
    handler.setLevel(logging.INFO)
    
    # Create formatter
    formatter = logging.Formatter('🔄 %(asctime)s - %(message)s')
    handler.setFormatter(formatter)
    
    # Add handler to logger
    async_logger.addHandler(handler)
    
    return async_logger

def monitor_async_activity():
    """Monitor and display async activity"""
    import threading
    import time
    
    def monitor():
        while True:
            try:
                from utils.async_processor import async_processor, db_pool, response_cache
                
                active_tasks = len(async_processor.running_tasks)
                db_connections = db_pool.connection_count
                cache_size = len(response_cache.cache)
                
                if active_tasks > 0 or db_connections > 0:
                    print(f"📊 Async Activity - Tasks: {active_tasks}, DB: {db_connections}, Cache: {cache_size}")
                
                time.sleep(2)  # Check every 2 seconds
            except:
                break
    
    # Start monitoring in background
    monitor_thread = threading.Thread(target=monitor, daemon=True)
    monitor_thread.start()

def add_dev_routes(app):
    """Add development routes to the app"""
    @app.route('/dev/async-status')
    def dev_async_status():
        """Development endpoint to check async status"""
        try:
            from utils.async_processor import async_processor, db_pool, response_cache
            
            return {
                'success': True,
                'async_system': {
                    'workers': async_processor.max_workers,
                    'active_tasks': len(async_processor.running_tasks),
                    'task_counter': async_processor.task_counter
                },
                'database_pool': {
                    'max_connections': db_pool.max_connections,
                    'active_connections': db_pool.connection_count,
                    'available_connections': db_pool.connections.qsize()
                },
                'cache': {
                    'max_size': response_cache.max_size,
                    'current_size': len(response_cache.cache),
                    'utilization': f"{(len(response_cache.cache) / response_cache.max_size) * 100:.1f}%"
                }
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    @app.route('/dev/test-parallel')
    def dev_test_parallel():
        """Development endpoint to test parallel processing"""
        try:
            from utils.async_processor import parallel_execute
            import time
            
            def slow_task(task_id):
                time.sleep(1)  # Simulate slow operation
                return f"Task {task_id} completed"
            
            start_time = time.time()
            
            # Run 3 tasks in parallel
            results = parallel_execute([lambda: slow_task(1), lambda: slow_task(2), lambda: slow_task(3)], timeout=5.0)
            
            end_time = time.time()
            
            return {
                'success': True,
                'results': results,
                'execution_time': f"{end_time - start_time:.2f}s",
                'message': 'Parallel execution test completed'
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

def main():
    """Main development function"""
    print("🌱 Starting VERSANT Backend in Development Mode with Async Features")
    print("=" * 70)
    
    # Set development mode environment variable
    os.environ['DEV_MODE'] = 'true'
    os.environ['FLASK_DEBUG'] = 'true'
    
    # Initialize async system
    async_ready = init_async_dev()
    
    # Add async logging
    async_logger = add_async_logging()
    
    # Start monitoring
    monitor_async_activity()
    
    # Import and run the main app
    from main import app, socketio as socketio_instance
    
    # Start server
    port = int(os.environ.get("PORT", 5000))
    debug = True
    
    print(f"\n🚀 Server starting on http://localhost:{port}")
    print(f"   Debug mode: {debug}")
    print(f"   Async features: {'✅ Enabled' if async_ready else '❌ Disabled'}")
    print("\n📋 Test Endpoints:")
    print(f"   http://localhost:{port}/dev/async-status")
    print(f"   http://localhost:{port}/dev/test-parallel")
    print(f"   http://localhost:{port}/async-auth/health")
    print(f"   http://localhost:{port}/performance/metrics")
    print("\n🧪 Run test script: python test_async_dev.py")
    print("=" * 70)
    
    # Start with SocketIO
    socketio_instance.run(
        app, 
        host="0.0.0.0", 
        port=port, 
        debug=debug,
        use_reloader=debug,
        log_output=True
    )

if __name__ == "__main__":
    main()
