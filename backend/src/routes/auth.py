"""
Authentication routes — /api/auth/*

Fixes applied
─────────────
F-02  verify_login_otp no longer accepts user_id from the request body.
      user_id is resolved from the server-side OTP record.
F-03  No secret defaults — handled in config.py; no change needed here.
F-06  register() no longer returns the plaintext RSA private key.
      Only the Argon2id-encrypted form is sent to the client.
F-07  encrypt_private_key_for_storage() used bcrypt.kdf(rounds=100).
      Removed entirely; EncryptionService.encrypt_private_key() (Argon2id)
      is used via AuthService.register_user().
F-08  str(e) never returned to clients; generic messages + error IDs.
F-09  Inline bcrypt calls removed; EncryptionService used throughout.
F-17  logout() adds the JWT JTI to the Redis blocklist so the token
      cannot be reused after logout.
SQLAlchemy 2.x: User.query.get() → db.session.get()
datetime.utcnow() → datetime.now(timezone.utc)
"""
import uuid
import logging
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity, get_jwt,
)

from src.extensions import db, socketio
from src.models.user import User
from src.models.log import Log
from src.services.auth_service import AuthService
from src.services.otp_service import OTPService
from src.utils.exceptions import AuthenticationError, ValidationError

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)


# ── helpers ───────────────────────────────────────────────────────────────────

def _log(user_id, action: str, details: str) -> None:
    try:
        db.session.add(Log(
            user_id=user_id,
            action=action,
            details=details,
            ip_address=request.remote_addr,
            user_agent=request.user_agent.string if request.user_agent else None,
        ))
    except Exception as exc:
        logger.error(f"Audit log failed: {exc}")


def _redis_client():
    """
    Return the shared Redis client created in app.py at startup.

    app.py stores it as ``current_app.extensions['redis_client']`` so that
    all blueprints reuse the same connection pool instead of each creating
    their own (L-04).
    """
    from flask import current_app
    import redis as _redis

    client = current_app.extensions.get('redis_client')
    if client is None:
        # Fallback: create once and cache — only hit on first request if
        # app.py did not pre-register the client (e.g. in tests).
        client = _redis.from_url(
            current_app.config.get('REDIS_URL', 'redis://localhost:6379/0'),
            decode_responses=True,
        )
        current_app.extensions['redis_client'] = client
    return client


# ── register ──────────────────────────────────────────────────────────────────

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Register a new user.

    Returns only the *encrypted* private key — the plaintext key is NEVER
    transmitted (F-06).  The client must store the encrypted key and supply
    the correct password to decrypt it locally when needed.
    """
    err_id = uuid.uuid4().hex
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        username = data.get('username', '').strip()
        email    = data.get('email',    '').strip().lower()
        password = data.get('password', '')

        # All validation, password strength, uniqueness checks and crypto
        # are delegated to AuthService.register_user()
        user, encrypted_private_key = AuthService.register_user(username, email, password)

        token = create_access_token(identity=user)
        _log(None, 'register', f'User {username} registered')
        db.session.commit()

        logger.info(f"Registered: {username} (id={user.id})")
        socketio.emit('user_registered', {
            'user_id':   user.id,
            'username':  user.username,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }, namespace='/monitoring')

        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'token':   token,
            'user': {
                'id':       user.id,
                'username': user.username,
                'email':    user.email,
            },
            # Encrypted private key only — plaintext never transmitted
            'encrypted_private_key': encrypted_private_key,
            'notice': (
                'Store your encrypted_private_key securely. '
                'Your password is required to decrypt it locally.'
            ),
        }), 201

    except ValidationError as ve:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(ve)}), 400
    except Exception:
        db.session.rollback()
        logger.error(f"[{err_id}] Registration failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Registration failed. Please try again.', 'error_id': err_id}), 500


# ── login step 1 ──────────────────────────────────────────────────────────────

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Step 1 of 2FA: verify password and send OTP.
    user_id is intentionally NOT returned — it is bound server-side to otp_id.
    """
    err_id = uuid.uuid4().hex
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'success': False, 'error': 'Email and password required'}), 400

        # Raises AuthenticationError on failure (generic message prevents enumeration)
        user = AuthService.authenticate_user_by_email(email, password)

        otp_result = OTPService.send_otp(
            user_id=user.id,
            email=user.email,
            purpose='login',
            username=user.username,
            request=request,
        )

        if not otp_result['success']:
            return jsonify({'success': False, 'error': 'Failed to send OTP'}), 500

        logger.info(f"OTP dispatched for email={email}")
        return jsonify({
            'success':      True,
            'message':      'Password verified. OTP sent to your email.',
            'requires_otp': True,
            'otp_id':       otp_result['otp_id'],
            'expires_in':   otp_result['expires_in'],
            # user_id omitted — resolved server-side at step 2
        }), 200

    except AuthenticationError as ae:
        # Log failed attempt (no user_id available — that's intentional)
        _log(None, 'login_failed', f'Failed login for email: {data.get("email", "") if data else ""}') # type: ignore
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
        return jsonify({'success': False, 'error': str(ae)}), 401
    except Exception:
        logger.error(f"[{err_id}] Login step 1 error", exc_info=True)
        return jsonify({'success': False, 'error': 'Login failed. Please try again.', 'error_id': err_id}), 500


# ── login step 2 ──────────────────────────────────────────────────────────────

@auth_bp.route('/verify-login-otp', methods=['POST'])
def verify_login_otp():
    """
    Step 2 of 2FA: verify OTP and issue JWT.

    user_id is resolved from the server-side OTP record bound to otp_id —
    it is NEVER accepted from the request body (F-12).
    """
    err_id = uuid.uuid4().hex
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        otp_id   = data.get('otp_id')
        otp_code = data.get('otp_code')

        if not otp_id or not otp_code:
            return jsonify({'success': False, 'error': 'otp_id and otp_code are required'}), 400

        # Resolve user ownership from the server-side OTP record.
        verify_result = OTPService.verify_otp_for_login(otp_id, otp_code, request)

        if not verify_result['success']:
            return jsonify({'success': False, 'error': 'OTP verification failed'}), 401

        user = db.session.get(User, verify_result['user_id'])
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        token = create_access_token(identity=user)
        _log(user.id, 'login', f'2FA login: {user.username}')
        db.session.commit()

        logger.info(f"Login complete: {user.username} (id={user.id})")
        socketio.emit('user_login', {
            'user_id':   user.id,
            'username':  user.username,
            'ip':        request.remote_addr,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }, namespace='/monitoring')
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'token':   token,
            'user':    user.to_dict(),
        }), 200

    except Exception:
        logger.error(f"[{err_id}] OTP verification error", exc_info=True)
        return jsonify({'success': False, 'error': 'OTP verification failed', 'error_id': err_id}), 500


# ── resend OTP ────────────────────────────────────────────────────────────────

@auth_bp.route('/resend-login-otp', methods=['POST'])
def resend_login_otp():
    """Resend login OTP for an existing otp_id. No user_id accepted from caller."""
    err_id = uuid.uuid4().hex
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        otp_id = data.get('otp_id')
        if not otp_id:
            return jsonify({'success': False, 'error': 'otp_id is required'}), 400

        result = OTPService.resend_otp_by_id(otp_id=otp_id, request=request)

        if result['success']:
            return jsonify({
                'success':    True,
                'message':    result['message'],
                'otp_id':     otp_id,
                'expires_at': result.get('expires_at'),
            }), 200
        return jsonify({'success': False, 'error': 'Failed to resend OTP'}), 400

    except Exception:
        logger.error(f"[{err_id}] Resend OTP error", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to resend OTP', 'error_id': err_id}), 500


# ── logout ────────────────────────────────────────────────────────────────────

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    Invalidate the current JWT by writing its JTI to the Redis blocklist (F-17).
    TTL is set to the token's remaining lifetime so the entry self-expires.
    """
    err_id = uuid.uuid4().hex
    try:
        user_id     = int(get_jwt_identity())
        jwt_payload = get_jwt()
        jti = jwt_payload.get('jti', '')
        exp = jwt_payload.get('exp', 0)
        ttl = max(int(exp - datetime.now(timezone.utc).timestamp()), 0)

        if jti and ttl > 0:
            try:
                _redis_client().setex(f'jwt_blocklist:{jti}', ttl, 'revoked')
            except Exception as redis_err:
                logger.error(f"[{err_id}] Redis blocklist write failed: {redis_err}")

        _log(user_id, 'logout', 'User logged out')
        db.session.commit()
        socketio.emit('user_logout', {
            'user_id':   user_id,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }, namespace='/monitoring')

        return jsonify({'success': True, 'message': 'Logout successful'}), 200

    except Exception:
        logger.error(f"[{err_id}] Logout error", exc_info=True)
        return jsonify({'success': False, 'error': 'Logout failed', 'error_id': err_id}), 500


# ── verify token ──────────────────────────────────────────────────────────────

@auth_bp.route('/verify', methods=['GET'])
@jwt_required()
def verify_token():
    """Confirm the current JWT is valid and return user info."""
    err_id = uuid.uuid4().hex
    try:
        user = db.session.get(User, int(get_jwt_identity()))
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        return jsonify({'success': True, 'message': 'Token is valid', 'user': user.to_dict()}), 200
    except Exception:
        logger.error(f"[{err_id}] Token verify error", exc_info=True)
        return jsonify({'success': False, 'error': 'Verification failed', 'error_id': err_id}), 500
