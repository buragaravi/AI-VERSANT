"""
Professional Analytics Routes
Provides enterprise-grade monitoring and analytics endpoints
"""

from flask import Blueprint, jsonify, request
from utils.professional_monitoring import get_monitoring_instance
import logging

# Create blueprint
professional_analytics_bp = Blueprint('professional_analytics', __name__)

@professional_analytics_bp.route('/analytics/health', methods=['GET'])
def get_system_health():
    """Get comprehensive system health status"""
    try:
        monitoring = get_monitoring_instance()
        if not monitoring:
            return jsonify({
                'error': 'Monitoring not initialized',
                'status': 'error'
            }), 500
        
        health_data = monitoring.get_system_health()
        return jsonify(health_data)
    
    except Exception as e:
        logging.error(f"Error getting system health: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@professional_analytics_bp.route('/analytics/performance', methods=['GET'])
def get_performance_analytics():
    """Get performance analytics"""
    try:
        monitoring = get_monitoring_instance()
        if not monitoring:
            return jsonify({
                'error': 'Monitoring not initialized',
                'status': 'error'
            }), 500
        
        analytics_data = monitoring.get_performance_analytics()
        return jsonify(analytics_data)
    
    except Exception as e:
        logging.error(f"Error getting performance analytics: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@professional_analytics_bp.route('/analytics/dashboard', methods=['GET'])
def get_dashboard_info():
    """Get dashboard access information"""
    try:
        return jsonify({
            'dashboard_url': '/dashboard',
            'prometheus_metrics': '/metrics',
            'description': 'Professional monitoring dashboard with real-time metrics',
            'features': [
                'Real-time request monitoring',
                'Performance analytics',
                'Error tracking',
                'System resource monitoring',
                'Custom metrics and alerts'
            ],
            'access': {
                'username': 'admin',
                'password': 'admin123',
                'note': 'Change credentials in production'
            }
        })
    
    except Exception as e:
        logging.error(f"Error getting dashboard info: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@professional_analytics_bp.route('/analytics/metrics', methods=['GET'])
def get_custom_metrics():
    """Get custom application metrics"""
    try:
        monitoring = get_monitoring_instance()
        if not monitoring:
            return jsonify({
                'error': 'Monitoring not initialized',
                'status': 'error'
            }), 500
        
        # Get current metrics
        health_data = monitoring.get_system_health()
        
        return jsonify({
            'timestamp': health_data['timestamp'],
            'system_metrics': health_data['system'],
            'process_metrics': health_data['process'],
            'network_metrics': health_data['network'],
            'status': health_data['status']
        })
    
    except Exception as e:
        logging.error(f"Error getting custom metrics: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@professional_analytics_bp.route('/analytics/endpoints', methods=['GET'])
def get_endpoint_analytics():
    """Get endpoint-specific analytics"""
    try:
        return jsonify({
            'message': 'Endpoint analytics available in monitoring dashboard',
            'dashboard_url': '/dashboard',
            'available_endpoints': [
                '/analytics/health - System health status',
                '/analytics/performance - Performance metrics',
                '/analytics/dashboard - Dashboard information',
                '/analytics/metrics - Custom metrics',
                '/analytics/endpoints - This endpoint',
                '/metrics - Prometheus metrics',
                '/dashboard - Monitoring dashboard'
            ],
            'note': 'Detailed endpoint analytics are available in the monitoring dashboard'
        })
    
    except Exception as e:
        logging.error(f"Error getting endpoint analytics: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500
