"""
Custom exceptions for the Secure File Transfer application
"""
from typing import Optional, Dict, Any

class AppException(Exception):
    """Base exception for the application"""
    
    def __init__(self, message: str, status_code: int = 400, 
                 details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

# ============================================
# Validation & Authentication Errors
# ============================================

class ValidationError(AppException):
    """Raised when input validation fails"""
    
    def __init__(self, message: str = "Validation failed", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 400, details)

class AuthenticationError(AppException):
    """Raised when authentication fails"""
    
    def __init__(self, message: str = "Authentication failed", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 401, details)

class AuthorizationError(AppException):
    """Raised when authorization fails"""
    
    def __init__(self, message: str = "Authorization failed", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 403, details)

class NotFoundError(AppException):
    """Raised when resource is not found"""
    
    def __init__(self, message: str = "Resource not found", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 404, details)

# ============================================
# User & Account Errors
# ============================================

class UserNotFoundError(NotFoundError):
    """Raised when user is not found"""
    
    def __init__(self, message: str = "User not found", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details)

class UserAlreadyExistsError(AppException):
    """Raised when user already exists"""
    
    def __init__(self, message: str = "User already exists", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 400, details)

class AccountDisabledError(AppException):
    """Raised when account is disabled"""
    
    def __init__(self, message: str = "Account is disabled", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 403, details)

# ============================================
# File Management Errors
# ============================================

class FileError(AppException):
    """Raised for file-related errors"""
    
    def __init__(self, message: str = "File operation failed", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 400, details)

class FileNotFoundError(NotFoundError, FileError):
    """Raised when file is not found"""
    
    def __init__(self, message: str = "File not found", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details)

class FileUploadError(FileError):
    """Raised when file upload fails"""
    
    def __init__(self, message: str = "File upload failed", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 400, details)

class FileDownloadError(FileError):
    """Raised when file download fails"""
    
    def __init__(self, message: str = "File download failed", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 400, details)

class FileDeleteError(FileError):
    """Raised when file deletion fails"""
    
    def __init__(self, message: str = "File deletion failed", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 400, details)

class FileSizeExceededError(FileError):
    """Raised when file size exceeds limit"""
    
    def __init__(self, message: str = "File size exceeds maximum allowed", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 400, details)

class InvalidFileTypeError(FileError):
    """Raised when file type is not allowed"""
    
    def __init__(self, message: str = "File type not allowed", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 400, details)

# ============================================
# Sharing Errors - FIXED: Added ShareError
# ============================================

class ShareError(AppException):
    """Base exception for sharing-related errors"""
    
    def __init__(self, message: str = "Sharing operation failed", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 400, details)

class ShareRequestNotFoundError(NotFoundError, ShareError):
    """Raised when share request is not found"""
    
    def __init__(self, message: str = "Share request not found", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details)

class ShareRequestExistsError(ShareError):
    """Raised when share request already exists"""
    
    def __init__(self, message: str = "Share request already exists", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 400, details)

class SharePermissionError(ShareError, AuthorizationError):
    """Raised when user doesn't have permission to share"""
    
    def __init__(self, message: str = "You don't have permission to share this file", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 403, details)

class ShareAccessDeniedError(ShareError, AuthorizationError):
    """Raised when user doesn't have access to shared file"""
    
    def __init__(self, message: str = "You don't have access to this shared file", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 403, details)

class ShareExpiredError(ShareError):
    """Raised when share has expired"""
    
    def __init__(self, message: str = "Share has expired", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 403, details)

class ShareRevokedError(ShareError):
    """Raised when share has been revoked"""
    
    def __init__(self, message: str = "Share has been revoked", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 403, details)

# ============================================
# OTP Errors
# ============================================

class OTPError(AppException):
    """Raised for OTP-related errors"""
    
    def __init__(self, message: str = "OTP operation failed", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 400, details)

class OTPNotFoundError(NotFoundError, OTPError):
    """Raised when OTP is not found"""
    
    def __init__(self, message: str = "OTP request not found", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details)

class OTPInvalidError(OTPError):
    """Raised when OTP code is invalid"""
    
    def __init__(self, message: str = "Invalid OTP code", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 401, details)

class OTPExpiredError(OTPError):
    """Raised when OTP has expired"""
    
    def __init__(self, message: str = "OTP has expired", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 401, details)

class OTPUsedError(OTPError):
    """Raised when OTP has already been used"""
    
    def __init__(self, message: str = "OTP has already been used", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 400, details)

class OTPMaxAttemptsError(OTPError):
    """Raised when maximum OTP attempts exceeded"""
    
    def __init__(self, message: str = "Maximum OTP attempts exceeded", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 429, details)

class OTPUserMismatchError(OTPError):
    """Raised when OTP doesn't belong to user"""
    
    def __init__(self, message: str = "OTP does not belong to this user", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 403, details)

# ============================================
# Encryption Errors
# ============================================

class EncryptionError(AppException):
    """Raised for encryption-related errors"""
    
    def __init__(self, message: str = "Encryption operation failed", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 500, details)

class DecryptionError(EncryptionError):
    """Raised when decryption fails"""
    
    def __init__(self, message: str = "Decryption failed", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 500, details)

class KeyGenerationError(EncryptionError):
    """Raised when key generation fails"""
    
    def __init__(self, message: str = "Key generation failed", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 500, details)

# ============================================
# Database Errors
# ============================================

class DatabaseError(AppException):
    """Raised for database-related errors"""
    
    def __init__(self, message: str = "Database operation failed", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 500, details)

class IntegrityError(DatabaseError):
    """Raised when database integrity constraint is violated"""
    
    def __init__(self, message: str = "Data integrity violation", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 400, details)

# ============================================
# Email Errors
# ============================================

class EmailError(AppException):
    """Raised for email-related errors"""
    
    def __init__(self, message: str = "Email operation failed", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 500, details)

class EmailSendError(EmailError):
    """Raised when email sending fails"""
    
    def __init__(self, message: str = "Failed to send email", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 500, details)

# ============================================
# Rate Limiting Errors
# ============================================

class RateLimitError(AppException):
    """Raised when rate limit is exceeded"""
    
    def __init__(self, message: str = "Rate limit exceeded. Please try again later.", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 429, details)

# ============================================
# Service Errors
# ============================================

class ServiceUnavailableError(AppException):
    """Raised when a service is unavailable"""
    
    def __init__(self, message: str = "Service temporarily unavailable", 
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 503, details)

# ============================================
# Helper Functions
# ============================================

def handle_app_exception(error: AppException) -> Dict[str, Any]:
    """
    Convert AppException to response dictionary
    
    Args:
        error: AppException instance
        
    Returns:
        Dict[str, Any]: Response dictionary
    """
    response = {
        'success': False,
        'error': error.message,
        'status_code': error.status_code
    }
    
    if error.details:
        response['details'] = error.details
    
    return response

# ============================================
# Context Manager
# ============================================

class ExceptionHandler:
    """Context manager for handling exceptions in a block of code"""
    
    def __init__(self, logger=None, default_error: str = "An error occurred"):
        self.logger = logger
        self.default_error = default_error
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_value, traceback):
        if exc_type is not None:
            if self.logger:
                self.logger.error(f"Exception occurred: {exc_value}")
            
            # Re-raise AppExceptions
            if issubclass(exc_type, AppException):
                return False  # Don't suppress, let it propagate
            
            # Convert other exceptions to AppException
            raise AppException(
                message=self.default_error,
                status_code=500,
                details={'original_error': str(exc_value)}
            )
        return True