"""
Request/Response Monitoring Middleware
"""
import time
import uuid
from flask import request, g
from src.extensions import db
from src.models.monitoring import ApiRequestLog
import logging

logger = logging.getLogger(__name__)

class MonitoringMiddleware:
    """Monitor all HTTP requests"""
    
    def __init__(self, app):
        self.app = app
    
    def __call__(self, environ, start_response):
        # Generate request ID
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        # Store in environ for later use
        environ['REQUEST_ID'] = request_id
        environ['REQUEST_START_TIME'] = start_time
        
        def custom_start_response(status, headers, exc_info=None):
            # Calculate response time
            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # ms
            
            try:
                from flask import request
                from flask_jwt_extended import get_jwt_identity
                
                # Get user ID if authenticated
                user_id = None
                try:
                    user_id = int(get_jwt_identity())
                except:
                    pass
                
                # Get request size
                request_size = 0
                if request.data:
                    request_size = len(request.data)
                
                # Save API log
                log = ApiRequestLog(
                    request_id=request_id,
                    user_id=user_id,
                    method=request.method,
                    endpoint=request.path,
                    query_params=str(request.args),
                    status_code=int(status.split()[0]),
                    response_time=response_time,
                    ip_address=request.remote_addr,
                    user_agent=request.user_agent.string if request.user_agent else None,
                    referer=request.referrer,
                    request_size=request_size
                )
                db.session.add(log)
                db.session.commit()
                
                # Emit real-time update via WebSocket
                from src.extensions import socketio
                socketio.emit('api_request', log.to_dict(), namespace='/monitoring')
                
            except Exception as e:
                logger.error(f"Error saving API log: {e}")
                db.session.rollback()
            
            return start_response(status, headers, exc_info)
        
        return self.app(environ, custom_start_response)


class MetricsMiddleware:
    """Middleware for collecting request metrics"""
    
    def __init__(self, app):
        self.app = app
    
    def __call__(self, environ, start_response):
        start_time = time.time()
        
        def custom_start_response(status, headers, exc_info=None):
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            
            # Add response time header
            headers.append(('X-Response-Time', f'{response_time:.2f}ms'))
            
            return start_response(status, headers, exc_info)
        
        return self.app(environ, custom_start_response)