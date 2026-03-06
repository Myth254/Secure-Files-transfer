"""
Validation utilities for input data
"""
import re
from typing import Tuple, Dict, Any, Optional

def validate_registration(data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Validate registration data
    
    Args:
        data: Registration data containing username, email, password
        
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    # Check if data exists
    if not data:
        return False, "No data provided"
    
    # Validate username
    username = data.get('username', '').strip()
    if not username:
        return False, "Username is required"
    if len(username) < 3:
        return False, "Username must be at least 3 characters"
    if len(username) > 50:
        return False, "Username cannot exceed 50 characters"
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        return False, "Username can only contain letters, numbers, underscores and hyphens"
    
    # Validate email
    email = data.get('email', '').strip().lower()
    if not email:
        return False, "Email is required"
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
        return False, "Invalid email format"
    
    # Validate password
    password = data.get('password', '')
    if not password:
        return False, "Password is required"
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if len(password) > 100:
        return False, "Password cannot exceed 100 characters"
    
    # Optional: Password strength validation
    # Uncomment if you want stronger password requirements
    """
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    """
    
    return True, None

def validate_login(data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Validate login data
    
    Args:
        data: Login data containing username and password
        
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    if not data:
        return False, "No data provided"
    
    username = data.get('username', '').strip()
    if not username:
        return False, "Username is required"
    
    password = data.get('password', '')
    if not password:
        return False, "Password is required"
    
    return True, None

def validate_email(email: str) -> Tuple[bool, Optional[str]]:
    """
    Validate email format
    
    Args:
        email: Email address to validate
        
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    if not email:
        return False, "Email is required"
    
    email = email.strip().lower()
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if not re.match(email_regex, email):
        return False, "Invalid email format"
    
    if len(email) > 120:
        return False, "Email exceeds maximum length"
    
    return True, None

def validate_password(password: str) -> Tuple[bool, Optional[str]]:
    """
    Validate password strength
    
    Args:
        password: Password to validate
        
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    if not password:
        return False, "Password is required"
    
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    
    if len(password) > 100:
        return False, "Password cannot exceed 100 characters"
    
    return True, None

def validate_username(username: str) -> Tuple[bool, Optional[str]]:
    """
    Validate username
    
    Args:
        username: Username to validate
        
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    if not username:
        return False, "Username is required"
    
    username = username.strip()
    
    if len(username) < 3:
        return False, "Username must be at least 3 characters"
    
    if len(username) > 50:
        return False, "Username cannot exceed 50 characters"
    
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        return False, "Username can only contain letters, numbers, underscores and hyphens"
    
    return True, None

def validate_file_upload(file) -> Tuple[bool, Optional[str]]:
    """
    Validate file upload
    
    Args:
        file: File object from request.files
        
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    if not file:
        return False, "No file provided"
    
    if file.filename == '':
        return False, "No file selected"
    
    # Check filename length
    if len(file.filename) > 255:
        return False, "Filename is too long"
    
    # Check for invalid characters in filename
    invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
    for char in invalid_chars:
        if char in file.filename:
            return False, f"Filename contains invalid character: {char}"
    
    return True, None

def validate_share_permissions(data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Validate file sharing permissions
    
    Args:
        data: Share permissions data
        
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    if not data:
        return False, "No data provided"
    
    file_id = data.get('file_id')
    if not file_id:
        return False, "File ID is required"
    
    recipient = data.get('recipient_username', '').strip()
    if not recipient:
        return False, "Recipient username is required"
    
    # Validate permissions are boolean
    can_view = data.get('can_view', True)
    if not isinstance(can_view, bool):
        return False, "can_view must be a boolean"
    
    can_download = data.get('can_download', False)
    if not isinstance(can_download, bool):
        return False, "can_download must be a boolean"
    
    can_reshare = data.get('can_reshare', False)
    if not isinstance(can_reshare, bool):
        return False, "can_reshare must be a boolean"
    
    # Validate expires_days if provided
    expires_days = data.get('expires_days')
    if expires_days is not None:
        try:
            expires_days = int(expires_days)
            if expires_days < 1 or expires_days > 365:
                return False, "Expiry days must be between 1 and 365"
        except (ValueError, TypeError):
            return False, "Expiry days must be a valid number"
    
    return True, None

def sanitize_input(text: str) -> str:
    """
    Sanitize user input to prevent XSS attacks
    
    Args:
        text: Raw input text
        
    Returns:
        str: Sanitized text
    """
    if not text:
        return ""
    
    # Remove potentially dangerous characters
    dangerous_chars = ['<', '>', '"', "'", '&', ';', '`', '|', '*', '?', '~', '[', ']', '{', '}', '(', ')']
    sanitized = text
    for char in dangerous_chars:
        sanitized = sanitized.replace(char, '')
    
    return sanitized.strip()