"""
Enhanced Analytics Routes
Provides comprehensive server analytics with detailed insights
"""

from flask import Blueprint, jsonify, request
from utils.advanced_analytics import get_analytics_instance, track_request
import logging

# Create blueprint
enhanced_analytics_bp = Blueprint('enhanced_analytics', __name__)

@enhanced_analytics_bp.route('/analytics/requests', methods=['GET'])
def get_request_analytics():
    """Get detailed request analytics for different time periods"""
    try:
        analytics = get_analytics_instance()
        if not analytics:
            return jsonify({
                'error': 'Analytics not initialized',
                'status': 'error'
            }), 500
        
        time_period = request.args.get('period', '1hour')
        analytics_data = analytics.get_request_analytics(time_period)
        
        return jsonify({
            'success': True,
            'data': analytics_data,
            'timestamp': analytics_data.get('timestamp', 'N/A')
        })
    
    except Exception as e:
        logging.error(f"Error getting request analytics: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@enhanced_analytics_bp.route('/analytics/endpoints', methods=['GET'])
def get_endpoint_analytics():
    """Get detailed endpoint performance analytics"""
    try:
        analytics = get_analytics_instance()
        if not analytics:
            return jsonify({
                'error': 'Analytics not initialized',
                'status': 'error'
            }), 500
        
        endpoint = request.args.get('endpoint')
        performance_data = analytics.get_endpoint_performance(endpoint)
        
        return jsonify({
            'success': True,
            'data': performance_data,
            'endpoint': endpoint or 'all'
        })
    
    except Exception as e:
        logging.error(f"Error getting endpoint analytics: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@enhanced_analytics_bp.route('/analytics/errors', methods=['GET'])
def get_error_analytics():
    """Get detailed error analytics and response codes"""
    try:
        analytics = get_analytics_instance()
        if not analytics:
            return jsonify({
                'error': 'Analytics not initialized',
                'status': 'error'
            }), 500
        
        # Get error data
        error_data = {
            'total_errors': analytics.error_count,
            'error_rate': (analytics.error_count / analytics.request_count * 100) if analytics.request_count > 0 else 0,
            'errors_by_endpoint': dict(analytics.errors_by_endpoint),
            'response_codes': dict(analytics.response_codes),
            'recent_errors': analytics.error_details[-50:],  # Last 50 errors
            'error_trends': analytics.get_time_based_analytics()
        }
        
        return jsonify({
            'success': True,
            'data': error_data
        })
    
    except Exception as e:
        logging.error(f"Error getting error analytics: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@enhanced_analytics_bp.route('/analytics/performance', methods=['GET'])
def get_performance_analytics():
    """Get detailed performance analytics including response times"""
    try:
        analytics = get_analytics_instance()
        if not analytics:
            return jsonify({
                'error': 'Analytics not initialized',
                'status': 'error'
            }), 500
        
        # Get performance data
        performance_data = {
            'average_response_time': analytics.get_average_response_time(),
            'slowest_endpoints': sorted(
                [(ep, sum(times)/len(times) if times else 0, len(times)) for ep, times in analytics.response_times.items()],
                key=lambda x: x[1], reverse=True
            )[:20],
            'fastest_endpoints': sorted(
                [(ep, sum(times)/len(times) if times else 0, len(times)) for ep, times in analytics.response_times.items()],
                key=lambda x: x[1]
            )[:20],
            'response_time_distribution': analytics.get_response_time_distribution(),
            'peak_performance_hours': analytics.get_peak_hours()
        }
        
        return jsonify({
            'success': True,
            'data': performance_data
        })
    
    except Exception as e:
        logging.error(f"Error getting performance analytics: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@enhanced_analytics_bp.route('/analytics/network', methods=['GET'])
def get_network_analytics():
    """Get detailed network usage analytics"""
    try:
        analytics = get_analytics_instance()
        if not analytics:
            return jsonify({
                'error': 'Analytics not initialized',
                'status': 'error'
            }), 500
        
        # Get network data
        network_data = {
            'total_bytes_sent': analytics.bytes_sent,
            'total_bytes_received': analytics.bytes_received,
            'total_transfer': analytics.bytes_sent + analytics.bytes_received,
            'network_by_endpoint': dict(analytics.network_by_endpoint),
            'top_network_endpoints': sorted(
                analytics.network_by_endpoint.items(),
                key=lambda x: x[1]['sent'] + x[1]['received'],
                reverse=True
            )[:20],
            'network_trends': analytics.get_time_based_analytics()
        }
        
        return jsonify({
            'success': True,
            'data': network_data
        })
    
    except Exception as e:
        logging.error(f"Error getting network analytics: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@enhanced_analytics_bp.route('/analytics/system', methods=['GET'])
def get_system_analytics():
    """Get detailed system health and resource analytics"""
    try:
        analytics = get_analytics_instance()
        if not analytics:
            return jsonify({
                'error': 'Analytics not initialized',
                'status': 'error'
            }), 500
        
        system_data = analytics.get_system_health_detailed()
        
        return jsonify({
            'success': True,
            'data': system_data
        })
    
    except Exception as e:
        logging.error(f"Error getting system analytics: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@enhanced_analytics_bp.route('/analytics/time-based', methods=['GET'])
def get_time_based_analytics():
    """Get analytics broken down by time periods (1 hour, 5 hours, 1 day)"""
    try:
        analytics = get_analytics_instance()
        if not analytics:
            return jsonify({
                'error': 'Analytics not initialized',
                'status': 'error'
            }), 500
        
        time_data = analytics.get_time_based_analytics()
        
        return jsonify({
            'success': True,
            'data': time_data
        })
    
    except Exception as e:
        logging.error(f"Error getting time-based analytics: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@enhanced_analytics_bp.route('/analytics/comprehensive', methods=['GET'])
def get_comprehensive_analytics():
    """Get comprehensive analytics combining all metrics"""
    try:
        analytics = get_analytics_instance()
        if not analytics:
            return jsonify({
                'error': 'Analytics not initialized',
                'status': 'error'
            }), 500
        
        comprehensive_data = analytics.get_comprehensive_analytics()
        
        return jsonify({
            'success': True,
            'data': comprehensive_data
        })
    
    except Exception as e:
        logging.error(f"Error getting comprehensive analytics: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@enhanced_analytics_bp.route('/analytics/real-time', methods=['GET'])
def get_real_time_analytics():
    """Get real-time analytics for live monitoring"""
    try:
        analytics = get_analytics_instance()
        if not analytics:
            return jsonify({
                'error': 'Analytics not initialized',
                'status': 'error'
            }), 500
        
        # Get real-time data
        real_time_data = {
            'current_requests_per_second': analytics.request_count / (time.time() - analytics.start_time) if time.time() > analytics.start_time else 0,
            'current_error_rate': (analytics.error_count / analytics.request_count * 100) if analytics.request_count > 0 else 0,
            'current_avg_response_time': analytics.get_average_response_time(),
            'active_endpoints': len(analytics.requests_by_endpoint),
            'system_health': analytics.calculate_system_health(),
            'recent_requests': list(analytics.requests_by_minute.items())[-10:],  # Last 10 minutes
            'recent_errors': analytics.error_details[-10:],  # Last 10 errors
            'current_network_usage': {
                'bytes_sent': analytics.bytes_sent,
                'bytes_received': analytics.bytes_received
            }
        }
        
        return jsonify({
            'success': True,
            'data': real_time_data
        })
    
    except Exception as e:
        logging.error(f"Error getting real-time analytics: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@enhanced_analytics_bp.route('/analytics/top-endpoints', methods=['GET'])
def get_top_endpoints():
    """Get top endpoints by various metrics"""
    try:
        analytics = get_analytics_instance()
        if not analytics:
            return jsonify({
                'error': 'Analytics not initialized',
                'status': 'error'
            }), 500
        
        metric = request.args.get('metric', 'requests')  # requests, errors, response_time, network
        
        if metric == 'requests':
            top_data = sorted(analytics.requests_by_endpoint.items(), key=lambda x: x[1], reverse=True)[:20]
        elif metric == 'errors':
            top_data = sorted(analytics.errors_by_endpoint.items(), key=lambda x: x[1], reverse=True)[:20]
        elif metric == 'response_time':
            top_data = sorted(
                [(ep, sum(times)/len(times) if times else 0) for ep, times in analytics.response_times.items()],
                key=lambda x: x[1], reverse=True
            )[:20]
        elif metric == 'network':
            top_data = sorted(
                analytics.network_by_endpoint.items(),
                key=lambda x: x[1]['sent'] + x[1]['received'],
                reverse=True
            )[:20]
        else:
            top_data = []
        
        return jsonify({
            'success': True,
            'metric': metric,
            'data': top_data
        })
    
    except Exception as e:
        logging.error(f"Error getting top endpoints: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500
