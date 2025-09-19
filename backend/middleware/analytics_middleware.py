"""
Analytics Middleware
Automatically tracks all requests for comprehensive analytics
"""

import time
from flask import request, g
from utils.advanced_analytics import track_request

def init_analytics_middleware(app):
    """Initialize analytics middleware for the Flask app"""
    
    @app.before_request
    def before_request():
        """Track request start time"""
        g.start_time = time.time()
    
    @app.after_request
    def after_request(response):
        """Track request completion and metrics"""
        try:
            # Calculate response time
            response_time = time.time() - g.start_time if hasattr(g, 'start_time') else 0
            
            # Get request details
            endpoint = request.endpoint or request.path
            method = request.method
            response_code = response.status_code
            
            # Estimate bytes (this is approximate)
            bytes_sent = len(response.get_data()) if response.get_data() else 0
            bytes_received = request.content_length or 0
            
            # Track the request
            track_request(
                endpoint=endpoint,
                method=method,
                response_code=response_code,
                response_time=response_time,
                bytes_sent=bytes_sent,
                bytes_received=bytes_received
            )
            
        except Exception as e:
            # Don't let analytics errors break the request
            print(f"Analytics tracking error: {e}")
        
        return response
