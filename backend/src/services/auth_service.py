"""
Authentication Service
Handles user authentication and authorization logic
"""
import re
import logging
from typing import Optional, Tuple, Dict, Any
from src.extensions import db
from src.models.user import User
from src.models.log import Log
from src.services.encryption_service import EncryptionService
from src.utils.exceptions import AuthenticationError, ValidationError

logger = logging.getLogger(__name__)

class AuthService:
    """Service for authentication and user management"""
    
    # Validation constants
    MIN_USERNAME_LENGTH = 3
    MAX_USERNAME_LENGTH = 50
    MIN_PASSWORD_LENGTH = 8
    MAX_PASSWORD_LENGTH = 100
    EMAIL_REGEX = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    @staticmethod
    def validate_username(username: str) -> Tuple[bool, str]:
        """
        Validate username
        
        Args:
            username: Username to validate
            
        Returns:
            Tuple[bool, str]: (is_valid, error_message)
        """
        username = username.strip()
        
        if not username:
            return False, "Username is required"
        
        if len(username) < AuthService.MIN_USERNAME_LENGTH:
            return False, f"Username must be at least {AuthService.MIN_USERNAME_LENGTH} characters"
        
        if len(username) > AuthService.MAX_USERNAME_LENGTH:
            return False, f"Username cannot exceed {AuthService.MAX_USERNAME_LENGTH} characters"
        
        # Check for allowed characters (alphanumeric, underscore, hyphen)
        if not re.match(r'^[a-zA-Z0-9_-]+$', username):
            return False, "Username can only contain letters, numbers, underscores, and hyphens"
        
        return True, ""
    
    @staticmethod
    def validate_email(email: str) -> Tuple[bool, str]:
        """
        Validate email address
        
        Args:
            email: Email to validate
            
        Returns:
            Tuple[bool, str]: (is_valid, error_message)
        """
        email = email.strip().lower()
        
        if not email:
            return False, "Email is required"
        
        if not re.match(AuthService.EMAIL_REGEX, email):
            return False, "Invalid email format"
        
        return True, ""
    
    @staticmethod
    def validate_password(password: str) -> Tuple[bool, str]:
        """
        Validate password strength
        
        Args:
            password: Password to validate
            
        Returns:
            Tuple[bool, str]: (is_valid, error_message)
        """
        if not password:
            return False, "Password is required"
        
        if len(password) < AuthService.MIN_PASSWORD_LENGTH:
            return False, f"Password must be at least {AuthService.MIN_PASSWORD_LENGTH} characters"
        
        if len(password) > AuthService.MAX_PASSWORD_LENGTH:
            return False, f"Password cannot exceed {AuthService.MAX_PASSWORD_LENGTH} characters"
        
        # Optional: Add password strength requirements
        # if not re.search(r'[A-Z]', password):
        #     return False, "Password must contain at least one uppercase letter"
        # if not re.search(r'[a-z]', password):
        #     return False, "Password must contain at least one lowercase letter"
        # if not re.search(r'[0-9]', password):
        #     return False, "Password must contain at least one number"
        
        return True, ""
    
    @staticmethod
    def register_user(username: str, email: str, password: str) -> Tuple[User, str]:
        """
        Register a new user
        
        Args:
            username: Username
            email: Email address
            password: Plain text password
            
        Returns:
            Tuple[User, str]: (user_object, private_key_pem)
            
        Raises:
            ValidationError: If validation fails
        """
        try:
            # Validate inputs
            is_valid, error = AuthService.validate_username(username)
            if not is_valid:
                raise ValidationError(f"Username validation failed: {error}")
            
            is_valid, error = AuthService.validate_email(email)
            if not is_valid:
                raise ValidationError(f"Email validation failed: {error}")
            
            is_valid, error = AuthService.validate_password(password)
            if not is_valid:
                raise ValidationError(f"Password validation failed: {error}")
            
            # Check if user already exists
            if User.query.filter_by(username=username).first():
                raise ValidationError("Username already exists")
            
            if User.query.filter_by(email=email).first():
                raise ValidationError("Email already registered")
            
            # Hash password
            password_hash = EncryptionService.hash_password(password)
            
            # Generate RSA key pair
            private_key_pem, public_key_pem = EncryptionService.generate_rsa_keypair()
            
            # Encrypt private key for storage
            encrypted_private_key = EncryptionService.encrypt_private_key(
                private_key_pem, 
                password
            )
            
            # Create user
            user = User(
                username=username,
                email=email,
                password_hash=password_hash,
                rsa_public_key=public_key_pem,
                rsa_private_key_encrypted=encrypted_private_key
            )
            
            db.session.add(user)
            db.session.flush()  # Get user ID without committing
            
            logger.info(f"User registered: {username} (ID: {user.id})")
            
            return user, private_key_pem
            
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Registration failed for {username}: {str(e)}")
            raise ValidationError("Registration failed. Please try again.")
    
    @staticmethod
    def authenticate_user(username: str, password: str) -> User:
        """
        Authenticate user
        
        Args:
            username: Username
            password: Plain text password
            
        Returns:
            User: Authenticated user object
            
        Raises:
            AuthenticationError: If authentication fails
        """
        try:
            # Find user
            user = User.query.filter_by(username=username).first()
            
            if not user:
                logger.warning(f"Authentication failed: User '{username}' not found")
                raise AuthenticationError("Invalid credentials")
            
            # Verify password
            if not EncryptionService.verify_password(password, user.password_hash):
                logger.warning(f"Authentication failed: Invalid password for user '{username}'")
                raise AuthenticationError("Invalid credentials")
            
            # Check if user is active
            if not user.is_active:
                logger.warning(f"Authentication failed: User '{username}' is inactive")
                raise AuthenticationError("Account is disabled")
            
            logger.info(f"User authenticated: {username} (ID: {user.id})")
            return user
            
        except AuthenticationError:
            raise
        except Exception as e:
            logger.error(f"Authentication error for {username}: {str(e)}")
            raise AuthenticationError("Authentication failed. Please try again.")
    
    @staticmethod
    def get_user_by_id(user_id: int) -> Optional[User]:
        """
        Get user by ID
        
        Args:
            user_id: User ID
            
        Returns:
            Optional[User]: User object or None
        """
        try:
            return User.query.get(user_id)
        except Exception as e:
            logger.error(f"Failed to get user by ID {user_id}: {str(e)}")
            return None
    
    @staticmethod
    def update_user_profile(
        user_id: int, 
        current_password: Optional[str] = None,
        new_email: Optional[str] = None,
        new_password: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update user profile
        
        Args:
            user_id: User ID
            current_password: Current password (required for password change)
            new_email: New email (optional)
            new_password: New password (optional)
            
        Returns:
            Dict[str, Any]: Update results
            
        Raises:
            ValidationError: If validation fails
            AuthenticationError: If current password is incorrect
        """
        try:
            user = AuthService.get_user_by_id(user_id)
            if not user:
                raise ValidationError("User not found")
            
            updates = {}
            
            # Update email if provided
            if new_email:
                is_valid, error = AuthService.validate_email(new_email)
                if not is_valid:
                    raise ValidationError(f"Invalid email: {error}")
                
                # Check if email is already taken
                existing_user = User.query.filter_by(email=new_email).first()
                if existing_user and existing_user.id != user_id:
                    raise ValidationError("Email already in use")
                
                user.email = new_email
                updates['email'] = new_email
            
            # Update password if provided
            if new_password:
                if not current_password:
                    raise ValidationError("Current password is required to change password")
                
                # Verify current password
                if not EncryptionService.verify_password(current_password, user.password_hash):
                    raise AuthenticationError("Current password is incorrect")
                
                # Validate new password
                is_valid, error = AuthService.validate_password(new_password)
                if not is_valid:
                    raise ValidationError(f"Invalid new password: {error}")
                
                # Hash new password
                user.password_hash = EncryptionService.hash_password(new_password)
                updates['password'] = True
            
            if updates:
                db.session.commit()
                logger.info(f"User profile updated for user ID {user_id}: {updates}")
            
            return {
                'success': True,
                'updates': updates,
                'user': user.to_dict()
            }
            
        except (ValidationError, AuthenticationError):
            raise
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to update profile for user {user_id}: {str(e)}")
            raise ValidationError("Failed to update profile")
    
    @staticmethod
    def check_username_availability(username: str) -> Dict[str, Any]:
        """
        Check if username is available
        
        Args:
            username: Username to check
            
        Returns:
            Dict[str, Any]: Availability information
        """
        try:
            is_valid, error = AuthService.validate_username(username)
            
            if not is_valid:
                return {
                    'available': False,
                    'valid': False,
                    'message': error
                }
            
            # Check if username exists
            user = User.query.filter_by(username=username).first()
            
            return {
                'available': user is None,
                'valid': True,
                'message': 'Username is available' if user is None else 'Username already taken'
            }
            
        except Exception as e:
            logger.error(f"Error checking username availability for '{username}': {str(e)}")
            return {
                'available': False,
                'valid': False,
                'message': 'Error checking username availability'
            }
    
    @staticmethod
    def check_email_availability(email: str) -> Dict[str, Any]:
        """
        Check if email is available
        
        Args:
            email: Email to check
            
        Returns:
            Dict[str, Any]: Availability information
        """
        try:
            is_valid, error = AuthService.validate_email(email)
            
            if not is_valid:
                return {
                    'available': False,
                    'valid': False,
                    'message': error
                }
            
            # Check if email exists
            user = User.query.filter_by(email=email).first()
            
            return {
                'available': user is None,
                'valid': True,
                'message': 'Email is available' if user is None else 'Email already registered'
            }
            
        except Exception as e:
            logger.error(f"Error checking email availability for '{email}': {str(e)}")
            return {
                'available': False,
                'valid': False,
                'message': 'Error checking email availability'
            }