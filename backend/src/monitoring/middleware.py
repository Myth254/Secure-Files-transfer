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

# Sensitive query-parameter names whose values must be redacted from logs
_SENSITIVE_PARAMS = frozenset({'token', 'key', 'password', 'secret', 'api_key', 'apikey'})


class MonitoringMiddleware:
    """Monitor all HTTP requests"""
    
    def __init__(self, app):
        self.app = app
    
    def __call__(self, environ, start_response):
        # Generate request ID
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        environ['REQUEST_ID'] = request_id
        environ['REQUEST_START_TIME'] = start_time
        
        def custom_start_response(status, headers, exc_info=None):
            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # ms
            
            try:
                from flask import request
                from flask_jwt_extended import get_jwt_identity
                
                # Get user ID if authenticated; silently ignore any auth errors
                user_id = None
                try:
                    user_id = int(get_jwt_identity())
                except Exception:
                    pass
                
                # Redact sensitive query parameters before persisting to the log
                safe_params = {
                    k: '***' if k.lower() in _SENSITIVE_PARAMS else v
                    for k, v in request.args.items()
                }
                query_params = str(safe_params)
                
                # Save API log
                log = ApiRequestLog(
                    request_id=request_id,
                    user_id=user_id,
                    method=request.method,
                    endpoint=request.path,
                    query_params=query_params,
                    status_code=int(status.split()[0]),
                    response_time=response_time,
                    ip_address=request.remote_addr,
                    user_agent=request.user_agent.string if request.user_agent else None,
                    referer=request.referrer
                )
                db.session.add(log)
                db.session.commit()
                
                # Emit real-time update via WebSocket
                from src.extensions import socketio
                if socketio is not None and hasattr(socketio, 'emit'):
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
            
            headers.append(('X-Response-Time', f'{response_time:.2f}ms'))
            
            return start_response(status, headers, exc_info)
        
        return self.app(environ, custom_start_response)
