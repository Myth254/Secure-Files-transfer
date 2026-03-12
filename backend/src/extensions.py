"""
Flask extension instances.

All extension objects are created here and initialised later via their
init_app() pattern in the application factory (app.py).
"""
import os

from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Database
db = SQLAlchemy()

# JWT
jwt = JWTManager()

# CORS
cors = CORS()

# SocketIO
# TODO (PRODUCTION REQUIRED): Replace cors_allowed_origins="*" with the
# application's actual domain(s), e.g.:
#   cors_allowed_origins=os.environ.get('ALLOWED_ORIGINS', 'https://yourdomain.com')
# A wildcard origin allows any website to open a WebSocket connection to this
# server, which is a significant security risk in production.
socketio = SocketIO(
    cors_allowed_origins="*",   # MUST be restricted before going to production
    async_mode='threading',     # Use threading for compatibility; switch to eventlet/gevent in prod
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25
)

# Rate Limiter
# NOTE: Per-endpoint tighter limits MUST be applied at the route level using
#   @limiter.limit("5 per minute")
# for all authentication, OTP, and other sensitive endpoints.  The global
# default of "100 per hour" is intentionally permissive for non-sensitive
# routes only.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100 per hour"],
    # Read Redis URL from environment; fall back to localhost for development.
    storage_uri=os.environ.get('REDIS_URL', 'redis://localhost:6379/1'),
    storage_options={
        "socket_connect_timeout": 30,
        "socket_keepalive": True
    },
    strategy="fixed-window"
)


@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    """
    Check whether a JWT has been revoked (e.g. after logout).

    Revoked tokens are stored in Redis under the key
    'jwt_blocklist:<jti>' by the logout route (Tier 1/2).

    Fails OPEN on Redis errors (logs a warning but does not lock out users).
    """
    import redis as redis_lib
    jti = jwt_payload.get('jti', '')
    try:
        r = redis_lib.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379/0'))
        return bool(r.exists(f'jwt_blocklist:{jti}'))
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(
            f"Redis unavailable for JWT blocklist check (failing open): {e}"
        )
        return False  # fail open — do not lock out users during a Redis outage