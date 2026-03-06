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

# SocketIO - Force threading mode for maximum compatibility
socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode='threading',  # Use threading instead of eventlet
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25
)

# Rate Limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100 per hour"],
    storage_uri="redis://localhost:6379/1",
    storage_options={
        "socket_connect_timeout": 30,
        "socket_keepalive": True
    },
    strategy="fixed-window"
)