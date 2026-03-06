#!/usr/bin/env python3
"""
Secure File Transfer Backend with Real Encryption, File Sharing, Email OTP, and Real-time Monitoring
Updated with OTP verification during login - 2FA enabled and Real-time Monitoring v4.0
"""
import os
from flask import Flask, jsonify, request, send_from_directory
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from config import Config
import bcrypt
import logging
from datetime import datetime
from sqlalchemy import text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask app with static folder for monitoring dashboard
app = Flask(__name__, static_folder='monitoring/dashboard', static_url_path='/monitoring')
app.config.from_object(Config)

# ============ IMPORT EXTENSIONS ============
from src.extensions import db, jwt, cors, socketio, limiter
# ===========================================

# Initialize extensions with app
db.init_app(app)
jwt.init_app(app)
cors.init_app(app)
limiter.init_app(app)

# SocketIO is already initialized in extensions.py - no need to call init_app

# ============ IMPORT MODELS ============
from src.models.user import User
from src.models.file import File
from src.models.log import Log
from src.models.otp import OTPCode, OTPLog
from src.models.share import ShareRequest, SharedAccess, ShareLog
from src.models.monitoring import SystemMetric, AlertRule, AlertHistory, UserSession, ApiRequestLog, DashboardConfig, ErrorTracking
# =======================================

# Import services
from src.services.encryption_service import EncryptionService
from src.services.email_service import EmailService
from src.services.otp_service import OTPService

# Import monitoring services
from src.monitoring.metrics import MetricsCollector
from src.monitoring.alerts import AlertManager
from src.monitoring.middleware import MonitoringMiddleware, MetricsMiddleware

# Import blueprints
from src.routes.auth import auth_bp
from src.routes.user import user_bp
from src.routes.files import files_bp
from src.routes.share import share_bp
from src.routes.otp import otp_bp
from src.routes.monitoring import monitoring_bp

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(user_bp, url_prefix='/api/user')
app.register_blueprint(files_bp, url_prefix='/api/files')
app.register_blueprint(share_bp, url_prefix='/api/share')
app.register_blueprint(otp_bp, url_prefix='/api/otp')
app.register_blueprint(monitoring_bp, url_prefix='/api/monitoring')

# ============ IMPORT SOCKET EVENTS ============
from src.monitoring.socket_events import *
# =============================================

# Apply monitoring middleware
app.wsgi_app = MonitoringMiddleware(app.wsgi_app)
app.wsgi_app = MetricsMiddleware(app.wsgi_app)

# ============================================
# JWT CONFIGURATION
# ============================================

@jwt.user_identity_loader
def user_identity_lookup(user):
    if isinstance(user, User):
        return str(user.id)
    return str(user)

@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    identity = jwt_data["sub"]
    try:
        user_id = int(identity)
        return User.query.get(user_id)
    except (ValueError, TypeError):
        return None

@jwt.additional_claims_loader
def add_claims_to_access_token(user):
    if isinstance(user, User):
        return {
            'user_id': user.id,
            'username': user.username
        }
    return {}

# ============================================
# CREATE TABLES AND START MONITORING
# ============================================

with app.app_context():
    # Only create tables if they don't exist
    db.create_all()
    logger.info("Database tables verified/created")
    
    # Initialize monitoring services with app context
    from src.monitoring.metrics import MetricsCollector
    from src.monitoring.alerts import AlertManager
    
    # Pass app reference to monitoring services
    MetricsCollector.init_app(app)
    AlertManager.init_app(app)
    
    # Start background monitoring tasks
    try:
        MetricsCollector.start_collection(
            interval=app.config.get('METRICS_COLLECTION_INTERVAL', 30),
            app=app
        )
        AlertManager.start_monitoring(
            interval=app.config.get('ALERT_CHECK_INTERVAL', 60),
            app=app
        )
        logger.info("📊 Monitoring services started")
    except Exception as e:
        logger.error(f"Failed to start monitoring: {e}")

# ============================================
# STATIC DASHBOARD ROUTE
# ============================================
@app.route('/monitoring')
@app.route('/monitoring/<path:path>')
def serve_monitoring_dashboard(path='index.html'):
    return send_from_directory('monitoring/dashboard', path)

# ============================================
# MAIN ROUTES
# ============================================

@app.route('/')
def index():
    return jsonify({
        'message': 'Secure File Transfer API with Real Encryption, Sharing, OTP & Monitoring',
        'version': '4.0',
        'features': [
            'End-to-end encryption (AES-256-GCM + RSA-2048-OAEP)',
            'User authentication with JWT',
            'Secure file upload/download',
            'File sharing between users',
            'Email OTP verification for sensitive operations',
            '✅ Two-Factor Authentication (2FA) with OTP during login',
            '📊 Real-time system monitoring',
            '🚨 Intelligent alerting',
            '📈 Live metrics dashboard'
        ],
        'monitoring_dashboard': '/monitoring',
        'websocket': 'enabled',
        'endpoints': {
            'health': '/health',
            'auth': {
                'register': '/api/auth/register',
                'login': '/api/auth/login',
                'verify-login-otp': '/api/auth/verify-login-otp',
                'resend-login-otp': '/api/auth/resend-login-otp',
                'logout': '/api/auth/logout',
                'verify': '/api/auth/verify'
            },
            'user': {
                'profile': '/api/user',
                'public_key': '/api/user/public_key',
                'activity': '/api/user/activity'
            },
            'files': {
                'upload': '/api/files/upload',
                'list': '/api/files',
                'download': '/api/files/<id>',
                'delete': '/api/files/<id>',
                'stats': '/api/files/stats'
            },
            'sharing': {
                'request_share': '/api/share/request',
                'get_requests': '/api/share/requests',
                'accept_request': '/api/share/requests/<id>/accept',
                'reject_request': '/api/share/requests/<id>/reject',
                'revoke_share': '/api/share/requests/<id>/revoke',
                'shared_files': '/api/share/shared-files',
                'download_shared': '/api/share/shared-files/<id>/download',
                'share_stats': '/api/share/stats'
            },
            'otp': {
                'send': '/api/otp/send',
                'verify': '/api/otp/verify',
                'resend': '/api/otp/resend/<id>'
            },
            'monitoring': {
                'dashboard': '/monitoring',
                'metrics': '/api/monitoring/metrics/current',
                'alerts': '/api/monitoring/alerts/history',
                'sessions': '/api/monitoring/sessions',
                'api_logs': '/api/monitoring/api-logs'
            }
        }
    })

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'Secure File Transfer',
        'encryption': 'AES-256-GCM + RSA-2048-OAEP',
        'sharing': 'enabled',
        'otp': 'enabled',
        '2fa': 'enabled',
        'monitoring': 'enabled',
        'websocket': 'enabled',
        'timestamp': datetime.utcnow().isoformat()
    })

# ============================================
# AUTHENTICATION ENDPOINTS
# ============================================

@app.route('/api/auth/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not username or len(username) < 3:
            return jsonify({'success': False, 'error': 'Username must be at least 3 characters'}), 400
        
        if not email or '@' not in email:
            return jsonify({'success': False, 'error': 'Invalid email address'}), 400
        
        if not password or len(password) < 8:
            return jsonify({'success': False, 'error': 'Password must be at least 8 characters'}), 400
        
        if User.query.filter_by(username=username).first():
            return jsonify({'success': False, 'error': 'Username already exists'}), 400
        
        if User.query.filter_by(email=email).first():
            return jsonify({'success': False, 'error': 'Email already exists'}), 400
        
        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        private_key_pem, public_key_pem = EncryptionService.generate_rsa_keypair()
        encrypted_private_key = EncryptionService.encrypt_private_key(private_key_pem, password)
        
        user = User(
            username=username,
            email=email,
            password_hash=password_hash,
            rsa_public_key=public_key_pem,
            rsa_private_key_encrypted=encrypted_private_key
        )
        
        db.session.add(user)
        db.session.flush()
        log_action(None, 'register', f'User {username} registered')
        token = create_access_token(identity=user)
        db.session.commit()
        
        logger.info(f"User registered: {username} with ID {user.id}")
        
        # Emit monitoring event
        socketio.emit('user_registered', {
            'user_id': user.id,
            'username': user.username,
            'timestamp': datetime.utcnow().isoformat()
        }, namespace='/monitoring')
        
        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'token': token,
            'user': {
                'id': user.id,
                'username': username,
                'email': email
            },
            'rsa_private_key': private_key_pem,
            'warning': 'SAVE THIS PRIVATE KEY SECURELY! You will need it to decrypt your files.'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Registration failed: {e}")
        return jsonify({'success': False, 'error': 'Registration failed'}), 500

# ============================================
# LOGIN WITH OTP - TWO FACTOR AUTHENTICATION
# ============================================

@app.route('/api/auth/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    """Step 1: Authenticate user with password and send OTP"""
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'success': False, 'error': 'Username and password required'}), 400
        
        user = User.query.filter_by(username=username).first()
        
        if not user or not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
            log_action(None, 'login_failed', f'Failed login for {username}')
            
            # Emit failed login event for monitoring
            socketio.emit('login_failed', {
                'username': username,
                'ip': request.remote_addr,
                'timestamp': datetime.utcnow().isoformat()
            }, namespace='/monitoring')
            
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
        
        if not user.is_active:
            return jsonify({'success': False, 'error': 'Account is disabled'}), 403
        
        otp_result = OTPService.send_otp(
            user_id=user.id,
            email=user.email,
            purpose='login',
            username=user.username,
            request=request
        )
        
        if not otp_result['success']:
            return jsonify({'success': False, 'error': otp_result['error']}), 500
        
        logger.info(f"OTP sent to user: {username} (ID: {user.id})")
        
        return jsonify({
            'success': True,
            'message': 'Password verified. OTP sent to your email.',
            'requires_otp': True,
            'otp_id': otp_result['otp_id'],
            'expires_in': otp_result['expires_in'],
            'user_id': user.id,
            'username': user.username,
            'email': user.email
        }), 200
        
    except Exception as e:
        logger.error(f"Login failed: {e}")
        return jsonify({'success': False, 'error': 'Login failed'}), 500

@app.route('/api/auth/verify-login-otp', methods=['POST'])
@limiter.limit("10 per minute")
def verify_login_otp():
    """Step 2: Verify OTP and complete login"""
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        otp_id = data.get('otp_id')
        otp_code = data.get('otp_code')
        user_id = data.get('user_id')
        
        if not otp_id or not otp_code or not user_id:
            return jsonify({'success': False, 'error': 'OTP ID, code and user ID are required'}), 400
        
        verify_result = OTPService.verify_otp(otp_id, otp_code, user_id, request)
        
        if not verify_result['success']:
            return jsonify({'success': False, 'error': verify_result['error']}), 401
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        token = create_access_token(identity=user)
        log_action(user.id, 'login', f'Successful login with OTP for {user.username}')
        logger.info(f"User logged in with OTP: {user.username}")
        
        # Emit successful login event
        socketio.emit('user_login', {
            'user_id': user.id,
            'username': user.username,
            'ip': request.remote_addr,
            'timestamp': datetime.utcnow().isoformat()
        }, namespace='/monitoring')
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'token': token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"OTP verification failed: {e}")
        return jsonify({'success': False, 'error': 'OTP verification failed'}), 500

@app.route('/api/auth/resend-login-otp', methods=['POST'])
@limiter.limit("5 per hour")
def resend_login_otp():
    """Resend OTP during login"""
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        otp_id = data.get('otp_id')
        user_id = data.get('user_id')
        
        if not otp_id or not user_id:
            return jsonify({'success': False, 'error': 'OTP ID and user ID are required'}), 400
        
        result = OTPService.resend_otp(otp_id, user_id, request)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'otp_id': otp_id,
                'expires_at': result.get('expires_at')
            }), 200
        else:
            return jsonify({'success': False, 'error': result['error']}), 400
        
    except Exception as e:
        logger.error(f"Failed to resend OTP: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    user_id = int(get_jwt_identity())
    log_action(user_id, 'logout', 'User logged out')
    
    # Emit logout event
    socketio.emit('user_logout', {
        'user_id': user_id,
        'timestamp': datetime.utcnow().isoformat()
    }, namespace='/monitoring')
    
    return jsonify({
        'success': True,
        'message': 'Logout successful'
    }), 200

@app.route('/api/auth/verify', methods=['GET'])
@jwt_required()
def verify_token():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    
    return jsonify({
        'success': True,
        'message': 'Token is valid',
        'user': user.to_dict()
    }), 200

# ============================================
# USER ENDPOINTS
# ============================================

@app.route('/api/user', methods=['GET'])
@jwt_required()
def get_user():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    
    return jsonify({
        'success': True,
        'user': user.to_dict()
    }), 200

@app.route('/api/user/public_key', methods=['GET'])
@jwt_required()
def get_public_key():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    
    return jsonify({
        'success': True,
        'public_key': user.rsa_public_key
    }), 200

@app.route('/api/user/activity', methods=['GET'])
@jwt_required()
def get_user_activity():
    user_id = int(get_jwt_identity())
    limit = request.args.get('limit', 20, type=int)
    
    logs = Log.query.filter_by(user_id=user_id)\
        .order_by(Log.timestamp.desc())\
        .limit(limit)\
        .all()
    
    activity = []
    for log in logs:
        activity.append({
            'action': log.action,
            'details': log.details,
            'timestamp': log.timestamp.isoformat() if log.timestamp else None
        })
    
    return jsonify({
        'success': True,
        'activity': activity
    }), 200

# ============================================
# OTP ENDPOINTS
# ============================================

@app.route('/api/otp/send', methods=['POST'])
@jwt_required()
@limiter.limit("10 per hour")
def send_otp():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        purpose = data.get('purpose')
        file_id = data.get('file_id')
        share_request_id = data.get('share_request_id')
        
        if not purpose:
            return jsonify({'success': False, 'error': 'Purpose is required'}), 400
        
        valid_purposes = ['login', 'file_download', 'file_share', 'delete_file', 'change_password', 'verify_email']
        if purpose not in valid_purposes:
            return jsonify({'success': False, 'error': 'Invalid purpose'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        if file_id:
            file = File.query.get(file_id)
            if not file:
                return jsonify({'success': False, 'error': 'File not found'}), 404
            if file.owner_id != user_id and purpose == 'delete_file':
                return jsonify({'success': False, 'error': 'You do not own this file'}), 403
        
        if share_request_id and purpose == 'file_share':
            share_request = ShareRequest.query.get(share_request_id)
            if not share_request:
                return jsonify({'success': False, 'error': 'Share request not found'}), 404
            if share_request.owner_id != user_id:
                return jsonify({'success': False, 'error': 'You do not own this share request'}), 403
        
        result = OTPService.send_otp(
            user_id=user_id,
            email=user.email,
            purpose=purpose,
            username=user.username,
            file_id=file_id,
            share_request_id=share_request_id,
            request=request
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'otp_id': result['otp_id'],
                'expires_in': result['expires_in']
            }), 200
        else:
            return jsonify({'success': False, 'error': result['error']}), 400
        
    except Exception as e:
        logger.error(f"Failed to send OTP: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/otp/verify', methods=['POST'])
@jwt_required()
def verify_otp():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        otp_id = data.get('otp_id')
        otp_code = data.get('otp_code')
        
        if not otp_id or not otp_code:
            return jsonify({'success': False, 'error': 'OTP ID and code are required'}), 400
        
        result = OTPService.verify_otp(otp_id, otp_code, user_id, request)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'purpose': result.get('purpose'),
                'file_id': result.get('file_id'),
                'share_request_id': result.get('share_request_id')
            }), 200
        else:
            return jsonify({'success': False, 'error': result['error']}), 400
        
    except Exception as e:
        logger.error(f"Failed to verify OTP: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/otp/resend/<int:otp_id>', methods=['POST'])
@jwt_required()
@limiter.limit("5 per hour")
def resend_otp(otp_id):
    try:
        user_id = int(get_jwt_identity())
        
        result = OTPService.resend_otp(otp_id, user_id, request)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'expires_at': result.get('expires_at')
            }), 200
        else:
            return jsonify({'success': False, 'error': result['error']}), 400
        
    except Exception as e:
        logger.error(f"Failed to resend OTP: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================
# FILE MANAGEMENT ENDPOINTS
# ============================================

@app.route('/api/files/upload', methods=['POST'])
@jwt_required()
@limiter.limit("50 per day")
def upload_file():
    try:
        user_id = int(get_jwt_identity())
        logger.info(f"Upload requested by user ID: {user_id}")
        
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        allowed_extensions = app.config['ALLOWED_EXTENSIONS']
        file_ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({
                'success': False,
                'error': f'File type .{file_ext} not allowed. Allowed: {", ".join(allowed_extensions)}'
            }), 400
        
        file_data = file.read()
        
        if len(file_data) > app.config['MAX_CONTENT_LENGTH']:
            return jsonify({'success': False, 'error': 'File too large'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        encrypted_file, encrypted_aes_key = EncryptionService.encrypt_file(
            file_data,
            user.rsa_public_key
        )
        
        file_record = File(
            owner_id=user_id,
            filename=file.filename,
            original_size=len(file_data),
            encrypted_file=encrypted_file,
            encrypted_aes_key=encrypted_aes_key
        )
        
        db.session.add(file_record)
        log_action(user_id, 'upload', f'Uploaded {file.filename} ({len(file_data)} bytes)')
        db.session.commit()
        
        logger.info(f"File uploaded: {file.filename} by user {user_id}")
        
        # Emit file upload event
        socketio.emit('file_uploaded', {
            'user_id': user_id,
            'filename': file.filename,
            'file_id': file_record.id,
            'size': len(file_data),
            'timestamp': datetime.utcnow().isoformat()
        }, namespace='/monitoring')
        
        return jsonify({
            'success': True,
            'message': 'File uploaded and encrypted successfully',
            'file': file_record.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"File upload failed: {e}", exc_info=True)
        return jsonify({'success': False, 'error': f'File upload failed: {str(e)}'}), 500

@app.route('/api/files', methods=['GET'])
@jwt_required()
def list_files():
    user_id = int(get_jwt_identity())
    files = File.query.filter_by(owner_id=user_id).order_by(File.upload_date.desc()).all()
    file_list = [f.to_dict() for f in files]
    
    return jsonify({
        'success': True,
        'files': file_list,
        'count': len(file_list)
    }), 200

@app.route('/api/files/<int:file_id>', methods=['GET'])
@jwt_required()
def download_file(file_id):
    try:
        user_id = int(get_jwt_identity())
        
        file_record = File.query.filter_by(id=file_id, owner_id=user_id).first()
        
        if not file_record:
            return jsonify({'success': False, 'error': 'File not found'}), 404
        
        require_otp = request.args.get('skip_otp', 'false').lower() != 'true'
        
        if require_otp:
            otp_verified = request.headers.get('X-OTP-Verified')
            otp_id = request.headers.get('X-OTP-ID')
            
            if not otp_verified or otp_verified != 'true' or not otp_id:
                return jsonify({
                    'success': False,
                    'error': 'OTP verification required',
                    'require_otp': True,
                    'purpose': 'file_download',
                    'file_id': file_id
                }), 403
        
        log_action(user_id, 'download', f'Downloaded {file_record.filename}')
        logger.info(f"File downloaded: {file_record.filename} by user {user_id}")
        
        # Emit download event
        socketio.emit('file_downloaded', {
            'user_id': user_id,
            'filename': file_record.filename,
            'file_id': file_record.id,
            'timestamp': datetime.utcnow().isoformat()
        }, namespace='/monitoring')
        
        return jsonify({
            'success': True,
            'file': {
                'filename': file_record.filename,
                'original_size': file_record.original_size,
                'upload_date': file_record.upload_date.isoformat() if file_record.upload_date else None,
                'encrypted_file': file_record.encrypted_file.hex(),
                'encrypted_aes_key': file_record.encrypted_aes_key.hex()
            }
        }), 200
        
    except Exception as e:
        logger.error(f"File download failed: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/files/<int:file_id>', methods=['DELETE'])
@jwt_required()
def delete_file(file_id):
    try:
        user_id = int(get_jwt_identity())
        
        file_record = File.query.filter_by(id=file_id, owner_id=user_id).first()
        
        if not file_record:
            return jsonify({'success': False, 'error': 'File not found'}), 404
        
        otp_verified = request.headers.get('X-OTP-Verified')
        otp_id = request.headers.get('X-OTP-ID')
        
        if not otp_verified or otp_verified != 'true' or not otp_id:
            return jsonify({
                'success': False,
                'error': 'OTP verification required',
                'require_otp': True,
                'purpose': 'delete_file',
                'file_id': file_id
            }), 403
        
        filename = file_record.filename
        db.session.delete(file_record)
        log_action(user_id, 'delete', f'Deleted {filename}')
        db.session.commit()
        
        logger.info(f"File deleted: {filename} by user {user_id}")
        
        # Emit delete event
        socketio.emit('file_deleted', {
            'user_id': user_id,
            'filename': filename,
            'file_id': file_id,
            'timestamp': datetime.utcnow().isoformat()
        }, namespace='/monitoring')
        
        return jsonify({
            'success': True,
            'message': f'File "{filename}" deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"File delete failed: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/files/stats', methods=['GET'])
@jwt_required()
def get_file_stats():
    user_id = int(get_jwt_identity())
    files = File.query.filter_by(owner_id=user_id).all()
    
    total_files = len(files)
    total_storage = sum(len(f.encrypted_file) for f in files)
    
    file_types = {}
    for file in files:
        ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else 'unknown'
        file_types[ext] = file_types.get(ext, 0) + 1
    
    return jsonify({
        'success': True,
        'stats': {
            'total_files': total_files,
            'total_storage_bytes': total_storage,
            'total_storage_mb': round(total_storage / (1024 * 1024), 2),
            'file_types': file_types
        }
    }), 200

# ============================================
# FILE SHARING ENDPOINTS
# ============================================

@app.route('/api/share/request', methods=['POST'])
@jwt_required()
def request_share():
    try:
        user_id = int(get_jwt_identity())
        logger.info(f"Share request by user ID: {user_id}")
        
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        file_id = data.get('file_id')
        recipient_username = data.get('recipient_username', '').strip()
        
        if not file_id:
            return jsonify({'success': False, 'error': 'File ID is required'}), 400
        
        if not recipient_username:
            return jsonify({'success': False, 'error': 'Recipient username is required'}), 400
        
        can_view = data.get('can_view', True)
        can_download = data.get('can_download', False)
        can_reshare = data.get('can_reshare', False)
        expires_days = data.get('expires_days')
        
        file = File.query.get(file_id)
        if not file:
            return jsonify({'success': False, 'error': 'File not found'}), 404
        
        if file.owner_id != user_id:
            logger.warning(f"Ownership mismatch: file.owner_id={file.owner_id}, user_id={user_id}")
            return jsonify({'success': False, 'error': 'You do not own this file'}), 403
        
        recipient = User.query.filter_by(username=recipient_username).first()
        if not recipient:
            return jsonify({'success': False, 'error': 'Recipient not found'}), 404
        
        if recipient.id == user_id:
            return jsonify({'success': False, 'error': 'Cannot share file with yourself'}), 400
        
        existing = ShareRequest.query.filter_by(
            file_id=file_id,
            recipient_id=recipient.id,
            status='accepted'
        ).first()
        
        if existing:
            return jsonify({'success': False, 'error': 'File is already shared with this user'}), 400
        
        share_request = ShareRequest(
            file_id=file_id,
            owner_id=user_id,
            recipient_id=recipient.id,
            can_view=can_view,
            can_download=can_download,
            can_reshare=can_reshare,
            encrypted_aes_key=file.encrypted_aes_key.hex()
        )
        
        if expires_days:
            from datetime import timedelta
            share_request.expires_at = datetime.utcnow() + timedelta(days=expires_days)
        
        db.session.add(share_request)
        db.session.flush()
        
        log = ShareLog(
            share_request_id=share_request.id,
            user_id=user_id,
            action='request',
            details=f'Requested to share file "{file.filename}" with {recipient_username}'
        )
        db.session.add(log)
        db.session.commit()
        
        logger.info(f"Share request created: file {file_id} from {user_id} to {recipient.id} (Request ID: {share_request.id})")
        
        # Emit share request event
        socketio.emit('share_requested', {
            'request_id': share_request.id,
            'file_id': file_id,
            'owner_id': user_id,
            'recipient_id': recipient.id,
            'timestamp': datetime.utcnow().isoformat()
        }, namespace='/monitoring')
        
        return jsonify({
            'success': True,
            'message': 'Share request sent successfully',
            'share_request': share_request.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Share request failed: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================
# ERROR HANDLERS
# ============================================

@app.errorhandler(404)
def not_found(e):
    return jsonify({'success': False, 'error': 'Resource not found'}), 404

@app.errorhandler(429)
def rate_limit_exceeded(e):
    return jsonify({'success': False, 'error': 'Rate limit exceeded. Please try again later.'}), 429

@app.errorhandler(500)
def internal_error(e):
    db.session.rollback()
    logger.error(f"Internal server error: {e}")
    
    # Track error for monitoring
    try:
        error_track = ErrorTracking(
            error_type='internal_server_error',
            error_message=str(e),
            endpoint=request.path,
            method=request.method,
            user_id=int(get_jwt_identity()) if request.headers.get('Authorization') else None
        )
        db.session.add(error_track)
        db.session.commit()
    except Exception as track_error:
        logger.error(f"Failed to track error: {track_error}")
    
    return jsonify({'success': False, 'error': 'Internal server error'}), 500

# ============================================
# HELPER FUNCTIONS
# ============================================

def log_action(user_id, action, details, ip_address=None, user_agent=None):
    """Helper to create log entries"""
    try:
        log = Log(
            user_id=user_id,
            action=action,
            details=details,
            ip_address=ip_address or request.remote_addr,
            user_agent=user_agent or request.user_agent.string if request.user_agent else None
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        logger.error(f"Failed to create log: {e}")
        db.session.rollback()

# ============================================
# MAIN ENTRY POINT
# ============================================

if __name__ == '__main__':
    print("=" * 80)
    print("🔐 SECURE FILE TRANSFER API WITH REAL-TIME MONITORING v4.0")
    print("=" * 80)
    print(f"📦 Features:")
    print(f"   • End-to-end encryption: AES-256-GCM + RSA-2048-OAEP")
    print(f"   • File sharing between users")
    print(f"   • Secure JWT authentication")
    print(f"   • Activity logging")
    print(f"   • File statistics")
    print(f"   • Email OTP verification (SMTP)")
    print(f"   • ✅ Two-Factor Authentication (2FA) with OTP during login")
    print(f"   • 📊 Real-time system monitoring")
    print(f"   • 🚨 Intelligent alerting")
    print(f"   • 📈 Live metrics dashboard")
    print("=" * 80)
    print(f"🗄️  Database: {app.config['SQLALCHEMY_DATABASE_URI']}")
    print(f"🔑 JWT Secret: {app.config['JWT_SECRET_KEY'][:10]}...")
    print(f"📧 SMTP Server: {app.config.get('SMTP_HOST', 'Not configured')}")
    print(f"📡 WebSocket: Enabled")
    print(f"📊 Monitoring Dashboard: http://localhost:5000/monitoring")
    print("=" * 80)
    print("🚀 Server starting on http://0.0.0.0:5000")
    print("=" * 80)
    
    # Database check
    try:
        with app.app_context():
            db.session.execute(text('SELECT 1'))
            db.session.commit()
            print("✅ Database connection successful")
            
            inspector = db.inspect(db.engine)
            
            if 'share_requests' not in inspector.get_table_names():
                print("⚠️  Share tables not found. Creating...")
                db.create_all()
                print("✅ Share tables created successfully")
            else:
                print("✅ Share tables verified")
            
            if 'otp_codes' not in inspector.get_table_names():
                print("⚠️  OTP tables not found. Creating...")
                db.create_all()
                print("✅ OTP tables created successfully")
            else:
                print("✅ OTP tables verified")
            
            if 'system_metrics' not in inspector.get_table_names():
                print("⚠️  Monitoring tables not found. Creating...")
                db.create_all()
                print("✅ Monitoring tables created successfully")
            else:
                print("✅ Monitoring tables verified")
                
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("   Please check your database configuration in config.py")
    
    # SMTP check
    if not app.config.get('SMTP_USERNAME') or not app.config.get('SMTP_PASSWORD'):
        print("⚠️  Email OTP: SMTP credentials not configured")
        print("   OTP features will not work until configured in .env")
    else:
        print("✅ Email OTP: SMTP configured")
    
    # Redis check
    try:
        import redis
        redis_client = redis.from_url(app.config.get('REDIS_URL', 'redis://localhost:6379/0'))
        redis_client.ping()
        print("✅ Redis connection successful")
    except Exception as e:
        print(f"⚠️  Redis not available - {e}")
        print("   WebSocket will use polling mode")
    
    print("=" * 80)
    
    # Start the server with SocketIO - SAFE VERSION
    from src.extensions import socketio
    
    try:
        # Check if socketio has the server attribute and it's initialized
        if hasattr(socketio, 'server') and socketio.server is not None:
            print("✅ SocketIO server initialized successfully")
            socketio.run(app, debug=True, host='0.0.0.0', port=5000)
        else:
            print("⚠️ SocketIO server not fully initialized - falling back to Flask")
            app.run(debug=True, host='0.0.0.0', port=5000)
    except Exception as e:
        print(f"❌ SocketIO error: {e}")
        print("   Falling back to standard Flask server...")
        app.run(debug=True, host='0.0.0.0', port=5000)