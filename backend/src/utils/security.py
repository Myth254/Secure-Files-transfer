"""
Security utilities for authentication, authorization, and security checks
"""
import os
import re
import secrets
import string
from typing import Optional, Tuple, List
from datetime import datetime, timedelta
from flask import request, current_app
from flask_jwt_extended import decode_token
import logging

logger = logging.getLogger(__name__)

class SecurityUtils:
    """Collection of security-related utilities"""
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """
        Generate a cryptographically secure token
        
        Args:
            length: Token length in bytes
            
        Returns:
            str: Secure token as hex string
        """
        return secrets.token_hex(length)
    
    @staticmethod
    def generate_api_key() -> str:
        """
        Generate a secure API key
        
        Returns:
            str: API key
        """
        # Generate a 64-character API key
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(64))
    
    @staticmethod
    def hash_api_key(api_key: str) -> str:
        """
        Hash an API key for storage
        
        Args:
            api_key: Plain API key
            
        Returns:
            str: Hashed API key
        """
        import hashlib
        import bcrypt
        
        # First hash with SHA-256
        sha256_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        # Then hash with bcrypt
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(sha256_hash.encode(), salt).decode()
    
    @staticmethod
    def verify_api_key(api_key: str, hashed_api_key: str) -> bool:
        """
        Verify an API key against its hash
        
        Args:
            api_key: Plain API key
            hashed_api_key: Hashed API key
            
        Returns:
            bool: True if API key matches
        """
        import hashlib
        import bcrypt
        
        # Hash the provided API key with SHA-256
        sha256_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        # Verify against bcrypt hash
        return bcrypt.checkpw(sha256_hash.encode(), hashed_api_key.encode())
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """
        Sanitize filename to prevent path traversal attacks
        
        Args:
            filename: Original filename
            
        Returns:
            str: Sanitized filename
        """
        # Remove directory components
        filename = os.path.basename(filename)
        
        # Remove null bytes
        filename = filename.replace('\0', '')
        
        # Remove control characters
        filename = ''.join(char for char in filename if ord(char) >= 32)
        
        # Limit length
        if len(filename) > 255:
            name, ext = os.path.splitext(filename)
            filename = name[:255 - len(ext)] + ext
        
        return filename
    
    @staticmethod
    def validate_path_traversal(path: str) -> bool:
        """
        Validate that path doesn't contain traversal attempts
        
        Args:
            path: Path to validate
            
        Returns:
            bool: True if path is safe
        """
        # Normalize path
        normalized = os.path.normpath(path)
        
        # Check for traversal attempts
        traversal_patterns = [
            '..',
            '~',
            '//',
            '\\\\'
        ]
        
        for pattern in traversal_patterns:
            if pattern in normalized:
                return False
        
        return True
    
    @staticmethod
    def get_client_ip() -> str:
        """
        Get client IP address from request
        
        Returns:
            str: Client IP address
        """
        if request.environ.get('HTTP_X_FORWARDED_FOR'):
            # If behind proxy, get the first IP
            return request.environ['HTTP_X_FORWARDED_FOR'].split(',')[0].strip()
        
        return request.environ.get('REMOTE_ADDR', '0.0.0.0')
    
    @staticmethod
    def validate_ip_address(ip: str) -> bool:
        """
        Validate IP address format
        
        Args:
            ip: IP address to validate
            
        Returns:
            bool: True if IP is valid
        """
        # IPv4 pattern
        ipv4_pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
        
        # IPv6 pattern (simplified)
        ipv6_pattern = r'^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$'
        
        if re.match(ipv4_pattern, ip):
            # Validate IPv4 octets
            octets = ip.split('.')
            for octet in octets:
                if not 0 <= int(octet) <= 255:
                    return False
            return True
        
        if re.match(ipv6_pattern, ip):
            return True
        
        return False
    
    @staticmethod
    def is_safe_url(url: str) -> bool:
        """
        Check if URL is safe (not external or malicious)
        
        Args:
            url: URL to check
            
        Returns:
            bool: True if URL is safe
        """
        from urllib.parse import urlparse
        
        try:
            parsed = urlparse(url)
            
            # Check scheme
            if parsed.scheme not in ['http', 'https', '']:
                return False
            
            # Check for JavaScript or data URLs
            if parsed.scheme in ['javascript', 'data']:
                return False
            
            # Check for suspicious characters
            suspicious_patterns = [
                '<script',
                'javascript:',
                'data:',
                'vbscript:',
                'onload=',
                'onerror=',
                'onclick='
            ]
            
            url_lower = url.lower()
            for pattern in suspicious_patterns:
                if pattern in url_lower:
                    return False
            
            return True
            
        except Exception:
            return False
    
    @staticmethod
    def check_password_strength(password: str) -> Tuple[bool, List[str]]:
        """
        Check password strength and return issues
        
        Args:
            password: Password to check
            
        Returns:
            Tuple[bool, List[str]]: (is_strong, list_of_issues)
        """
        issues = []
        
        # Check length
        if len(password) < 8:
            issues.append("Password must be at least 8 characters")
        
        # Check for uppercase
        if not re.search(r'[A-Z]', password):
            issues.append("Password must contain at least one uppercase letter")
        
        # Check for lowercase
        if not re.search(r'[a-z]', password):
            issues.append("Password must contain at least one lowercase letter")
        
        # Check for numbers
        if not re.search(r'[0-9]', password):
            issues.append("Password must contain at least one number")
        
        # Check for special characters
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            issues.append("Password must contain at least one special character")
        
        # Check for common passwords
        common_passwords = {
            'password', '123456', '12345678', '123456789',
            'qwerty', 'abc123', 'password1', 'admin'
        }
        
        if password.lower() in common_passwords:
            issues.append("Password is too common")
        
        # Check for sequential characters
        if re.search(r'(.)\1{2,}', password):
            issues.append("Password contains repeating characters")
        
        return len(issues) == 0, issues
    
    @staticmethod
    def generate_password(length: int = 16) -> str:
        """
        Generate a secure random password
        
        Args:
            length: Password length
            
        Returns:
            str: Generated password
        """
        if length < 8:
            length = 8
        
        # Character sets
        lowercase = string.ascii_lowercase
        uppercase = string.ascii_uppercase
        digits = string.digits
        special = '!@#$%^&*()-_=+[]{}|;:,.<>?'
        
        # Ensure at least one of each type
        password_chars = [
            secrets.choice(lowercase),
            secrets.choice(uppercase),
            secrets.choice(digits),
            secrets.choice(special)
        ]
        
        # Fill the rest with random characters from all sets
        all_chars = lowercase + uppercase + digits + special
        password_chars.extend(secrets.choice(all_chars) for _ in range(length - 4))
        
        # Shuffle the characters
        secrets.SystemRandom().shuffle(password_chars)
        
        return ''.join(password_chars)
    
    @staticmethod
    def validate_jwt_token(token: str) -> Tuple[bool, Optional[dict]]:
        """
        Validate JWT token
        
        Args:
            token: JWT token string
            
        Returns:
            Tuple[bool, Optional[dict]]: (is_valid, payload_or_error)
        """
        try:
            # Decode token without verification first to check format
            decoded = decode_token(token)
            
            # Check expiration
            if datetime.utcnow().timestamp() > decoded['exp']:
                return False, {'error': 'Token has expired'}
            
            # Check issuer if configured
            if 'iss' in decoded and decoded['iss'] != current_app.config.get('JWT_ISSUER'):
                return False, {'error': 'Invalid token issuer'}
            
            return True, decoded
            
        except Exception as e:
            logger.warning(f"JWT validation failed: {str(e)}")
            return False, {'error': str(e)}
    
    @staticmethod
    def rate_limit_key() -> str:
        """
        Generate rate limit key based on client IP and endpoint
        
        Returns:
            str: Rate limit key
        """
        endpoint = request.endpoint or 'unknown'
        ip = SecurityUtils.get_client_ip()
        return f"rate_limit:{endpoint}:{ip}"
    
    @staticmethod
    def validate_csrf_token(token: str) -> bool:
        """
        Validate CSRF token
        
        Args:
            token: CSRF token to validate
            
        Returns:
            bool: True if token is valid
        """
        # This is a simplified example
        # In production, use Flask-WTF or similar
        
        # Check token length
        if len(token) != 64:
            return False
        
        # Check token format (hex)
        if not re.match(r'^[a-f0-9]{64}$', token.lower()):
            return False
        
        return True

# Security middleware class
class SecurityHeaders:
    """Middleware to add security headers to responses"""
    
    DEFAULT_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    }
    
    @staticmethod
    def add_headers(response):
        """
        Add security headers to response
        
        Args:
            response: Flask response object
            
        Returns:
            Response: Response with security headers
        """
        for header, value in SecurityHeaders.DEFAULT_HEADERS.items():
            response.headers[header] = value
        
        # Add CSP header if not in development
        if not current_app.config.get('DEBUG', False):
            csp_policy = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data:; "
                "font-src 'self'; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            )
            response.headers['Content-Security-Policy'] = csp_policy
        
        return response

# Security context for auditing
class SecurityContext:
    """Context for security auditing and logging"""
    
    def __init__(self, user_id: Optional[int] = None, action: str = ''):
        self.user_id = user_id
        self.action = action
        self.timestamp = datetime.utcnow()
        self.ip_address = SecurityUtils.get_client_ip()
        self.user_agent = request.user_agent.string if request.user_agent else ''
    
    def to_dict(self) -> dict:
        """Convert context to dictionary for logging"""
        return {
            'user_id': self.user_id,
            'action': self.action,
            'timestamp': self.timestamp.isoformat(),
            'ip_address': self.ip_address,
            'user_agent': self.user_agent
        }
    
    def log_security_event(self, event_type: str, details: str = ''):
        """Log a security event"""
        log_entry = {
            'event_type': event_type,
            'context': self.to_dict(),
            'details': details
        }
        
        logger.info(f"Security event: {json.dumps(log_entry)}")