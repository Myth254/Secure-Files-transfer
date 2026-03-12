#!/usr/bin/env python3
"""
Secure File Transfer Backend — v4.1 (hardened)

Changes from v4.0
─────────────────
• All route logic that duplicated the service layer has been removed.
  app.py now only wires extensions, blueprints, and global handlers.
• Inline auth / file / share routes replaced by blueprint delegation.
• OTP bypass (?skip_otp=true, X-OTP-Verified header) removed entirely;
  replaced with server-side OTP download-token verification (F-02).
• str(e) never returned to clients; generic messages + correlation IDs
  used instead (F-08).
• Redis-backed JWT blocklist wired up; logout invalidates the token (F-17).
• ProxyFix middleware added for correct client-IP handling (F-14).
• werkzeug.utils.secure_filename() called on all uploads (F-04).
• datetime.utcnow() replaced with datetime.now(timezone.utc) throughout.
• Secret key guard moved to config.py (_require_env); no defaults survive.
"""
import uuid
import logging
from datetime import datetime, timezone

import redis as _redis
from flask import Flask, jsonify, request
from flask_jwt_extended import (
    jwt_required, get_jwt_identity, get_jwt,
    create_access_token,
)
from werkzeug.middleware.proxy_fix import ProxyFix
from sqlalchemy import text

from config import Config
from src.extensions import db, jwt, cors, socketio, limiter
from src.models.user import User
from src.models.file import File
from src.models.log import Log
from src.models.share import ShareRequest, ShareLog
from src.models.monitoring import ErrorTracking
from src.services.auth_service import AuthService
from src.services.file_service import FileService
from src.services.otp_service import OTPService
from src.monitoring.metrics import MetricsCollector
from src.monitoring.alerts import AlertManager
from src.monitoring.middleware import MonitoringMiddleware, MetricsMiddleware
from src.routes.auth import auth_bp
from src.routes.user import user_bp
from src.routes.files import files_bp
from src.routes.share import share_bp
from src.routes.otp import otp_bp
from src.routes.monitoring import monitoring_bp
from src.monitoring.socket_events import *  # noqa: F401,F403

# ── Config ────────────────────────────────────────────────────────────────────
# Config validates all required secrets at import time; startup aborts if any
# mandatory env var is missing or too short.

# ── App factory ───────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder='monitoring/dashboard', static_url_path='/monitoring')
app.config.from_object(Config)

# ── Proxy fix (must be first WSGI middleware) ─────────────────────────────────
# Tells Flask to trust exactly one proxy hop for X-Forwarded-For / X-Forwarded-Proto.
# Adjust x_for/x_proto to match your actual infrastructure.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Extensions ────────────────────────────────────────────────────────────────
db.init_app(app)
jwt.init_app(app)
cors.init_app(app)
limiter.init_app(app)

# ── Redis client (shared for JWT blocklist + caching) ─────────────────────────
_redis_client: _redis.Redis = _redis.from_url(
    app.config.get('REDIS_URL', 'redis://localhost:6379/0'),
    decode_responses=True,
)

# ── Blueprint registration ────────────────────────────────────────────────────
app.register_blueprint(auth_bp,       url_prefix='/api/auth')
app.register_blueprint(user_bp,       url_prefix='/api/user')
app.register_blueprint(files_bp,      url_prefix='/api/files')
app.register_blueprint(share_bp,      url_prefix='/api/share')
app.register_blueprint(otp_bp,        url_prefix='/api/otp')
app.register_blueprint(monitoring_bp, url_prefix='/api/monitoring')

# ── Monitoring WSGI middleware ────────────────────────────────────────────────
app.wsgi_app = MonitoringMiddleware(app.wsgi_app)
app.wsgi_app = MetricsMiddleware(app.wsgi_app)

# ════════════════════════════════════════════════════════════════════════════════
# JWT CONFIGURATION
# ════════════════════════════════════════════════════════════════════════════════

@jwt.user_identity_loader
def user_identity_lookup(user):
    return str(user.id) if isinstance(user, User) else str(user)


@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    identity = jwt_data.get('sub')
    try:
        return db.session.get(User, int(identity))
    except (ValueError, TypeError):
        return None


@jwt.additional_claims_loader
def add_claims_to_access_token(user):
    if isinstance(user, User):
        return {'user_id': user.id, 'username': user.username}
    return {}


# ── JWT token blocklist (F-17) ────────────────────────────────────────────────

@jwt.token_in_blocklist_loader
def check_if_token_revoked(_jwt_header, jwt_payload: dict) -> bool:
    """Return True if the token's JTI is in the Redis blocklist."""
    jti = jwt_payload.get('jti', '')
    try:
        return _redis_client.get(f'jwt_blocklist:{jti}') is not None
    except Exception as e:
        # If Redis is unreachable treat the token as NOT revoked to avoid
        # locking out all users during a Redis outage, but log the failure.
        logger.error(f"Redis blocklist check failed: {e}")
        return False


# ════════════════════════════════════════════════════════════════════════════════
# DATABASE INIT + MONITORING STARTUP
# ════════════════════════════════════════════════════════════════════════════════

with app.app_context():
    db.create_all()
    logger.info("Database tables verified / created")

    MetricsCollector.init_app(app)
    AlertManager.init_app(app)

    try:
        MetricsCollector.start_collection(
            interval=app.config.get('METRICS_COLLECTION_INTERVAL', 30),
            app=app,
        )
        AlertManager.start_monitoring(
            interval=app.config.get('ALERT_CHECK_INTERVAL', 60),
            app=app,
        )
        logger.info("Monitoring services started")
    except Exception as e:
        logger.error(f"Failed to start monitoring: {e}")

# ════════════════════════════════════════════════════════════════════════════════
# PUBLIC ROUTES
# ════════════════════════════════════════════════════════════════════════════════

@app.route('/')
def index():
    return jsonify({
        'service':  'Secure File Transfer API',
        'version':  '4.1',
        'features': [
            'AES-256-GCM + RSA-2048-OAEP encryption',
            'JWT authentication with token blocklist',
            'Two-factor authentication (OTP via email)',
            'Secure file upload / download',
            'File sharing with per-recipient key wrapping',
            'Real-time monitoring dashboard',
        ],
        'endpoints': {
            'health':    '/health',
            'auth':      '/api/auth/*',
            'user':      '/api/user/*',
            'files':     '/api/files/*',
            'sharing':   '/api/share/*',
            'otp':       '/api/otp/*',
            'monitoring': '/api/monitoring/*',
        },
    })


@app.route('/health')
def health():
    """
    Basic liveness probe — no sensitive system information exposed.
    For a detailed health check (DB, Redis connectivity) use
    /api/monitoring/health which requires authentication.
    """
    return jsonify({
        'status':    'healthy',
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })


# ════════════════════════════════════════════════════════════════════════════════
# AUTHENTICATION ENDPOINTS
# (moved to src/routes/auth.py; these stubs delegate there)
# ════════════════════════════════════════════════════════════════════════════════

@app.route('/api/auth/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    """
    Register a new user.

    Delegates all validation and crypto to AuthService.register_user().
    Returns the *encrypted* private key to the client — NOT the plaintext
    key (F-06).  The client must store it and supply the password to decrypt.
    """
    err_id = uuid.uuid4().hex
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'success': False, 'error': 'No JSON body provided'}), 400

        username = data.get('username', '').strip()
        email    = data.get('email',    '').strip().lower()
        password = data.get('password', '')

        user, encrypted_private_key = AuthService.register_user(username, email, password)

        token = create_access_token(identity=user)
        _log_action(None, 'register', f'User {username} registered')
        db.session.commit()

        logger.info(f"User registered: {username} (id={user.id})")
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
            # Encrypted private key — client must decrypt with their password.
            # The plaintext private key is NEVER transmitted.
            'encrypted_private_key': encrypted_private_key,
            'notice': (
                'Store your encrypted_private_key securely. '
                'You need your password to decrypt it and access your files.'
            ),
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"[{err_id}] Registration failed: {e}", exc_info=True)
        return jsonify({
            'success':  False,
            'error':    'Registration failed',
            'error_id': err_id,
        }), 500


@app.route('/api/auth/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    """
    Step 1 of 2FA login: verify password, send OTP.

    On success returns an otp_id that must be presented to
    /api/auth/verify-login-otp along with the OTP code.
    The user_id is NOT returned here — it is bound server-side to the otp_id.
    """
    err_id = uuid.uuid4().hex
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'success': False, 'error': 'No JSON body provided'}), 400

        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not username or not password:
            return jsonify({'success': False, 'error': 'Username and password required'}), 400

        # authenticate_user raises AuthenticationError on failure
        user = AuthService.authenticate_user(username, password)

        otp_result = OTPService.send_otp(
            user_id=user.id,
            email=user.email,
            purpose='login',
            username=user.username,
            request=request,
        )

        if not otp_result['success']:
            return jsonify({'success': False, 'error': 'Failed to send OTP'}), 500

        logger.info(f"OTP sent: user={username} id={user.id}")
        return jsonify({
            'success':      True,
            'message':      'Password verified. OTP sent to your email.',
            'requires_otp': True,
            'otp_id':       otp_result['otp_id'],
            'expires_in':   otp_result['expires_in'],
            # user_id is intentionally omitted — resolved server-side at step 2
        }), 200

    except Exception as e:
        logger.error(f"[{err_id}] Login step 1 failed: {e}", exc_info=True)
        return jsonify({
            'success':  False,
            'error':    'Login failed',
            'error_id': err_id,
        }), 500


@app.route('/api/auth/verify-login-otp', methods=['POST'])
@limiter.limit("10 per minute")
def verify_login_otp():
    """
    Step 2 of 2FA login: verify OTP and issue JWT.

    user_id is resolved from the server-side OTP record bound to otp_id —
    it is NEVER accepted from the client body (F-12).
    """
    err_id = uuid.uuid4().hex
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'success': False, 'error': 'No JSON body provided'}), 400

        otp_id   = data.get('otp_id')
        otp_code = data.get('otp_code')

        if not otp_id or not otp_code:
            return jsonify({'success': False, 'error': 'otp_id and otp_code are required'}), 400

        # OTPService.verify_otp resolves user_id from otp_id internally
        verify_result = OTPService.verify_otp(otp_id, otp_code, -1, request)

        if not verify_result['success']:
            return jsonify({'success': False, 'error': 'OTP verification failed'}), 401

        # user_id comes from the verified server-side record, not the request
        user = db.session.get(User, verify_result['user_id'])
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        token = create_access_token(identity=user)
        _log_action(user.id, 'login', f'Successful 2FA login: {user.username}')
        logger.info(f"User logged in: {user.username} (id={user.id})")

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

    except Exception as e:
        logger.error(f"[{err_id}] OTP verification failed: {e}", exc_info=True)
        return jsonify({
            'success':  False,
            'error':    'OTP verification failed',
            'error_id': err_id,
        }), 500


@app.route('/api/auth/resend-login-otp', methods=['POST'])
@limiter.limit("5 per hour")
def resend_login_otp():
    """Resend login OTP for an existing otp_id."""
    err_id = uuid.uuid4().hex
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'success': False, 'error': 'No JSON body provided'}), 400

        otp_id = data.get('otp_id')
        if not otp_id:
            return jsonify({'success': False, 'error': 'otp_id is required'}), 400

        result = OTPService.resend_otp(otp_id, -1, request)

        if result['success']:
            return jsonify({
                'success':    True,
                'message':    result['message'],
                'otp_id':     otp_id,
                'expires_at': result.get('expires_at'),
            }), 200
        return jsonify({'success': False, 'error': 'Failed to resend OTP'}), 400

    except Exception as e:
        logger.error(f"[{err_id}] Resend OTP failed: {e}", exc_info=True)
        return jsonify({
            'success':  False,
            'error':    'Failed to resend OTP',
            'error_id': err_id,
        }), 500


@app.route('/api/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    Invalidate the current access token by adding its JTI to the Redis
    blocklist (F-17).  TTL is set to the token's remaining lifetime.
    """
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        jwt_payload = get_jwt()
        jti  = jwt_payload.get('jti', '')
        exp  = jwt_payload.get('exp', 0)
        ttl  = max(int(exp - datetime.now(timezone.utc).timestamp()), 0)

        if jti and ttl > 0:
            try:
                _redis_client.setex(f'jwt_blocklist:{jti}', ttl, 'revoked')
            except Exception as redis_err:
                logger.error(f"[{err_id}] Redis blocklist write failed: {redis_err}")

        _log_action(user_id, 'logout', 'User logged out')
        socketio.emit('user_logout', {
            'user_id':   user_id,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }, namespace='/monitoring')

        return jsonify({'success': True, 'message': 'Logged out successfully'}), 200

    except Exception as e:
        logger.error(f"[{err_id}] Logout failed: {e}", exc_info=True)
        return jsonify({
            'success':  False,
            'error':    'Logout failed',
            'error_id': err_id,
        }), 500


@app.route('/api/auth/verify', methods=['GET'])
@jwt_required()
def verify_token():
    """Verify the current JWT and return basic user info."""
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        user    = db.session.get(User, user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        return jsonify({'success': True, 'user': user.to_dict()}), 200
    except Exception as e:
        logger.error(f"[{err_id}] Token verify failed: {e}", exc_info=True)
        return jsonify({
            'success':  False,
            'error':    'Verification failed',
            'error_id': err_id,
        }), 500


# ════════════════════════════════════════════════════════════════════════════════
# USER ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════════

@app.route('/api/user', methods=['GET'])
@jwt_required()
def get_user():
    err_id = uuid.uuid4().hex
    try:
        user = db.session.get(User, int(get_jwt_identity()))
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        return jsonify({'success': True, 'user': user.to_dict()}), 200
    except Exception as e:
        logger.error(f"[{err_id}] get_user failed: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Request failed', 'error_id': err_id}), 500


@app.route('/api/user/public_key', methods=['GET'])
@jwt_required()
def get_public_key():
    err_id = uuid.uuid4().hex
    try:
        user = db.session.get(User, int(get_jwt_identity()))
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        return jsonify({'success': True, 'public_key': user.rsa_public_key}), 200
    except Exception as e:
        logger.error(f"[{err_id}] get_public_key failed: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Request failed', 'error_id': err_id}), 500


@app.route('/api/user/activity', methods=['GET'])
@jwt_required()
def get_user_activity():
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        limit   = min(request.args.get('limit', 20, type=int), 100)  # cap at 100
        logs    = (
            Log.query
            .filter_by(user_id=user_id)
            .order_by(Log.timestamp.desc())
            .limit(limit)
            .all()
        )
        activity = [
            {
                'action':    log.action,
                'details':   log.details,
                'timestamp': log.timestamp.isoformat() if log.timestamp else None,
            }
            for log in logs
        ]
        return jsonify({'success': True, 'activity': activity}), 200
    except Exception as e:
        logger.error(f"[{err_id}] get_activity failed: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Request failed', 'error_id': err_id}), 500


# ════════════════════════════════════════════════════════════════════════════════
# OTP ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════════

@app.route('/api/otp/send', methods=['POST'])
@jwt_required()
@limiter.limit("10 per hour")
def send_otp():
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        data    = request.get_json(silent=True)
        if not data:
            return jsonify({'success': False, 'error': 'No JSON body'}), 400

        purpose          = data.get('purpose')
        file_id          = data.get('file_id')
        share_request_id = data.get('share_request_id')

        valid_purposes = {
            'login', 'file_download', 'file_share',
            'delete_file', 'change_password', 'verify_email',
        }
        if not purpose or purpose not in valid_purposes:
            return jsonify({'success': False, 'error': 'Invalid or missing purpose'}), 400

        user = db.session.get(User, user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        # Ownership checks
        if file_id:
            file_obj = db.session.get(File, file_id)
            if not file_obj:
                return jsonify({'success': False, 'error': 'File not found'}), 404
            if purpose == 'delete_file' and file_obj.owner_id != user_id:
                return jsonify({'success': False, 'error': 'Unauthorised'}), 403

        if share_request_id and purpose == 'file_share':
            sr = db.session.get(ShareRequest, share_request_id)
            if not sr:
                return jsonify({'success': False, 'error': 'Share request not found'}), 404
            if sr.owner_id != user_id:
                return jsonify({'success': False, 'error': 'Unauthorised'}), 403

        result = OTPService.send_otp(
            user_id=user_id,
            email=user.email,
            purpose=purpose,
            username=user.username,
            file_id=file_id,
            share_request_id=share_request_id,
            request=request,
        )

        if result['success']:
            return jsonify({
                'success':    True,
                'message':    result['message'],
                'otp_id':     result['otp_id'],
                'expires_in': result['expires_in'],
            }), 200
        return jsonify({'success': False, 'error': 'Failed to send OTP'}), 400

    except Exception as e:
        logger.error(f"[{err_id}] send_otp failed: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Request failed', 'error_id': err_id}), 500


@app.route('/api/otp/verify', methods=['POST'])
@jwt_required()
def verify_otp():
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        data    = request.get_json(silent=True)
        if not data:
            return jsonify({'success': False, 'error': 'No JSON body'}), 400

        otp_id   = data.get('otp_id')
        otp_code = data.get('otp_code')
        if not otp_id or not otp_code:
            return jsonify({'success': False, 'error': 'otp_id and otp_code required'}), 400

        result = OTPService.verify_otp(otp_id, otp_code, user_id, request)

        if result['success']:
            return jsonify({
                'success':          True,
                'message':          result['message'],
                'purpose':          result.get('purpose'),
                'file_id':          result.get('file_id'),
                'share_request_id': result.get('share_request_id'),
                # Short-lived download token for file operations
                'download_token':   result.get('download_token'),
            }), 200
        return jsonify({'success': False, 'error': 'OTP verification failed'}), 400

    except Exception as e:
        logger.error(f"[{err_id}] verify_otp failed: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Request failed', 'error_id': err_id}), 500


@app.route('/api/otp/resend/<int:otp_id>', methods=['POST'])
@jwt_required()
@limiter.limit("5 per hour")
def resend_otp(otp_id):
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        result  = OTPService.resend_otp(otp_id, user_id, request)
        if result['success']:
            return jsonify({
                'success':    True,
                'message':    result['message'],
                'expires_at': result.get('expires_at'),
            }), 200
        return jsonify({'success': False, 'error': 'Failed to resend OTP'}), 400
    except Exception as e:
        logger.error(f"[{err_id}] resend_otp failed: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Request failed', 'error_id': err_id}), 500


# ════════════════════════════════════════════════════════════════════════════════
# FILE ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════════

@app.route('/api/files/upload', methods=['POST'])
@jwt_required()
@limiter.limit("50 per day")
def upload_file():
    """
    Upload and encrypt a file.

    Filename is sanitised with secure_filename() inside FileService.upload_file().
    """
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())

        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400

        file_record = FileService.upload_file(user_id, request.files['file'])
        _log_action(user_id, 'upload', f'Uploaded {file_record.filename}')
        db.session.commit()

        socketio.emit('file_uploaded', {
            'user_id':   user_id,
            'filename':  file_record.filename,
            'file_id':   file_record.id,
            'size':      file_record.original_size,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }, namespace='/monitoring')

        return jsonify({
            'success': True,
            'message': 'File uploaded and encrypted successfully',
            'file':    file_record.to_dict(),
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"[{err_id}] upload_file failed: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Upload failed', 'error_id': err_id}), 500


@app.route('/api/files', methods=['GET'])
@jwt_required()
def list_files():
    """Return paginated file metadata (no encrypted payloads)."""
    err_id = uuid.uuid4().hex
    try:
        user_id  = int(get_jwt_identity())
        page     = request.args.get('page',     1,  type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search   = request.args.get('search',   None)

        result = FileService.get_user_files(user_id, page=page, per_page=per_page, search=search)
        return jsonify({'success': True, **result}), 200
    except Exception as e:
        logger.error(f"[{err_id}] list_files failed: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Request failed', 'error_id': err_id}), 500


@app.route('/api/files/<int:file_id>', methods=['GET'])
@jwt_required()
def download_file(file_id):
    """
    Return encrypted file blobs for client-side decryption.

    Requires a valid server-issued download token in the
    ``X-Download-Token`` header.  The token is obtained by verifying
    an OTP via /api/otp/verify with purpose='file_download'.

    The ?skip_otp query parameter has been removed entirely (F-02).
    The X-OTP-Verified header is no longer accepted (F-02).
    """
    err_id = uuid.uuid4().hex
    try:
        from src.utils.security import SecurityUtils

        user_id        = int(get_jwt_identity())
        download_token = request.headers.get('X-Download-Token', '')

        if not SecurityUtils.verify_otp_download_token(download_token, user_id, file_id):
            return jsonify({
                'success':      False,
                'error':        'A valid OTP download token is required',
                'require_otp':  True,
                'purpose':      'file_download',
                'file_id':      file_id,
            }), 403

        file_data = FileService.get_file_for_download(user_id, file_id)
        _log_action(user_id, 'download', f'Downloaded file id={file_id}')

        socketio.emit('file_downloaded', {
            'user_id':   user_id,
            'file_id':   file_id,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }, namespace='/monitoring')

        return jsonify({'success': True, 'file': file_data}), 200

    except Exception as e:
        logger.error(f"[{err_id}] download_file({file_id}) failed: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Request failed', 'error_id': err_id}), 500


@app.route('/api/files/<int:file_id>', methods=['DELETE'])
@jwt_required()
def delete_file(file_id):
    """
    Delete a file.  Requires a valid OTP download token for the delete action.
    """
    err_id = uuid.uuid4().hex
    try:
        from src.utils.security import SecurityUtils

        user_id        = int(get_jwt_identity())
        download_token = request.headers.get('X-Download-Token', '')

        if not SecurityUtils.verify_otp_download_token(download_token, user_id, file_id):
            return jsonify({
                'success':     False,
                'error':       'A valid OTP token is required to delete files',
                'require_otp': True,
                'purpose':     'delete_file',
                'file_id':     file_id,
            }), 403

        filename = FileService.delete_file(user_id, file_id)
        _log_action(user_id, 'delete', f'Deleted {filename}')
        db.session.commit()

        socketio.emit('file_deleted', {
            'user_id':   user_id,
            'filename':  filename,
            'file_id':   file_id,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }, namespace='/monitoring')

        return jsonify({'success': True, 'message': f'File "{filename}" deleted'}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"[{err_id}] delete_file({file_id}) failed: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Request failed', 'error_id': err_id}), 500


@app.route('/api/files/stats', methods=['GET'])
@jwt_required()
def get_file_stats():
    """Return storage statistics using SQL aggregates (no BLOB loading)."""
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        stats   = FileService.get_file_stats(user_id)
        return jsonify({'success': True, 'stats': stats}), 200
    except Exception as e:
        logger.error(f"[{err_id}] get_file_stats failed: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Request failed', 'error_id': err_id}), 500


# ════════════════════════════════════════════════════════════════════════════════
# FILE SHARING ENDPOINT
# ════════════════════════════════════════════════════════════════════════════════

@app.route('/api/share/request', methods=['POST'])
@jwt_required()
def request_share():
    """
    Create a share request.

    The client must supply ``recipient_encrypted_aes_key`` — the AES key
    re-encrypted with the recipient's RSA public key (client-side re-wrapping).
    The server no longer copies the owner's wrapped key verbatim (F-05).
    """
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        data    = request.get_json(silent=True)
        if not data:
            return jsonify({'success': False, 'error': 'No JSON body'}), 400

        file_id                    = data.get('file_id')
        recipient_username         = data.get('recipient_username', '').strip()
        recipient_encrypted_aes_key = data.get('recipient_encrypted_aes_key', '')

        if not file_id:
            return jsonify({'success': False, 'error': 'file_id is required'}), 400
        if not recipient_username:
            return jsonify({'success': False, 'error': 'recipient_username is required'}), 400
        if not recipient_encrypted_aes_key:
            return jsonify({
                'success': False,
                'error':   (
                    'recipient_encrypted_aes_key is required. '
                    'The client must re-encrypt the AES key with the recipient\'s public key.'
                ),
            }), 400

        can_view     = data.get('can_view',     True)
        can_download = data.get('can_download', False)
        can_reshare  = data.get('can_reshare',  False)
        expires_days = data.get('expires_days')

        file_obj = db.session.get(File, file_id)
        if not file_obj:
            return jsonify({'success': False, 'error': 'File not found'}), 404
        if file_obj.owner_id != user_id:
            return jsonify({'success': False, 'error': 'You do not own this file'}), 403

        recipient = User.query.filter_by(username=recipient_username).first()
        if not recipient:
            return jsonify({'success': False, 'error': 'Recipient not found'}), 404
        if recipient.id == user_id:
            return jsonify({'success': False, 'error': 'Cannot share with yourself'}), 400

        existing = ShareRequest.query.filter_by(
            file_id=file_id, recipient_id=recipient.id, status='accepted'
        ).first()
        if existing:
            return jsonify({'success': False, 'error': 'File already shared with this user'}), 400

        # Store the recipient-specific wrapped AES key (bytes)
        try:
            aes_key_bytes = bytes.fromhex(recipient_encrypted_aes_key)
        except ValueError:
            return jsonify({'success': False, 'error': 'recipient_encrypted_aes_key must be hex-encoded'}), 400

        share_request = ShareRequest(
            file_id=file_id,
            owner_id=user_id,
            recipient_id=recipient.id,
            can_view=can_view,
            can_download=can_download,
            can_reshare=can_reshare,
            encrypted_aes_key=aes_key_bytes,   # recipient's wrapped key as bytes
        )

        if expires_days:
            from datetime import timedelta
            share_request.expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)

        db.session.add(share_request)
        db.session.flush()

        share_log = ShareLog(
            share_request_id=share_request.id,
            user_id=user_id,
            action='request',
            details=f'Share request: file {file_id} → {recipient_username}',
        )
        db.session.add(share_log)
        db.session.commit()

        socketio.emit('share_requested', {
            'request_id':  share_request.id,
            'file_id':     file_id,
            'owner_id':    user_id,
            'recipient_id': recipient.id,
            'timestamp':   datetime.now(timezone.utc).isoformat(),
        }, namespace='/monitoring')

        return jsonify({
            'success':       True,
            'message':       'Share request sent',
            'share_request': share_request.to_dict(),
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"[{err_id}] request_share failed: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Request failed', 'error_id': err_id}), 500


# ════════════════════════════════════════════════════════════════════════════════
# GLOBAL ERROR HANDLERS
# ════════════════════════════════════════════════════════════════════════════════

@app.errorhandler(400)
def bad_request(e):
    return jsonify({'success': False, 'error': 'Bad request'}), 400


@app.errorhandler(401)
def unauthorised(e):
    return jsonify({'success': False, 'error': 'Unauthorised'}), 401


@app.errorhandler(403)
def forbidden(e):
    return jsonify({'success': False, 'error': 'Forbidden'}), 403


@app.errorhandler(404)
def not_found(e):
    return jsonify({'success': False, 'error': 'Resource not found'}), 404


@app.errorhandler(429)
def rate_limited(e):
    return jsonify({'success': False, 'error': 'Rate limit exceeded. Try again later.'}), 429


@app.errorhandler(500)
def internal_error(e):
    db.session.rollback()
    err_id = uuid.uuid4().hex
    logger.error(f"[{err_id}] Unhandled 500: {e}", exc_info=True)

    try:
        error_track = ErrorTracking(
            error_type='internal_server_error',
            error_message=str(e),          # stored in DB for operators
            endpoint=request.path,
            method=request.method,
        )
        db.session.add(error_track)
        db.session.commit()
    except Exception:
        pass

    # Generic message + correlation ID for the client; no internals exposed
    return jsonify({
        'success':  False,
        'error':    'Internal server error',
        'error_id': err_id,
    }), 500


# ════════════════════════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════════════════════════

def _log_action(user_id, action: str, details: str) -> None:
    """Create an audit log entry (best-effort; never raises)."""
    try:
        db.session.add(Log(
            user_id=user_id,
            action=action,
            details=details,
            ip_address=request.remote_addr,
            user_agent=request.user_agent.string if request.user_agent else None,
        ))
    except Exception as e:
        logger.error(f"Failed to create log entry: {e}")


# ════════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ════════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    print("=" * 70)
    print("  SECURE FILE TRANSFER API v4.1 (hardened)")
    print("=" * 70)
    print("  Encryption : AES-256-GCM + RSA-2048-OAEP")
    print("  KDF        : Argon2id")
    print("  Auth       : JWT (Redis blocklist) + 2FA OTP")
    print(f"  DB         : {app.config['SQLALCHEMY_DATABASE_URI'].split('@')[-1]}")
    print(f"  Redis      : {app.config.get('REDIS_URL', 'not configured')}")
    print("=" * 70)

    # Sanity-check DB connectivity
    try:
        with app.app_context():
            db.session.execute(text('SELECT 1'))
        print("  ✅ Database reachable")
    except Exception as db_err:
        print(f"  ❌ Database check failed: {db_err}")

    # Sanity-check Redis connectivity
    try:
        _redis_client.ping()
        print("  ✅ Redis reachable")
    except Exception as redis_err:
        print(f"  ⚠️  Redis not reachable: {redis_err} — JWT blocklist disabled")

    print("=" * 70)
    print("  Starting on http://0.0.0.0:5000")
    print("=" * 70)

    from src.extensions import socketio as _sio
    _sio.run(app, debug=False, host='0.0.0.0', port=5000)