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
from werkzeug.middleware.proxy_fix import ProxyFix
from sqlalchemy import text

from config import get_config
from src.extensions import db, jwt, cors, socketio, limiter
from src.models.user import User
from src.models.log import Log
from src.models.monitoring import ErrorTracking
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
app.config.from_object(get_config())

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Extensions ────────────────────────────────────────────────────────────────
db.init_app(app)
jwt.init_app(app)
cors.init_app(
    app,
    origins=app.config['CORS_ORIGINS'],
    methods=app.config['CORS_METHODS'],
    allow_headers=app.config['CORS_HEADERS'],
    supports_credentials=True,
)
limiter.init_app(app)
socketio.init_app(
    app,
    message_queue=app.config.get('SOCKETIO_MESSAGE_QUEUE'),
    cors_allowed_origins=app.config.get('SOCKETIO_CORS_ALLOWED_ORIGINS', app.config['CORS_ORIGINS']),
    ping_timeout=app.config.get('SOCKETIO_PING_TIMEOUT', 60),
    ping_interval=app.config.get('SOCKETIO_PING_INTERVAL', 25),
)

# ── Redis client (shared for JWT blocklist + caching) ─────────────────────────
_redis_client = _redis.from_url(
    app.config.get('REDIS_URL', 'redis://localhost:6379/0'),
    decode_responses=True,
)
# Register in extensions so blueprints can retrieve the shared pool via
# current_app.extensions['redis_client'] without creating a second pool (L-04).
app.extensions['redis_client'] = _redis_client

# ── Blueprint registration ────────────────────────────────────────────────────
app.register_blueprint(auth_bp,       url_prefix='/api/auth')
app.register_blueprint(user_bp,       url_prefix='/api/user')
app.register_blueprint(files_bp,      url_prefix='/api/files')
app.register_blueprint(share_bp,      url_prefix='/api/share')
app.register_blueprint(otp_bp,        url_prefix='/api/otp')
app.register_blueprint(monitoring_bp)

# ── WSGI middleware stack (innermost applied first) ───────────────────────────
# ProxyFix MUST be the innermost wrapper so it rewrites remote_addr / scheme
# before any other middleware (or Flask) reads request.remote_addr.
# Monitoring middleware then sees the already-corrected client IP.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
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
    if _redis_client is None:
        logger.warning("Redis client not initialized; skipping blocklist check")
        return False
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
        db.session.flush()
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
        if _redis_client is not None:
            _redis_client.ping()
            print("  ✅ Redis reachable")
        else:
            print("  ⚠️  Redis client not initialized")
    except Exception as redis_err:
        print(f"  ⚠️  Redis not reachable: {redis_err} — JWT blocklist disabled")

    print("=" * 70)
    print("  Starting on http://0.0.0.0:5000")
    print("=" * 70)

    from src.extensions import socketio as _sio
    _sio.run(app, debug=False, host='0.0.0.0', port=5000)
