"""
OTP routes — /api/otp/*

Fixes applied
─────────────
F-08  str(e) never returned to clients; generic messages + error IDs.
url_prefix removed from Blueprint constructor — it is registered as
  /api/otp in app.py.  Having it in both places caused doubled paths
  (/api/otp/api/otp/send).
request object passed to OTPService calls that need IP/UA for logging.
resend_otp: user_id no longer read from request body; only otp_id needed
  (user_id resolved from DB record inside OTPService).
SQLAlchemy 2.x: Model.query.get() → db.session.get()
"""
import uuid
import logging

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from src.extensions import db
from src.models.user import User
from src.models.file import File
from src.models.share import ShareRequest
from src.services.otp_service import OTPService

logger = logging.getLogger(__name__)

# No url_prefix here — registered as /api/otp in app.py
otp_bp = Blueprint('otp', __name__)


@otp_bp.route('/send', methods=['POST'])
@jwt_required()
def send_otp():
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        data    = request.get_json(silent=True)

        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

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

        if file_id:
            f = db.session.get(File, file_id)
            if not f:
                return jsonify({'success': False, 'error': 'File not found'}), 404
            if purpose == 'delete_file' and f.owner_id != user_id:
                return jsonify({'success': False, 'error': 'You do not own this file'}), 403

        if share_request_id and purpose == 'file_share':
            sr = db.session.get(ShareRequest, share_request_id)
            if not sr:
                return jsonify({'success': False, 'error': 'Share request not found'}), 404
            if sr.owner_id != user_id:
                return jsonify({'success': False, 'error': 'You do not own this share request'}), 403

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

    except Exception:
        logger.error(f"[{err_id}] send_otp failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to send OTP', 'error_id': err_id}), 500


@otp_bp.route('/verify', methods=['POST'])
@jwt_required()
def verify_otp():
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        data    = request.get_json(silent=True)

        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        otp_id   = data.get('otp_id')
        otp_code = data.get('otp_code')

        if not otp_id or not otp_code:
            return jsonify({'success': False, 'error': 'OTP ID and code are required'}), 400

        result = OTPService.verify_otp(otp_id, otp_code, user_id, request)

        if result['success']:
            return jsonify({
                'success':          True,
                'message':          result['message'],
                'purpose':          result.get('purpose'),
                'file_id':          result.get('file_id'),
                'share_request_id': result.get('share_request_id'),
                # Short-lived HMAC-signed token for file operations (F-02)
                'download_token':   result.get('download_token'),
            }), 200
        return jsonify({'success': False, 'error': 'OTP verification failed'}), 400

    except Exception:
        logger.error(f"[{err_id}] verify_otp failed", exc_info=True)
        return jsonify({'success': False, 'error': 'OTP verification failed', 'error_id': err_id}), 500


@otp_bp.route('/resend/<int:otp_id>', methods=['POST'])
@jwt_required()
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

    except Exception:
        logger.error(f"[{err_id}] resend_otp failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to resend OTP', 'error_id': err_id}), 500