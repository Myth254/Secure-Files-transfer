"""
Validation utilities for input data
"""
import re
from typing import Tuple, Dict, Any, Optional
from werkzeug.utils import secure_filename

def validate_registration(data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Validate registration data

    Args:
        data: Registration data containing username, email, password

    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
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
    
    # Validate password with full strength checks (F-18)
    password = data.get('password', '')
    valid, error = validate_password(password)
    if not valid:
        return False, error
    
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
    Validate password strength.

    Enforces minimum length, maximum length, and character-class requirements
    (uppercase, lowercase, digit, special character).

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
    
    # Enforce character-class requirements (F-18)
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
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
    Validate file upload.

    Uses werkzeug's secure_filename() to catch OS-specific edge cases in
    addition to manual checks.

    Args:
        file: File object from request.files

    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    if not file:
        return False, "No file provided"
    
    if file.filename == '':
        return False, "No file selected"
    
    # Check filename length before sanitisation
    if len(file.filename) > 255:
        return False, "Filename is too long"
    
    # Sanitise with werkzeug — rejects path traversal and OS-reserved names
    safe_name = secure_filename(file.filename)
    if not safe_name:
        return False, "Filename is invalid after sanitisation"
    
    # Check for invalid characters in the original filename
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

# NOTE: sanitize_input() has been removed.
#
# Stripping characters like <, >, (, ) from input is not the correct defence
# against XSS for a JSON API.  XSS lives in the browser when user-supplied
# content is rendered without escaping.  The correct mitigation is output
# encoding at the rendering layer (e.g. Jinja2 autoescape, React's JSX
# escaping, Content-Security-Policy headers) — not mangling input data that
# may contain legitimate characters.
#
# If you need to strip HTML from a specific field (e.g. a rich-text field),
# use a purpose-built library such as bleach with an explicit allow-list.