"""
Authentication Service
Handles user authentication, registration, and profile management.

Changes from original
─────────────────────
• Password strength requirements are now enforced (uppercase, lowercase,
  digit, special character) via SecurityUtils.check_password_strength().
• EncryptionService.hash_password() / verify_password() used throughout
  instead of raw bcrypt calls — keeps crypto logic in one place.
• User.query.get() replaced with db.session.get() (SQLAlchemy 2.x).
• update_user_profile() no longer calls db.session.commit() mid-function;
  callers are responsible for committing the outer transaction.
"""
import re
import logging
from typing import Optional, Tuple, Dict, Any

from src.extensions import db
from src.models.user import User
from src.services.encryption_service import EncryptionService
from src.utils.exceptions import AuthenticationError, ValidationError

logger = logging.getLogger(__name__)

_DUMMY_PASSWORD_HASH = "$2b$12$JDNeUbtijyMAcNAyvsAUd.dQnoOy2RqIuWgouLylm6dAf82qXa5gy"


class AuthService:
    """Service for authentication and user management."""

    # ── Validation constants ──────────────────────────────────────────────
    MIN_USERNAME_LENGTH = 3
    MAX_USERNAME_LENGTH = 50
    MIN_PASSWORD_LENGTH = 8
    MAX_PASSWORD_LENGTH = 100
    EMAIL_REGEX = re.compile(
        r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
    )

    # ── Input validators ──────────────────────────────────────────────────

    @staticmethod
    def validate_username(username: str) -> Tuple[bool, str]:
        """
        Validate username format and length.

        Returns:
            (is_valid, error_message)
        """
        username = username.strip()

        if not username:
            return False, "Username is required"
        if len(username) < AuthService.MIN_USERNAME_LENGTH:
            return False, f"Username must be at least {AuthService.MIN_USERNAME_LENGTH} characters"
        if len(username) > AuthService.MAX_USERNAME_LENGTH:
            return False, f"Username cannot exceed {AuthService.MAX_USERNAME_LENGTH} characters"
        if not re.match(r'^[a-zA-Z0-9_\-]+$', username):
            return False, "Username may only contain letters, numbers, underscores, and hyphens"

        return True, ""

    @staticmethod
    def validate_email(email: str) -> Tuple[bool, str]:
        """
        Validate email address format.

        Returns:
            (is_valid, error_message)
        """
        email = email.strip().lower()

        if not email:
            return False, "Email is required"
        if not AuthService.EMAIL_REGEX.match(email):
            return False, "Invalid email format"

        return True, ""

    @staticmethod
    def validate_password(password: str) -> Tuple[bool, str]:
        """
        Validate password strength.

        Enforces: minimum length, uppercase, lowercase, digit, special char.
        Uses SecurityUtils.check_password_strength() for the full rule set.

        Returns:
            (is_valid, error_message)
        """
        # Import here to avoid circular imports; SecurityUtils lives in utils
        from src.utils.security import SecurityUtils

        if not password:
            return False, "Password is required"
        if len(password) < AuthService.MIN_PASSWORD_LENGTH:
            return False, f"Password must be at least {AuthService.MIN_PASSWORD_LENGTH} characters"
        if len(password) > AuthService.MAX_PASSWORD_LENGTH:
            return False, f"Password cannot exceed {AuthService.MAX_PASSWORD_LENGTH} characters"

        is_strong, issues = SecurityUtils.check_password_strength(password)
        if not is_strong:
            return False, "; ".join(issues)

        return True, ""

    # ── Registration ──────────────────────────────────────────────────────

    @staticmethod
    def register_user(username: str, email: str, password: str) -> Tuple[User, str]:
        """
        Register a new user.

        Steps:
          1. Validate all inputs (username, email, password strength).
          2. Check uniqueness of username and email.
          3. Hash password with bcrypt.
          4. Generate RSA-2048 key pair.
          5. Encrypt private key with Argon2id + AES-256-GCM.
          6. Persist User record (flush — caller commits).

        Returns:
            (user_object, encrypted_private_key)
            NOTE: the raw private key is NOT returned; the caller must return
            only the *encrypted* form to the client over HTTPS.

        Raises:
            ValidationError: on input or uniqueness failure.
        """
        try:
            # ── Validate inputs ───────────────────────────────────────────
            is_valid, error = AuthService.validate_username(username)
            if not is_valid:
                raise ValidationError(f"Username: {error}")

            is_valid, error = AuthService.validate_email(email)
            if not is_valid:
                raise ValidationError(f"Email: {error}")

            is_valid, error = AuthService.validate_password(password)
            if not is_valid:
                raise ValidationError(f"Password: {error}")

            # Normalise before uniqueness check
            username = username.strip()
            email    = email.strip().lower()

            # ── Uniqueness ────────────────────────────────────────────────
            if db.session.query(User).filter_by(username=username).first():
                raise ValidationError("Username already exists")
            if db.session.query(User).filter_by(email=email).first():
                raise ValidationError("Email already registered")

            # ── Crypto ───────────────────────────────────────────────────
            password_hash = EncryptionService.hash_password(password)
            private_key_pem, public_key_pem = EncryptionService.generate_rsa_keypair()
            encrypted_private_key = EncryptionService.encrypt_private_key(
                private_key_pem, password
            )

            # ── Persist ───────────────────────────────────────────────────
            user = User(
                username=username,
                email=email,
                password_hash=password_hash,
                rsa_public_key=public_key_pem,
                rsa_private_key_encrypted=encrypted_private_key,
            )
            db.session.add(user)
            db.session.flush()   # populate user.id without committing

            logger.info(f"User registered: {username} (id={user.id})")

            # Return the *encrypted* private key so the caller can send it to
            # the client. The plaintext private_key_pem is discarded here.
            return user, encrypted_private_key

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Registration failed for '{username}': {e}")
            raise ValidationError("Registration failed. Please try again.")

    # ── Authentication ────────────────────────────────────────────────────

    @staticmethod
    def _authenticate_user_by_field(field_name: str, field_value: str, password: str) -> User:
        """Verify credentials using a unique user field such as username or email."""
        try:
            user = db.session.query(User).filter_by(**{field_name: field_value}).first()

            # Use a constant-time comparison path regardless of whether the
            # user exists to mitigate timing-based account enumeration.
            if not user:
                EncryptionService.verify_password("dummy-password", _DUMMY_PASSWORD_HASH)
                logger.warning(f"Auth failed: unknown {field_name} '{field_value}'")
                raise AuthenticationError("Invalid credentials")

            if not EncryptionService.verify_password(password, user.password_hash):
                logger.warning(f"Auth failed: wrong password for {field_name} '{field_value}'")
                raise AuthenticationError("Invalid credentials")

            if not user.is_active:
                logger.warning(f"Auth failed: inactive account {field_name}='{field_value}'")
                raise AuthenticationError("Account is disabled")

            logger.info(f"User authenticated by {field_name}: {field_value} (id={user.id})")
            return user

        except AuthenticationError:
            raise
        except Exception as e:
            logger.error(f"Authentication error for {field_name} '{field_value}': {e}")
            raise AuthenticationError("Authentication failed. Please try again.")

    @staticmethod
    def authenticate_user(username: str, password: str) -> User:
        """
        Verify credentials and return the authenticated User.

        Raises:
            AuthenticationError: on any failure (deliberately generic message
                                 to prevent username enumeration).
        """
        return AuthService._authenticate_user_by_field(
            field_name='username',
            field_value=username.strip(),
            password=password,
        )

    @staticmethod
    def authenticate_user_by_email(email: str, password: str) -> User:
        """
        Verify credentials and return the authenticated User using email.

        Login is intentionally email-first for client authentication flows.
        """
        return AuthService._authenticate_user_by_field(
            field_name='email',
            field_value=email.strip().lower(),
            password=password,
        )

    # ── Lookups ───────────────────────────────────────────────────────────

    @staticmethod
    def get_user_by_id(user_id: int) -> Optional[User]:
        """Return the User with *user_id*, or None."""
        try:
            return db.session.get(User, user_id)
        except Exception as e:
            logger.error(f"get_user_by_id({user_id}) failed: {e}")
            return None

    # ── Profile updates ───────────────────────────────────────────────────

    @staticmethod
    def update_user_profile(
        user_id: int,
        current_password: Optional[str] = None,
        new_email: Optional[str] = None,
        new_password: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Update email and / or password for *user_id*.

        Password change requires *current_password* to be supplied and correct.
        The caller is responsible for committing the DB transaction.

        Returns:
            Dict with keys ``success``, ``updates``, ``user``.

        Raises:
            ValidationError, AuthenticationError
        """
        try:
            user = AuthService.get_user_by_id(user_id)
            if not user:
                raise ValidationError("User not found")

            updates: Dict[str, Any] = {}

            # ── Email update ──────────────────────────────────────────────
            if new_email:
                is_valid, error = AuthService.validate_email(new_email)
                if not is_valid:
                    raise ValidationError(f"Invalid email: {error}")

                new_email = new_email.strip().lower()
                existing = db.session.query(User).filter_by(email=new_email).first()
                if existing and existing.id != user_id:
                    raise ValidationError("Email already in use")

                user.email = new_email
                updates['email'] = new_email

            # ── Password update ───────────────────────────────────────────
            if new_password:
                if not current_password:
                    raise ValidationError("Current password is required to change password")

                if not EncryptionService.verify_password(current_password, user.password_hash):
                    raise AuthenticationError("Current password is incorrect")

                is_valid, error = AuthService.validate_password(new_password)
                if not is_valid:
                    raise ValidationError(f"New password invalid: {error}")

                user.password_hash = EncryptionService.hash_password(new_password)
                updates['password_changed'] = True

            logger.info(f"Profile updated for user {user_id}: {list(updates.keys())}")

            return {
                'success': True,
                'updates': updates,
                'user':    user.to_dict(),
            }

        except (ValidationError, AuthenticationError):
            raise
        except Exception as e:
            logger.error(f"Profile update failed for user {user_id}: {e}")
            raise ValidationError("Failed to update profile")

    # ── Availability checks ───────────────────────────────────────────────

    @staticmethod
    def check_username_availability(username: str) -> Dict[str, Any]:
        """Check whether *username* is valid and not already registered."""
        try:
            is_valid, error = AuthService.validate_username(username)
            if not is_valid:
                return {'available': False, 'valid': False, 'message': error}

            taken = db.session.query(User).filter_by(username=username.strip()).first() is not None
            return {
                'available': not taken,
                'valid':     True,
                'message':   'Username is available' if not taken else 'Username already taken',
            }
        except Exception as e:
            logger.error(f"Username availability check error: {e}")
            return {'available': False, 'valid': False, 'message': 'Error checking availability'}

    @staticmethod
    def check_email_availability(email: str) -> Dict[str, Any]:
        """Check whether *email* is valid and not already registered."""
        try:
            is_valid, error = AuthService.validate_email(email)
            if not is_valid:
                return {'available': False, 'valid': False, 'message': error}

            email = email.strip().lower()
            taken = db.session.query(User).filter_by(email=email).first() is not None
            return {
                'available': not taken,
                'valid':     True,
                'message':   'Email is available' if not taken else 'Email already registered',
            }
        except Exception as e:
            logger.error(f"Email availability check error: {e}")
            return {'available': False, 'valid': False, 'message': 'Error checking availability'}
