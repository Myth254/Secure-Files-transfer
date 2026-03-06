from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import bcrypt
from src.extensions import db
from src.models.user import User
from src.models.log import Log
from src.utils.validators import validate_registration, validate_login
from src.services.otp_service import OTPService
import logging

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

def generate_rsa_keys():
    """Generate RSA key pair"""
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.backends import default_backend
    
    private_key = rsa.generate_private_key(
        public_exponent=65537, 
        key_size=2048, 
        backend=default_backend()
    )
    public_key = private_key.public_key()
    
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    return private_pem.decode(), public_pem.decode()

def encrypt_private_key_for_storage(private_key_pem: str, password: str) -> str:
    """Encrypt private key with password-derived key"""
    import os
    
    salt = os.urandom(16)
    key = bcrypt.kdf(
        password=password.encode(),
        salt=salt,
        desired_key_bytes=32,
        rounds=100
    )
    
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.backends import default_backend
    
    iv = os.urandom(12)
    cipher = Cipher(algorithms.AES(key), modes.GCM(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    
    encrypted = iv + encryptor.update(private_key_pem.encode()) + encryptor.finalize() + encryptor.tag
    
    return f"{salt.hex()}:{encrypted.hex()}"

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Validate input
        if not username or len(username) < 3:
            return jsonify({'success': False, 'error': 'Username must be at least 3 characters'}), 400
        if not email or '@' not in email:
            return jsonify({'success': False, 'error': 'Invalid email address'}), 400
        if not password or len(password) < 8:
            return jsonify({'success': False, 'error': 'Password must be at least 8 characters'}), 400
        
        # Check if user already exists
        if User.query.filter_by(username=username).first():
            return jsonify({'success': False, 'error': 'Username already exists'}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({'success': False, 'error': 'Email already exists'}), 400
        
        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        private_key, public_key = generate_rsa_keys()
        encrypted_private = encrypt_private_key_for_storage(private_key, password)
        
        user = User(
            username=username,
            email=email,
            password_hash=password_hash,
            rsa_public_key=public_key,
            rsa_private_key_encrypted=encrypted_private
        )
        
        db.session.add(user)
        
        log_entry = Log(
            action='register',
            details=f'User {username} registered',
            ip_address=request.remote_addr,
            user_agent=request.user_agent.string if request.user_agent else None
        )
        db.session.add(log_entry)
        db.session.commit()
        
        # ============ FIX: CREATE AND RETURN TOKEN ============
        token = create_access_token(identity=user)
        # ======================================================
        
        logger.info(f"New user registered: {username} (ID: {user.id})")
        
        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'token': token,  # <-- TOKEN ADDED HERE
            'user': {
                'id': user.id,
                'username': username,
                'email': email
            },
            'rsa_private_key': private_key,
            'warning': 'SAVE THIS PRIVATE KEY SECURELY! You will need it to decrypt your files.'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Registration error: {str(e)}")
        return jsonify({'success': False, 'error': 'Registration failed. Please try again.'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Step 1: Authenticate user with password and send OTP"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'success': False, 'error': 'Username and password required'}), 400
        
        user = User.query.filter_by(username=username).first()
        
        if not user or not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
            log_entry = Log(
                action='login_failed',
                details=f'Failed login attempt for username: {username}',
                ip_address=request.remote_addr,
                user_agent=request.user_agent.string if request.user_agent else None
            )
            db.session.add(log_entry)
            db.session.commit()
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
        logger.error(f"Login error: {str(e)}")
        return jsonify({'success': False, 'error': 'Login failed. Please try again.'}), 500

@auth_bp.route('/verify-login-otp', methods=['POST'])
def verify_login_otp():
    """Step 2: Verify OTP and complete login"""
    try:
        data = request.get_json()
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
        
        log_entry = Log(
            user_id=user.id,
            action='login',
            details=f'Successful login with OTP for {user.username}',
            ip_address=request.remote_addr,
            user_agent=request.user_agent.string if request.user_agent else None
        )
        db.session.add(log_entry)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'token': token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"OTP verification error: {str(e)}")
        return jsonify({'success': False, 'error': 'OTP verification failed'}), 500

@auth_bp.route('/resend-login-otp', methods=['POST'])
def resend_login_otp():
    """Resend OTP during login"""
    try:
        data = request.get_json()
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
        return jsonify({'success': False, 'error': 'Failed to resend OTP'}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    user_id = int(get_jwt_identity())
    
    log_entry = Log(
        user_id=user_id,
        action='logout',
        details='User logged out',
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string if request.user_agent else None
    )
    db.session.add(log_entry)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Logout successful'
    }), 200

@auth_bp.route('/verify', methods=['GET'])
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