"""
Standardized response utilities for API endpoints
"""
from flask import jsonify, Response
from typing import Any, Dict, List, Optional, Union, Tuple

class APIResponse:
    """Standardized API response format"""
    
    @staticmethod
    def success(
        message: str = "Operation successful",
        data: Optional[Union[Dict, List]] = None,
        status_code: int = 200,
        **kwargs
    ) -> Tuple[Response, int]:
        """
        Create a success response

        Args:
            message: Success message
            data: Response data
            status_code: HTTP status code
            **kwargs: Additional fields

        Returns:
            Tuple[Response, int]: Flask response object with status code
        """
        response = {
            'success': True,
            'message': message,
            'status_code': status_code
        }
        
        if data is not None:
            response['data'] = data
        
        response.update(kwargs)
        
        return jsonify(response), status_code
    
    @staticmethod
    def error(
        message: str = "An error occurred",
        status_code: int = 400,
        error_type: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Tuple[Response, int]:
        """
        Create an error response.

        The `message` parameter must never contain raw exception text (str(e)).
        Always pass a fixed, developer-written string so that internal details
        are never leaked to the client.

        Args:
            message: Error message (must be a safe, pre-defined string)
            status_code: HTTP status code
            error_type: Type of error (e.g., 'validation_error')
            details: Additional error details
            **kwargs: Additional fields

        Returns:
            Tuple[Response, int]: Flask response object with status code
        """
        response = {
            'success': False,
            'error': message,
            'status_code': status_code
        }
        
        if error_type:
            response['error_type'] = error_type
        
        if details:
            response['details'] = details
        
        response.update(kwargs)
        
        return jsonify(response), status_code
    
    @staticmethod
    def paginated(
        data: List[Any],
        total: int,
        page: int,
        per_page: int,
        message: str = "Data retrieved successfully",
        **kwargs
    ) -> Tuple[Response, int]:
        """
        Create a paginated response

        Args:
            data: List of items for current page
            total: Total number of items
            page: Current page number
            per_page: Items per page
            message: Success message
            **kwargs: Additional fields

        Returns:
            Tuple[Response, int]: Flask response object with status code
        """
        total_pages = (total + per_page - 1) // per_page if per_page > 0 else 0
        
        response = {
            'success': True,
            'message': message,
            'data': data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'total_pages': total_pages,
                'has_next': page < total_pages,
                'has_prev': page > 1
            }
        }
        
        response.update(kwargs)
        
        return jsonify(response), 200
    
    @staticmethod
    def created(
        message: str = "Resource created successfully",
        data: Optional[Dict] = None,
        location: Optional[str] = None,
        **kwargs
    ) -> Tuple[Response, int]:
        """
        Create a 201 Created response

        Args:
            message: Success message
            data: Created resource data
            location: URL of created resource (for Location header)
            **kwargs: Additional fields

        Returns:
            Tuple[Response, int]: Flask response object with status code
        """
        response = APIResponse.success(
            message=message,
            data=data,
            status_code=201,
            **kwargs
        )
        
        if location:
            response[0].headers['Location'] = location
        
        return response
    
    @staticmethod
    def deleted(
        message: str = "Resource deleted successfully",
        **kwargs
    ) -> Tuple[Response, int]:
        """
        Create a 200 OK response for deletion

        Args:
            message: Success message
            **kwargs: Additional fields

        Returns:
            Tuple[Response, int]: Flask response object with status code
        """
        return APIResponse.success(
            message=message,
            status_code=200,
            **kwargs
        )
    
    @staticmethod
    def no_content() -> Tuple[str, int]:
        """
        Create a 204 No Content response

        Returns:
            Tuple[str, int]: Empty tuple with 204 status code
        """
        return '', 204

# Common response shortcuts
def validation_error(message: str = "Validation failed", details: Optional[Dict] = None) -> Tuple[Response, int]:
    """Shortcut for validation error response"""
    return APIResponse.error(
        message=message,
        status_code=400,
        error_type='validation_error',
        details=details
    )

def authentication_error(message: str = "Authentication required") -> Tuple[Response, int]:
    """Shortcut for authentication error response"""
    return APIResponse.error(
        message=message,
        status_code=401,
        error_type='authentication_error'
    )

def authorization_error(message: str = "Access denied") -> Tuple[Response, int]:
    """Shortcut for authorization error response"""
    return APIResponse.error(
        message=message,
        status_code=403,
        error_type='authorization_error'
    )

def not_found_error(message: str = "Resource not found") -> Tuple[Response, int]:
    """Shortcut for not found error response"""
    return APIResponse.error(
        message=message,
        status_code=404,
        error_type='not_found_error'
    )

def server_error(message: str = "Internal server error") -> Tuple[Response, int]:
    """Shortcut for server error response.

    Always returns a fixed, safe message.  str(e) must NEVER be passed here
    from a caller — log it server-side with exc_info=True instead.
    """
    return APIResponse.error(
        message=message,
        status_code=500,
        error_type='server_error'
    )

def rate_limit_error(message: str = "Rate limit exceeded", retry_after: Optional[int] = None) -> Tuple[Response, int]:
    """Shortcut for rate limit error response"""
    response = APIResponse.error(
        message=message,
        status_code=429,
        error_type='rate_limit_error'
    )
    
    if retry_after:
        response[0].headers['Retry-After'] = str(retry_after)
    
    return response

# Response decorator for consistent formatting
def standardized_response(func):
    """
    Decorator to standardize API responses.

    Uncaught exceptions are logged server-side (with exc_info=True so the full
    traceback is available in the log) but the client only ever receives the
    generic "An unexpected error occurred" message — str(e) is never forwarded.
    """
    from functools import wraps
    
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            result = func(*args, **kwargs)
            
            # If result is already a Response, return it
            if isinstance(result, Response):
                return result
            
            # If result is a tuple (data, status_code)
            if isinstance(result, tuple) and len(result) == 2:
                data, status_code = result
                
                if 200 <= status_code < 300:
                    return APIResponse.success(
                        data=data if data is not None else {},
                        status_code=status_code
                    )
                else:
                    # Extract a safe error message from data
                    if isinstance(data, dict) and 'error' in data:
                        message = data['error']
                    elif isinstance(data, str):
                        message = data
                    else:
                        message = f"Error with status code {status_code}"
                    
                    return APIResponse.error(
                        message=message,
                        status_code=status_code,
                        data=data if isinstance(data, dict) else None
                    )
            
            # If result is just data, assume success 200
            # Type is properly inferred as dict or list (not a tuple) due to prior checks
            safe_data: Optional[Union[Dict, List]] = None
            if isinstance(result, (dict, list)):
                safe_data = result
            return APIResponse.success(data=safe_data)
            
        except Exception as e:
            # Log full traceback server-side; return a generic message to the client.
            # str(e) is intentionally NOT forwarded to the response body.
            import logging
            logger = logging.getLogger(func.__module__)
            logger.error(f"Unhandled exception in {func.__name__}: {str(e)}", exc_info=True)
            
            return server_error("An unexpected error occurred")
    
    return wrapper