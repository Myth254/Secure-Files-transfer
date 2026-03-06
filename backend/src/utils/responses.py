"""
Standardized response utilities for API endpoints
"""
from flask import jsonify, Response
from typing import Any, Dict, List, Optional, Union
import json

class APIResponse:
    """Standardized API response format"""
    
    @staticmethod
    def success(
        message: str = "Operation successful",
        data: Optional[Union[Dict, List]] = None,
        status_code: int = 200,
        **kwargs
    ) -> Response:
        """
        Create a success response
        
        Args:
            message: Success message
            data: Response data
            status_code: HTTP status code
            **kwargs: Additional fields
            
        Returns:
            Response: Flask response object
        """
        response = {
            'success': True,
            'message': message,
            'status_code': status_code
        }
        
        if data is not None:
            response['data'] = data
        
        # Add any additional fields
        response.update(kwargs)
        
        return jsonify(response), status_code
    
    @staticmethod
    def error(
        message: str = "An error occurred",
        status_code: int = 400,
        error_type: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Response:
        """
        Create an error response
        
        Args:
            message: Error message
            status_code: HTTP status code
            error_type: Type of error (e.g., 'validation_error')
            details: Additional error details
            **kwargs: Additional fields
            
        Returns:
            Response: Flask response object
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
        
        # Add any additional fields
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
    ) -> Response:
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
            Response: Flask response object
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
        
        # Add any additional fields
        response.update(kwargs)
        
        return jsonify(response), 200
    
    @staticmethod
    def created(
        message: str = "Resource created successfully",
        data: Optional[Dict] = None,
        location: Optional[str] = None,
        **kwargs
    ) -> Response:
        """
        Create a 201 Created response
        
        Args:
            message: Success message
            data: Created resource data
            location: URL of created resource (for Location header)
            **kwargs: Additional fields
            
        Returns:
            Response: Flask response object
        """
        response = APIResponse.success(
            message=message,
            data=data,
            status_code=201,
            **kwargs
        )
        
        # Add Location header if provided
        if location:
            response[0].headers['Location'] = location
        
        return response
    
    @staticmethod
    def deleted(
        message: str = "Resource deleted successfully",
        **kwargs
    ) -> Response:
        """
        Create a 200 OK response for deletion
        
        Args:
            message: Success message
            **kwargs: Additional fields
            
        Returns:
            Response: Flask response object
        """
        return APIResponse.success(
            message=message,
            status_code=200,
            **kwargs
        )
    
    @staticmethod
    def no_content() -> Response:
        """
        Create a 204 No Content response
        
        Returns:
            Response: Flask response object
        """
        return '', 204

# Common response shortcuts
def validation_error(message: str = "Validation failed", details: Optional[Dict] = None) -> Response:
    """Shortcut for validation error response"""
    return APIResponse.error(
        message=message,
        status_code=400,
        error_type='validation_error',
        details=details
    )

def authentication_error(message: str = "Authentication required") -> Response:
    """Shortcut for authentication error response"""
    return APIResponse.error(
        message=message,
        status_code=401,
        error_type='authentication_error'
    )

def authorization_error(message: str = "Access denied") -> Response:
    """Shortcut for authorization error response"""
    return APIResponse.error(
        message=message,
        status_code=403,
        error_type='authorization_error'
    )

def not_found_error(message: str = "Resource not found") -> Response:
    """Shortcut for not found error response"""
    return APIResponse.error(
        message=message,
        status_code=404,
        error_type='not_found_error'
    )

def server_error(message: str = "Internal server error") -> Response:
    """Shortcut for server error response"""
    return APIResponse.error(
        message=message,
        status_code=500,
        error_type='server_error'
    )

def rate_limit_error(message: str = "Rate limit exceeded", retry_after: Optional[int] = None) -> Response:
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
    Decorator to standardize API responses
    
    Usage:
        @standardized_response
        def my_endpoint():
            return {'key': 'value'}, 200
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
                
                # Determine if it's a success or error
                if 200 <= status_code < 300:
                    return APIResponse.success(
                        data=data if data is not None else {},
                        status_code=status_code
                    )
                else:
                    # Extract error message from data
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
            return APIResponse.success(data=result)
            
        except Exception as e:
            # Handle uncaught exceptions
            import logging
            logger = logging.getLogger(func.__module__)
            logger.error(f"Unhandled exception in {func.__name__}: {str(e)}", exc_info=True)
            
            return server_error("An unexpected error occurred")
    
    return wrapper