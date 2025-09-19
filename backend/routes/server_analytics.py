#!/usr/bin/env python3
"""
Server Analytics API Routes
Provides comprehensive server analytics based on log analysis
"""

from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
import logging
from utils.log_analytics import get_server_analytics, get_endpoint_analytics, analytics_engine

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint
server_analytics_bp = Blueprint('server_analytics', __name__)

@server_analytics_bp.route('/overview', methods=['GET', 'OPTIONS'])
def get_analytics_overview():
    """Get comprehensive server analytics overview"""
    try:
        analytics_data = get_server_analytics()
        
        if 'error' in analytics_data:
            return jsonify({
                'success': False,
                'message': 'Error retrieving analytics',
                'error': analytics_data['error']
            }), 500
        
        return jsonify({
            'success': True,
            'message': 'Server analytics retrieved successfully',
            'data': analytics_data
        })
        
    except Exception as e:
        logger.error(f"❌ Error in analytics overview: {e}")
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500

@server_analytics_bp.route('/endpoint/<path:endpoint>', methods=['GET', 'OPTIONS'])
def get_endpoint_analytics_route(endpoint):
    """Get detailed analytics for a specific endpoint"""
    try:
        analytics_data = get_endpoint_analytics(endpoint)
        
        if 'error' in analytics_data:
            return jsonify({
                'success': False,
                'message': f'Error retrieving analytics for endpoint: {endpoint}',
                'error': analytics_data['error']
            }), 404
        
        return jsonify({
            'success': True,
            'message': f'Endpoint analytics retrieved successfully for: {endpoint}',
            'data': analytics_data
        })
        
    except Exception as e:
        logger.error(f"❌ Error in endpoint analytics: {e}")
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500

@server_analytics_bp.route('/real-time', methods=['GET', 'OPTIONS'])
def get_real_time_metrics():
    """Get real-time server metrics"""
    try:
        current_time = datetime.now()
        last_5_minutes = current_time - timedelta(minutes=5)
        
        # Get recent metrics from buffer
        recent_metrics = [m for m in analytics_engine.metrics_buffer 
                         if m.timestamp >= last_5_minutes]
        
        # Calculate real-time stats
        total_requests = len(recent_metrics)
        requests_per_minute = total_requests / 5
        
        # Response time stats
        response_times = [m.response_time for m in recent_metrics if m.response_time > 0]
        avg_response_time = sum(response_times) / max(len(response_times), 1)
        
        # Error rate
        error_count = sum(1 for m in recent_metrics if m.status_code >= 400)
        error_rate = (error_count / max(total_requests, 1)) * 100
        
        # Top endpoints in last 5 minutes
        endpoint_counts = {}
        for metric in recent_metrics:
            endpoint_counts[metric.endpoint] = endpoint_counts.get(metric.endpoint, 0) + 1
        
        top_endpoints = sorted(endpoint_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return jsonify({
            'success': True,
            'message': 'Real-time metrics retrieved successfully',
            'data': {
                'timestamp': current_time.isoformat(),
                'time_window': '5 minutes',
                'total_requests': total_requests,
                'requests_per_minute': round(requests_per_minute, 2),
                'avg_response_time': round(avg_response_time, 3),
                'error_rate': round(error_rate, 2),
                'top_endpoints': [
                    {'endpoint': endpoint, 'requests': count} 
                    for endpoint, count in top_endpoints
                ],
                'status_codes': {
                    '2xx': sum(1 for m in recent_metrics if 200 <= m.status_code < 300),
                    '3xx': sum(1 for m in recent_metrics if 300 <= m.status_code < 400),
                    '4xx': sum(1 for m in recent_metrics if 400 <= m.status_code < 500),
                    '5xx': sum(1 for m in recent_metrics if 500 <= m.status_code < 600)
                }
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Error in real-time metrics: {e}")
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500

@server_analytics_bp.route('/performance', methods=['GET', 'OPTIONS'])
def get_performance_metrics():
    """Get server performance metrics"""
    try:
        performance_data = analytics_engine.performance_stats
        
        # Add additional performance metrics
        current_time = datetime.now()
        uptime_hours = (current_time - analytics_engine.performance_stats.get('start_time', current_time)).total_seconds() / 3600
        
        return jsonify({
            'success': True,
            'message': 'Performance metrics retrieved successfully',
            'data': {
                'uptime_hours': round(uptime_hours, 2),
                'total_requests_processed': performance_data.get('total_requests_processed', 0),
                'analytics_processing_time': performance_data.get('analytics_processing_time', 0),
                'last_analysis_time': performance_data.get('last_analysis_time'),
                'log_files_processed': performance_data.get('log_files_processed', 0),
                'buffer_size': len(analytics_engine.metrics_buffer),
                'max_buffer_size': analytics_engine.max_entries,
                'monitoring_active': analytics_engine.running
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Error in performance metrics: {e}")
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500

@server_analytics_bp.route('/errors', methods=['GET', 'OPTIONS'])
def get_error_analytics():
    """Get error analytics and patterns"""
    try:
        error_data = analytics_engine.error_patterns
        current_time = datetime.now()
        last_hour = current_time - timedelta(hours=1)
        
        # Get recent errors
        recent_errors = [m for m in analytics_engine.metrics_buffer 
                        if m.timestamp >= last_hour and m.status_code >= 400]
        
        # Error rate by endpoint
        endpoint_errors = {}
        for error in recent_errors:
            endpoint_errors[error.endpoint] = endpoint_errors.get(error.endpoint, 0) + 1
        
        # Most common error patterns
        top_error_patterns = sorted(error_data.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return jsonify({
            'success': True,
            'message': 'Error analytics retrieved successfully',
            'data': {
                'total_errors_last_hour': len(recent_errors),
                'error_patterns': [
                    {'pattern': pattern, 'count': count} 
                    for pattern, count in top_error_patterns
                ],
                'errors_by_endpoint': [
                    {'endpoint': endpoint, 'error_count': count} 
                    for endpoint, count in sorted(endpoint_errors.items(), key=lambda x: x[1], reverse=True)
                ],
                'recent_errors': [
                    {
                        'timestamp': error.timestamp.isoformat(),
                        'endpoint': error.endpoint,
                        'status_code': error.status_code,
                        'error_message': error.error_message
                    } for error in recent_errors[-20:]  # Last 20 errors
                ]
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Error in error analytics: {e}")
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500

@server_analytics_bp.route('/usage-patterns', methods=['GET', 'OPTIONS'])
def get_usage_patterns():
    """Get usage patterns and trends"""
    try:
        current_time = datetime.now()
        last_24h = current_time - timedelta(hours=24)
        
        # Get daily metrics
        daily_metrics = [m for m in analytics_engine.metrics_buffer if m.timestamp >= last_24h]
        
        # Group by hour
        hourly_usage = {}
        for metric in daily_metrics:
            hour = metric.timestamp.hour
            hourly_usage[hour] = hourly_usage.get(hour, 0) + 1
        
        # Peak usage hours
        peak_hours = sorted(hourly_usage.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Usage by day of week
        weekday_usage = {}
        for metric in daily_metrics:
            weekday = metric.timestamp.strftime('%A')
            weekday_usage[weekday] = weekday_usage.get(weekday, 0) + 1
        
        # Most active endpoints
        endpoint_usage = {}
        for metric in daily_metrics:
            endpoint_usage[metric.endpoint] = endpoint_usage.get(metric.endpoint, 0) + 1
        
        top_endpoints = sorted(endpoint_usage.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return jsonify({
            'success': True,
            'message': 'Usage patterns retrieved successfully',
            'data': {
                'hourly_usage': [
                    {'hour': hour, 'requests': count} 
                    for hour, count in sorted(hourly_usage.items())
                ],
                'peak_hours': [
                    {'hour': hour, 'requests': count} 
                    for hour, count in peak_hours
                ],
                'weekday_usage': [
                    {'day': day, 'requests': count} 
                    for day, count in weekday_usage.items()
                ],
                'top_endpoints': [
                    {'endpoint': endpoint, 'requests': count} 
                    for endpoint, count in top_endpoints
                ],
                'total_requests_24h': len(daily_metrics),
                'avg_requests_per_hour': round(len(daily_metrics) / 24, 2)
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Error in usage patterns: {e}")
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500

@server_analytics_bp.route('/health', methods=['GET', 'OPTIONS'])
def get_analytics_health():
    """Get analytics system health status"""
    try:
        return jsonify({
            'success': True,
            'message': 'Analytics system health retrieved successfully',
            'data': {
                'monitoring_active': analytics_engine.running,
                'buffer_size': len(analytics_engine.metrics_buffer),
                'max_buffer_size': analytics_engine.max_entries,
                'last_analysis': analytics_engine.performance_stats.get('last_analysis_time'),
                'total_requests_processed': analytics_engine.performance_stats.get('total_requests_processed', 0),
                'log_files_processed': analytics_engine.performance_stats.get('log_files_processed', 0),
                'analytics_processing_time': analytics_engine.performance_stats.get('analytics_processing_time', 0)
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Error in analytics health: {e}")
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500

@server_analytics_bp.route('/export', methods=['GET', 'OPTIONS'])
def export_analytics():
    """Export analytics data for external analysis"""
    try:
        # Get time range from query parameters
        hours = request.args.get('hours', 24, type=int)
        format_type = request.args.get('format', 'json')
        
        current_time = datetime.now()
        start_time = current_time - timedelta(hours=hours)
        
        # Filter metrics by time range
        filtered_metrics = [m for m in analytics_engine.metrics_buffer if m.timestamp >= start_time]
        
        if format_type == 'csv':
            # Generate CSV format
            csv_data = "timestamp,endpoint,method,status_code,response_time,ip_address\n"
            for metric in filtered_metrics:
                csv_data += f"{metric.timestamp.isoformat()},{metric.endpoint},{metric.method},{metric.status_code},{metric.response_time},{metric.ip_address or 'N/A'}\n"
            
            return csv_data, 200, {'Content-Type': 'text/csv'}
        
        else:
            # Return JSON format
            return jsonify({
                'success': True,
                'message': f'Analytics data exported for last {hours} hours',
                'data': {
                    'time_range': {
                        'start': start_time.isoformat(),
                        'end': current_time.isoformat(),
                        'hours': hours
                    },
                    'total_requests': len(filtered_metrics),
                    'metrics': [
                        {
                            'timestamp': metric.timestamp.isoformat(),
                            'endpoint': metric.endpoint,
                            'method': metric.method,
                            'status_code': metric.status_code,
                            'response_time': metric.response_time,
                            'ip_address': metric.ip_address,
                            'error_message': metric.error_message
                        } for metric in filtered_metrics
                    ]
                }
            })
        
    except Exception as e:
        logger.error(f"❌ Error in analytics export: {e}")
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500
