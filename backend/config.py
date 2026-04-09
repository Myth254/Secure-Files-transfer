import os
import sys
from pathlib import Path
from datetime import timedelta

from dotenv import load_dotenv


_CONFIG_DIR = Path(__file__).resolve().parent

# Load local development environment files before any required config is read.
# Existing exported environment variables still win over .env values.
load_dotenv(_CONFIG_DIR / '.env')
load_dotenv(_CONFIG_DIR.parent / '.env')


def _require_env(name: str, min_length: int = 32) -> str:
    """
    Fetch a required secret from environment variables.
    Abort startup immediately if missing or insecure.
    """
    value = os.environ.get(name, '')
    if not value:
        sys.exit(
            f"FATAL: Environment variable '{name}' is not set. "
            f"Generate one with: python -c \"import secrets; print(secrets.token_hex(64))\""
        )
    if len(value) < min_length:
        sys.exit(
            f"FATAL: Environment variable '{name}' is too short "
            f"(got {len(value)} chars, need >= {min_length})."
        )
    return value


def _require_admin_password() -> str:
    """Admin password must be explicitly set — no default permitted."""
    value = os.environ.get('ADMIN_PASSWORD', '')
    if not value:
        sys.exit(
            "FATAL: ADMIN_PASSWORD environment variable must be set. "
            "No default is permitted for admin credentials."
        )
    if len(value) < 12:
        sys.exit(
            "FATAL: ADMIN_PASSWORD must be at least 12 characters."
        )
    return value


def _get_admin_password() -> str:
    """
    Require ADMIN_PASSWORD only in production-like environments.

    This keeps imports lightweight for tests and local tooling while still
    failing fast when production starts without an explicit admin credential.
    """
    flask_env = os.environ.get('FLASK_ENV', 'development').lower()
    if flask_env == 'production':
        return _require_admin_password()
    return os.environ.get('ADMIN_PASSWORD', '')


class Config:
    """Base configuration — secrets are mandatory, no insecure defaults."""

    # ── Flask ─────────────────────────────────────────────────────────────
    # SECRET_KEY and JWT_SECRET_KEY have NO defaults; startup aborts if unset.
    SECRET_KEY     = _require_env('SECRET_KEY',     min_length=32)
    JWT_SECRET_KEY = _require_env('JWT_SECRET_KEY', min_length=32)

    FLASK_APP   = os.environ.get('FLASK_APP',  'app.py')
    FLASK_ENV   = os.environ.get('FLASK_ENV',  'development')
    FLASK_DEBUG = os.environ.get('FLASK_DEBUG', '0') == '1'

    # ── JWT ───────────────────────────────────────────────────────────────
    JWT_ACCESS_TOKEN_EXPIRES   = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES  = timedelta(days=30)
    JWT_TOKEN_LOCATION         = ['headers']
    JWT_HEADER_NAME            = 'Authorization'
    JWT_HEADER_TYPE            = 'Bearer'
    JWT_ERROR_MESSAGE_KEY      = 'error'
    JWT_BLACKLIST_ENABLED      = True
    JWT_BLACKLIST_TOKEN_CHECKS = ['access', 'refresh']

    # ── Email ─────────────────────────────────────────────────────────────
    SMTP_HOST     = os.environ.get('SMTP_HOST',     'smtp.gmail.com')
    SMTP_PORT     = int(os.environ.get('SMTP_PORT', 587))
    SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
    FROM_EMAIL    = os.environ.get('FROM_EMAIL',    'noreply@securetransfer.com')
    APP_NAME      = os.environ.get('APP_NAME',      'Secure File Transfer')

    # ── OTP ───────────────────────────────────────────────────────────────
    OTP_LENGTH         = int(os.environ.get('OTP_LENGTH',         6))
    OTP_EXPIRY_MINUTES = int(os.environ.get('OTP_EXPIRY_MINUTES', 10))
    OTP_MAX_ATTEMPTS   = int(os.environ.get('OTP_MAX_ATTEMPTS',   3))

    # ── Database ──────────────────────────────────────────────────────────
    DB_HOST     = os.environ.get('DB_HOST',     'localhost')
    DB_PORT     = int(os.environ.get('DB_PORT', 3306))
    DB_USER     = os.environ.get('DB_USER',     'root')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
    DB_NAME     = os.environ.get('DB_NAME',     'secure_files')

    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        f'mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size':    10,
        'pool_recycle': 300,
        'pool_pre_ping': True,
        'max_overflow': 20,
        'pool_timeout': 30,
    }

    # ── Redis ─────────────────────────────────────────────────────────────
    REDIS_HOST     = os.environ.get('REDIS_HOST',     'localhost')
    REDIS_PORT     = int(os.environ.get('REDIS_PORT', 6379))
    REDIS_PASSWORD = os.environ.get('REDIS_PASSWORD', '')
    REDIS_DB       = int(os.environ.get('REDIS_DB',   0))

    REDIS_URL = os.environ.get(
        'REDIS_URL',
        f'redis://{":" + REDIS_PASSWORD + "@" if REDIS_PASSWORD else ""}'
        f'{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}'
    )

    # ── SocketIO ──────────────────────────────────────────────────────────
    SOCKETIO_MESSAGE_QUEUE       = os.environ.get('SOCKETIO_MESSAGE_QUEUE', REDIS_URL)
    SOCKETIO_PING_TIMEOUT        = int(os.environ.get('SOCKETIO_PING_TIMEOUT',  60))
    SOCKETIO_PING_INTERVAL       = int(os.environ.get('SOCKETIO_PING_INTERVAL', 25))
    SOCKETIO_CORS_ALLOWED_ORIGINS = os.environ.get(
        'SOCKETIO_CORS_ALLOWED_ORIGINS',
        'http://localhost:3000,http://localhost:5000,http://localhost:5173'
    ).split(',')

    # ── File Upload ───────────────────────────────────────────────────────
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_FILE_SIZE', 10 * 1024 * 1024))  # 10 MB
    UPLOAD_FOLDER      = os.environ.get('UPLOAD_FOLDER', 'uploads')
    ALLOWED_EXTENSIONS = set(
        os.environ.get(
            'ALLOWED_EXTENSIONS',
            'pdf,txt,jpg,jpeg,png,doc,docx,odt,xls,xlsx,ppt,pptx'
        ).split(',')
    )
    MAX_FILES_PER_USER = int(os.environ.get('MAX_FILES_PER_USER', 1000))

    # ── Security ──────────────────────────────────────────────────────────
    BCRYPT_ROUNDS      = int(os.environ.get('BCRYPT_ROUNDS',      12))
    PASSWORD_MIN_LENGTH = int(os.environ.get('PASSWORD_MIN_LENGTH', 8))
    PASSWORD_MAX_LENGTH = int(os.environ.get('PASSWORD_MAX_LENGTH', 100))

    # ── CORS ──────────────────────────────────────────────────────────────
    CORS_ORIGINS  = os.environ.get('CORS_ORIGINS',  'http://localhost:3000,http://localhost:5173,http://localhost:5500,http://127.0.0.1:5500').split(',')
    CORS_METHODS  = os.environ.get('CORS_METHODS',  'GET,POST,PUT,DELETE,OPTIONS').split(',')
    CORS_HEADERS  = [
        header.strip()
        for header in os.environ.get('CORS_HEADERS', 'Content-Type,Authorization').split(',')
        if header.strip()
    ]
    if all(header.lower() != 'x-download-token' for header in CORS_HEADERS):
        CORS_HEADERS.append('X-Download-Token')

    # ── Encryption ────────────────────────────────────────────────────────
    RSA_KEY_SIZE  = int(os.environ.get('RSA_KEY_SIZE',  2048))
    AES_KEY_SIZE  = int(os.environ.get('AES_KEY_SIZE',  32))    # 256 bits
    AES_IV_SIZE   = int(os.environ.get('AES_IV_SIZE',   12))    # GCM IV
    AES_TAG_SIZE  = int(os.environ.get('AES_TAG_SIZE',  16))    # GCM tag
    # KDF: minimum 100,000 rounds for PBKDF2; used by encrypt_private_key()
    KDF_ROUNDS    = int(os.environ.get('KDF_ROUNDS',    100_000))
    KDF_SALT_SIZE = int(os.environ.get('KDF_SALT_SIZE', 32))    # 256-bit salt
    FILE_HASH_SECRET = os.environ.get('FILE_HASH_SECRET', SECRET_KEY)

    # ── Rate Limiting ─────────────────────────────────────────────────────
    RATE_LIMIT_DEFAULT  = os.environ.get('RATE_LIMIT_DEFAULT',  '100/hour')
    RATE_LIMIT_LOGIN    = os.environ.get('RATE_LIMIT_LOGIN',    '5/minute')
    RATE_LIMIT_OTP      = os.environ.get('RATE_LIMIT_OTP',      '3/minute')
    RATE_LIMIT_UPLOAD   = os.environ.get('RATE_LIMIT_UPLOAD',   '10/hour')
    RATE_LIMIT_REGISTER = os.environ.get('RATE_LIMIT_REGISTER', '3/hour')

    # ── Monitoring ────────────────────────────────────────────────────────
    METRICS_COLLECTION_INTERVAL  = int(os.environ.get('METRICS_COLLECTION_INTERVAL',  30))
    ALERT_CHECK_INTERVAL         = int(os.environ.get('ALERT_CHECK_INTERVAL',         60))
    DASHBOARD_REFRESH_INTERVAL   = int(os.environ.get('DASHBOARD_REFRESH_INTERVAL',    5))

    METRICS_RETENTION_DAYS       = int(os.environ.get('METRICS_RETENTION_DAYS',       30))
    ALERT_HISTORY_RETENTION_DAYS = int(os.environ.get('ALERT_HISTORY_RETENTION_DAYS', 90))
    API_LOG_RETENTION_DAYS       = int(os.environ.get('API_LOG_RETENTION_DAYS',       30))
    SESSION_RETENTION_DAYS       = int(os.environ.get('SESSION_RETENTION_DAYS',        7))

    ALERT_COOLDOWN_SECONDS      = int(os.environ.get('ALERT_COOLDOWN_SECONDS',      300))
    ALERT_ESCALATION_INTERVAL   = int(os.environ.get('ALERT_ESCALATION_INTERVAL',   300))
    ALERT_STALE_TIMEOUT         = int(os.environ.get('ALERT_STALE_TIMEOUT',        3600))

    ALERT_EMAIL_ENABLED   = os.environ.get('ALERT_EMAIL_ENABLED',   'false').lower() == 'true'
    ALERT_SLACK_ENABLED   = os.environ.get('ALERT_SLACK_ENABLED',   'false').lower() == 'true'
    ALERT_DISCORD_ENABLED = os.environ.get('ALERT_DISCORD_ENABLED', 'false').lower() == 'true'
    ALERT_SMS_ENABLED     = os.environ.get('ALERT_SMS_ENABLED',     'false').lower() == 'true'
    ALERT_WEBHOOK_ENABLED = os.environ.get('ALERT_WEBHOOK_ENABLED', 'false').lower() == 'true'

    SLACK_WEBHOOK_URL   = os.environ.get('SLACK_WEBHOOK_URL')
    SLACK_CHANNEL       = os.environ.get('SLACK_CHANNEL', '#alerts')
    DISCORD_WEBHOOK_URL = os.environ.get('DISCORD_WEBHOOK_URL')

    TWILIO_ACCOUNT_SID  = os.environ.get('TWILIO_ACCOUNT_SID')
    TWILIO_AUTH_TOKEN   = os.environ.get('TWILIO_AUTH_TOKEN')
    TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')
    ALERT_SMS_RECIPIENTS = (
        os.environ.get('ALERT_SMS_RECIPIENTS', '').split(',')
        if os.environ.get('ALERT_SMS_RECIPIENTS') else []
    )

    SLOW_QUERY_THRESHOLD_MS    = int(os.environ.get('SLOW_QUERY_THRESHOLD_MS',    100))
    SLOW_REQUEST_THRESHOLD_MS  = int(os.environ.get('SLOW_REQUEST_THRESHOLD_MS',  500))
    CRITICAL_CPU_THRESHOLD     = int(os.environ.get('CRITICAL_CPU_THRESHOLD',      95))
    CRITICAL_MEMORY_THRESHOLD  = int(os.environ.get('CRITICAL_MEMORY_THRESHOLD',   95))
    CRITICAL_DISK_THRESHOLD    = int(os.environ.get('CRITICAL_DISK_THRESHOLD',     90))

    SENTRY_DSN                = os.environ.get('SENTRY_DSN')
    ELASTIC_APM_SERVER_URL    = os.environ.get('ELASTIC_APM_SERVER_URL')
    ELASTIC_APM_SERVICE_NAME  = os.environ.get('ELASTIC_APM_SERVICE_NAME', 'secure-file-transfer')
    ELASTIC_APM_ENVIRONMENT   = os.environ.get('ELASTIC_APM_ENVIRONMENT',  FLASK_ENV)
    NEWRELIC_LICENSE_KEY      = os.environ.get('NEWRELIC_LICENSE_KEY')
    DATADOG_API_KEY           = os.environ.get('DATADOG_API_KEY')

    PROMETHEUS_ENABLED = os.environ.get('PROMETHEUS_ENABLED', 'false').lower() == 'true'
    PROMETHEUS_PORT    = int(os.environ.get('PROMETHEUS_PORT', 9100))

    GRAFANA_URL           = os.environ.get('GRAFANA_URL')
    GRAFANA_API_KEY       = os.environ.get('GRAFANA_API_KEY')
    GRAFANA_DASHBOARD_UID = os.environ.get('GRAFANA_DASHBOARD_UID', 'secure-file-transfer')

    DASHBOARD_TITLE      = os.environ.get('DASHBOARD_TITLE', 'Secure File Transfer - Real-time Monitoring')
    DASHBOARD_MAX_POINTS = int(os.environ.get('DASHBOARD_MAX_POINTS', 60))

    HEALTH_CHECK_ENABLED  = os.environ.get('HEALTH_CHECK_ENABLED',  'true').lower() == 'true'
    HEALTH_CHECK_PATH     = os.environ.get('HEALTH_CHECK_PATH',     '/health')
    # Detailed health check is opt-in and requires authentication in the route handler
    HEALTH_CHECK_DETAILED = os.environ.get('HEALTH_CHECK_DETAILED', 'false').lower() == 'true'

    LOG_LEVEL        = os.environ.get('LOG_LEVEL',        'INFO')
    LOG_FORMAT       = os.environ.get('LOG_FORMAT',       'json')
    LOG_FILE         = os.environ.get('LOG_FILE',         'logs/app.log')
    LOG_MAX_BYTES    = int(os.environ.get('LOG_MAX_BYTES', 10 * 1024 * 1024))
    LOG_BACKUP_COUNT = int(os.environ.get('LOG_BACKUP_COUNT', 5))
    LOG_METRICS_ENABLED = os.environ.get('LOG_METRICS_ENABLED', 'true').lower() == 'true'

    # ── Admin ─────────────────────────────────────────────────────────────
    # ADMIN_PASSWORD has NO default; startup aborts if unset.
    ADMIN_EMAIL    = os.environ.get('ADMIN_EMAIL',    'admin@securetransfer.com')
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
    ADMIN_PASSWORD = _get_admin_password()

    # ── Misc ──────────────────────────────────────────────────────────────
    BASE_URL = os.environ.get('BASE_URL', 'http://localhost:5000')

    FEATURE_OTP_ENABLED           = os.environ.get('FEATURE_OTP_ENABLED',           'true').lower() == 'true'
    FEATURE_FILE_SHARING_ENABLED  = os.environ.get('FEATURE_FILE_SHARING_ENABLED',  'true').lower() == 'true'
    FEATURE_MONITORING_ENABLED    = os.environ.get('FEATURE_MONITORING_ENABLED',    'true').lower() == 'true'
    FEATURE_WEBSOCKET_ENABLED     = os.environ.get('FEATURE_WEBSOCKET_ENABLED',     'true').lower() == 'true'

    MAINTENANCE_MODE    = os.environ.get('MAINTENANCE_MODE',    'false').lower() == 'true'
    MAINTENANCE_MESSAGE = os.environ.get('MAINTENANCE_MESSAGE', 'System undergoing maintenance. Please try again later.')


class DevelopmentConfig(Config):
    """Development configuration — secrets still required; use a .env file."""
    DEBUG   = True
    TESTING = False

    SMTP_USERNAME = ''
    SMTP_PASSWORD = ''

    # Rate limiting can be relaxed but not silently disabled
    RATE_LIMIT_DEFAULT  = os.environ.get('RATE_LIMIT_DEFAULT',  '1000/hour')
    RATE_LIMIT_LOGIN    = os.environ.get('RATE_LIMIT_LOGIN',    '30/minute')
    RATE_LIMIT_OTP      = os.environ.get('RATE_LIMIT_OTP',      '20/minute')
    RATE_LIMIT_UPLOAD   = os.environ.get('RATE_LIMIT_UPLOAD',   '100/hour')
    RATE_LIMIT_REGISTER = os.environ.get('RATE_LIMIT_REGISTER', '20/hour')

    METRICS_RETENTION_DAYS  = 1
    API_LOG_RETENTION_DAYS  = 1
    SESSION_RETENTION_DAYS  = 1

    METRICS_COLLECTION_INTERVAL = 10
    ALERT_CHECK_INTERVAL        = 20

    BASE_URL     = 'http://localhost:5000'
    CORS_ORIGINS = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
    ]
    SOCKETIO_CORS_ALLOWED_ORIGINS = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
    ]


class TestingConfig(Config):
    """Testing configuration — uses SQLite in memory; secrets still required via env."""
    TESTING = True
    DEBUG   = True

    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_ENGINE_OPTIONS = {}

    RATE_LIMIT_DEFAULT  = None
    RATE_LIMIT_LOGIN    = None
    RATE_LIMIT_OTP      = None
    RATE_LIMIT_UPLOAD   = None
    RATE_LIMIT_REGISTER = None

    METRICS_COLLECTION_INTERVAL = 999999
    ALERT_CHECK_INTERVAL        = 999999
    FEATURE_MONITORING_ENABLED  = False
    FEATURE_WEBSOCKET_ENABLED   = False

    SMTP_HOST     = 'localhost'
    SMTP_PORT     = 1025
    SMTP_USERNAME = ''
    SMTP_PASSWORD = ''


class ProductionConfig(Config):
    """Production configuration — stricter timeouts and rate limits."""
    DEBUG   = False
    TESTING = False

    BCRYPT_ROUNDS = 13

    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(minutes=30)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)

    LOG_FILE = '/var/log/secure-file-transfer/app.log'

    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size':    20,
        'pool_recycle': 300,
        'pool_pre_ping': True,
        'max_overflow': 40,
        'pool_timeout': 30,
    }

    BASE_URL     = os.environ.get('BASE_URL', 'https://api.securetransfer.com')
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'https://app.securetransfer.com').split(',')

    FEATURE_MONITORING_ENABLED = True
    FEATURE_WEBSOCKET_ENABLED  = True
    PROMETHEUS_ENABLED         = True

    ALERT_EMAIL_ENABLED = True
    ALERT_SLACK_ENABLED = os.environ.get('ALERT_SLACK_ENABLED', 'true').lower() == 'true'

    METRICS_RETENTION_DAYS = 90
    API_LOG_RETENTION_DAYS = 90
    SESSION_RETENTION_DAYS = 30


class StagingConfig(ProductionConfig):
    """Staging — mirrors production with slightly relaxed rate limits for QA."""
    BASE_URL     = os.environ.get('BASE_URL', 'https://staging-api.securetransfer.com')
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'https://staging.securetransfer.com').split(',')

    RATE_LIMIT_LOGIN = '10/minute'
    RATE_LIMIT_OTP   = '5/minute'

    METRICS_RETENTION_DAYS = 7
    API_LOG_RETENTION_DAYS = 7
    SESSION_RETENTION_DAYS = 3


config = {
    'development': DevelopmentConfig,
    'testing':     TestingConfig,
    'staging':     StagingConfig,
    'production':  ProductionConfig,
    'default':     DevelopmentConfig,
}


def get_config():
    """Return the active config class based on FLASK_CONFIG / FLASK_ENV."""
    config_name = os.environ.get('FLASK_CONFIG') or os.environ.get('FLASK_ENV', 'development')
    config_name = config_name.lower()
    return config.get(config_name, Config)
