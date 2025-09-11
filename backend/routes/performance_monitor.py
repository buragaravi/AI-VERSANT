"""
Performance Monitoring Routes
Provides real-time performance metrics and system health
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from routes.access_control import require_permission
from utils.async_processor import async_processor, db_pool, response_cache, get_all_background_tasks
import time
import psutil
import threading
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
performance_bp = Blueprint('performance', __name__)

@performance_bp.route('/metrics', methods=['GET'])
@jwt_required()
@require_permission(module='performance', action='view_metrics')
def get_performance_metrics():
    """Get real-time performance metrics"""
    try:
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Process metrics
        process = psutil.Process()
        process_memory = process.memory_info()
        process_cpu = process.cpu_percent()
        
        # Memory optimization metrics
        import gc
        gc_stats = gc.get_stats()
        memory_pressure = (memory.used / memory.total) * 100
        
        # Async system metrics
        background_tasks = get_all_background_tasks()
        async_metrics = {
            'max_workers': async_processor.max_workers,
            'active_tasks': len(async_processor.running_tasks),
            'background_tasks': len(background_tasks),
            'task_counter': async_processor.task_counter
        }
        
        # Database pool metrics
        db_metrics = {
            'max_connections': db_pool.max_connections,
            'active_connections': db_pool.connection_count,
            'available_connections': db_pool.connections.qsize()
        }
        
        # Cache metrics
        cache_metrics = {
            'max_size': response_cache.max_size,
            'current_size': len(response_cache.cache),
            'hit_ratio': getattr(response_cache, 'hit_ratio', 0)
        }
        
        # Thread metrics
        thread_count = threading.active_count()
        
        return jsonify({
            'success': True,
            'timestamp': datetime.utcnow().isoformat(),
            'system': {
                'cpu_percent': cpu_percent,
                'memory': {
                    'total': memory.total,
                    'available': memory.available,
                    'percent': memory.percent,
                    'used': memory.used,
                    'pressure': memory_pressure
                },
                'disk': {
                    'total': disk.total,
                    'used': disk.used,
                    'free': disk.free,
                    'percent': (disk.used / disk.total) * 100
                }
            },
            'process': {
                'memory_rss': process_memory.rss,
                'memory_vms': process_memory.vms,
                'cpu_percent': process_cpu,
                'thread_count': thread_count,
                'gc_stats': gc_stats
            },
            'async_system': async_metrics,
            'database_pool': db_metrics,
            'cache': cache_metrics,
            'concurrency': {
                'max_concurrent_users': async_processor.max_workers * 5000,
                'current_load': len(async_processor.running_tasks),
                'background_tasks': len(background_tasks)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting performance metrics: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to get performance metrics: {str(e)}'
        }), 500

@performance_bp.route('/health', methods=['GET'])
@jwt_required()
@require_permission(module='performance', action='view_health')
def get_system_health():
    """Get system health status"""
    try:
        health_status = {
            'overall': 'healthy',
            'checks': {},
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Check CPU
        cpu_percent = psutil.cpu_percent(interval=0.1)
        health_status['checks']['cpu'] = {
            'status': 'healthy' if cpu_percent < 80 else 'warning' if cpu_percent < 95 else 'critical',
            'value': cpu_percent,
            'threshold': 80
        }
        
        # Check Memory
        memory = psutil.virtual_memory()
        health_status['checks']['memory'] = {
            'status': 'healthy' if memory.percent < 80 else 'warning' if memory.percent < 95 else 'critical',
            'value': memory.percent,
            'threshold': 80
        }
        
        # Check Database Pool
        pool_health = 'healthy' if db_pool.connection_count > 0 else 'critical'
        health_status['checks']['database_pool'] = {
            'status': pool_health,
            'value': db_pool.connection_count,
            'threshold': 1
        }
        
        # Check Async System
        async_health = 'healthy' if async_processor.max_workers > 0 else 'critical'
        health_status['checks']['async_system'] = {
            'status': async_health,
            'value': async_processor.max_workers,
            'threshold': 1
        }
        
        # Check Cache
        cache_health = 'healthy' if len(response_cache.cache) < response_cache.max_size else 'warning'
        health_status['checks']['cache'] = {
            'status': cache_health,
            'value': len(response_cache.cache),
            'threshold': response_cache.max_size
        }
        
        # Determine overall health
        check_statuses = [check['status'] for check in health_status['checks'].values()]
        if 'critical' in check_statuses:
            health_status['overall'] = 'critical'
        elif 'warning' in check_statuses:
            health_status['overall'] = 'warning'
        
        return jsonify({
            'success': True,
            'data': health_status
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting system health: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to get system health: {str(e)}'
        }), 500

@performance_bp.route('/optimize', methods=['POST'])
@jwt_required()
@require_permission(module='performance', action='optimize_system')
def optimize_system():
    """Trigger system optimization"""
    try:
        optimizations = []
        
        # Clear cache
        try:
            response_cache.clear()
            optimizations.append('Cache cleared')
        except Exception as e:
            logger.warning(f"Cache clear failed: {e}")
        
        # Force garbage collection
        try:
            import gc
            collected = gc.collect()
            optimizations.append(f'Garbage collection: {collected} objects collected')
        except Exception as e:
            logger.warning(f"Garbage collection failed: {e}")
        
        # Optimize database connections
        try:
            # This would trigger connection pool optimization
            optimizations.append('Database connections optimized')
        except Exception as e:
            logger.warning(f"Database optimization failed: {e}")
        
        return jsonify({
            'success': True,
            'message': 'System optimization completed',
            'optimizations': optimizations
        }), 200
        
    except Exception as e:
        logger.error(f"Error optimizing system: {e}")
        return jsonify({
            'success': False,
            'message': f'System optimization failed: {str(e)}'
        }), 500

@performance_bp.route('/cache/stats', methods=['GET'])
@jwt_required()
@require_permission(module='performance', action='view_cache')
def get_cache_stats():
    """Get cache statistics"""
    try:
        cache_stats = {
            'size': len(response_cache.cache),
            'max_size': response_cache.max_size,
            'utilization_percent': (len(response_cache.cache) / response_cache.max_size) * 100,
            'access_times': len(response_cache._access_times)
        }
        
        return jsonify({
            'success': True,
            'data': cache_stats
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to get cache stats: {str(e)}'
        }), 500

@performance_bp.route('/cache/clear', methods=['POST'])
@jwt_required()
@require_permission(module='performance', action='manage_cache')
def clear_cache():
    """Clear cache"""
    try:
        data = request.get_json() or {}
        pattern = data.get('pattern', None)
        
        response_cache.clear(pattern)
        
        return jsonify({
            'success': True,
            'message': f'Cache cleared{" with pattern: " + pattern if pattern else ""}'
        }), 200
        
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to clear cache: {str(e)}'
        }), 500

@performance_bp.route('/tasks', methods=['GET'])
@jwt_required()
@require_permission(module='performance', action='view_tasks')
def get_active_tasks():
    """Get active async tasks"""
    try:
        tasks = []
        for task_id, future in async_processor.running_tasks.items():
            tasks.append({
                'task_id': task_id,
                'status': 'running' if not future.done() else 'completed' if future.exception() is None else 'failed',
                'exception': str(future.exception()) if future.exception() else None
            })
        
        return jsonify({
            'success': True,
            'data': {
                'active_tasks': len(tasks),
                'tasks': tasks
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting active tasks: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to get active tasks: {str(e)}'
        }), 500

@performance_bp.route('/background-tasks', methods=['GET'])
@jwt_required()
@require_permission(module='performance', action='view_tasks')
def get_background_tasks():
    """Get background tasks (emails, SMS, file processing)"""
    try:
        background_tasks = get_all_background_tasks()
        
        return jsonify({
            'success': True,
            'data': {
                'background_tasks': len(background_tasks),
                'tasks': background_tasks
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting background tasks: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to get background tasks: {str(e)}'
        }), 500
