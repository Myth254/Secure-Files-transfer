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
socketio = SocketIO(
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
