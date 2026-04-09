"""
User routes — /api/user/*

Fixes applied
─────────────
F-08  str(e) never returned to clients; generic messages + error IDs.
F-09  Inline bcrypt calls removed from update_user(); password change
      delegates to AuthService.update_user_profile() which uses
      EncryptionService.verify_password() and hash_password().
F-18  Password strength enforcement: AuthService.update_user_profile()
      calls SecurityUtils.check_password_strength() on the new password.
SQLAlchemy 2.x: User.query.get() → db.session.get()
"""
import uuid
import logging
from typing import cast

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from src.extensions import db
from src.models.user import User
from src.models.log import Log
from src.services.auth_service import AuthService
from src.utils.exceptions import ValidationError, AuthenticationError

logger = logging.getLogger(__name__)

user_bp = Blueprint('user', __name__)


def _log(user_id, action: str, details: str) -> None:
    try:
        db.session.add(Log(
            user_id=user_id,
            action=action,
            details=details,
            ip_address=request.remote_addr,
        ))
    except Exception as exc:
        logger.error(f"Audit log failed: {exc}")


@user_bp.route('', methods=['GET'])
@jwt_required()
def get_user_info():
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        user    = db.session.get(User, user_id)

        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        return jsonify({
            'success': True,
            'user': {
                **user.to_dict(),
                'file_count': len(cast(list, user.files)),
            },
        }), 200

    except Exception:
        logger.error(f"[{err_id}] get_user_info failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to retrieve user information', 'error_id': err_id}), 500


@user_bp.route('/public_key', methods=['GET'])
@jwt_required()
def get_public_key():
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        user    = db.session.get(User, user_id)

        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        return jsonify({'success': True, 'public_key': user.rsa_public_key}), 200

    except Exception:
        logger.error(f"[{err_id}] get_public_key failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to retrieve public key', 'error_id': err_id}), 500


@user_bp.route('/update', methods=['PUT'])
@jwt_required()
def update_user():
    """
    Update email or password.

    Password changes require current_password and enforce strength rules
    via AuthService → SecurityUtils.check_password_strength() (F-18).
    No raw bcrypt calls remain in this route (F-09).
    """
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        data    = request.get_json(silent=True)

        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        result = AuthService.update_user_profile(
            user_id=user_id,
            current_password=data.get('current_password'),
            new_email=data.get('email'),
            new_password=data.get('new_password'),
        )

        if result['updates']:
            _log(user_id, 'update_profile', f"Updated: {list(result['updates'].keys())}")
            db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Profile updated successfully' if result['updates'] else 'No changes made',
            'user':    result['user'],
        }), 200

    except (ValidationError, AuthenticationError) as known:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(known)}), 400
    except Exception:
        db.session.rollback()
        logger.error(f"[{err_id}] update_user failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to update profile', 'error_id': err_id}), 500


@user_bp.route('/activity', methods=['GET'])
@jwt_required()
def get_user_activity():
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        limit   = request.args.get('limit', 50, type=int)
        limit   = max(1, min(limit, 100))

        logs = (
            db.session.query(Log)
            .filter_by(user_id=user_id)
            .order_by(Log.timestamp.desc())
            .limit(limit)
            .all()
        )

        activity = [
            {
                'id':         log.id,
                'action':     log.action,
                'details':    log.details,
                'timestamp':  log.timestamp.isoformat() if log.timestamp else None,
                'ip_address': log.ip_address,
            }
            for log in logs
        ]

        return jsonify({'success': True, 'activity': activity, 'count': len(activity)}), 200

    except Exception:
        logger.error(f"[{err_id}] get_user_activity failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to retrieve activity logs', 'error_id': err_id}), 500


@user_bp.route('/check_username/<username>', methods=['GET'])
def check_username(username):
    try:
        result = AuthService.check_username_availability(username.strip())
        return jsonify({'success': True, **result}), 200
    except Exception as exc:
        logger.error(f"check_username error: {exc}")
        return jsonify({'success': False, 'error': 'Failed to check username'}), 500


@user_bp.route('/check_email/<email>', methods=['GET'])
def check_email(email):
    try:
        result = AuthService.check_email_availability(email.strip())
        return jsonify({'success': True, **result}), 200
    except Exception as exc:
        logger.error(f"check_email error: {exc}")
        return jsonify({'success': False, 'error': 'Failed to check email'}), 500


@user_bp.route('/public-key/<username>', methods=['GET'])
@jwt_required()
def get_user_public_key(username):
    """
    Return a user's RSA-2048 public key PEM.
    
    Used by file sharers to perform client-side key re-wrapping:
    they fetch the recipient's public key and re-encrypt the file's 
    AES key with it before requesting the share (F-05).
    
    Returns:
        200: Public key PEM (safe to expose)
        404: User not found or has no public key
    """
    err_id = uuid.uuid4().hex
    try:
        user = db.session.query(User).filter_by(username=username.strip(), is_active=True).first()
        
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        if not user.rsa_public_key:
            return jsonify({
                'success': False,
                'error': 'User has no RSA public key. Ask them to log out and log back in to generate one.'
            }), 404
        
        return jsonify({
            'success':    True,
            'username':   user.username,
            'public_key': user.rsa_public_key,  # PEM-formatted string
        }), 200
    
    except Exception:
        logger.error(f"[{err_id}] get_user_public_key failed", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve public key',
            'error_id': err_id
        }), 500


@user_bp.route('/me/private-key', methods=['GET'])
@jwt_required()
def get_my_private_key():
    """
    Return the current user's AES-GCM-encrypted RSA private key.
    
    The server NEVER returns the plaintext private key. Only the
    password-protected envelope is returned. The client decrypts it
    locally using the user's password and Argon2id KDF to derive
    the AES key.
    
    Format: salt_hex:iv_hex:ciphertext_hex:tag_hex
    (matches EncryptionService.encrypt_private_key() output)
    
    Returns:
        200: Encrypted private key envelope
        404: Private key not found
    """
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        if not user.rsa_private_key_encrypted:
            return jsonify({
                'success': False,
                'error': 'Private key not found. Please contact support.'
            }), 404
        
        return jsonify({
            'success':                 True,
            'encrypted_private_key':   user.rsa_private_key_encrypted,  # salt:iv:ct:tag
        }), 200
    
    except Exception:
        logger.error(f"[{err_id}] get_my_private_key failed", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve private key',
            'error_id': err_id
        }), 500