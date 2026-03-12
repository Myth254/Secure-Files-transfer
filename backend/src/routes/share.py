"""
Share routes — /api/share/*

Fixes applied
─────────────
F-02  download_shared_file requires a server-issued OTP download token.
F-05  request_share() no longer accepts the request without
      recipient_encrypted_aes_key.  The client must supply the AES key
      re-encrypted with the *recipient's* RSA public key.  The server
      no longer copies the owner's wrapped key verbatim (which the
      recipient could never decrypt).
F-08  str(e) never returned to clients; generic messages + error IDs.
Type fix: encrypted_aes_key is now LargeBinary; hex() called only at JSON
      serialisation boundary.
SQLAlchemy 2.x: Model.query.get() → db.session.get()
datetime.utcnow() → datetime.now(timezone.utc)
"""
import uuid
import logging
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from src.extensions import db
from src.models.file import File
from src.models.share import ShareRequest, SharedAccess, ShareLog
from src.services.share_service import ShareService
from src.utils.exceptions import ValidationError

logger = logging.getLogger(__name__)

share_bp = Blueprint('share', __name__)


@share_bp.route('/request', methods=['POST'])
@jwt_required()
def request_share():
    """
    Create a share request.

    The caller MUST supply recipient_encrypted_aes_key — the AES key
    re-encrypted client-side with the recipient's RSA public key (F-05).
    """
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        data    = request.get_json(silent=True)

        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        file_id                     = data.get('file_id')
        recipient_username          = data.get('recipient_username', '').strip()
        recipient_encrypted_aes_key = data.get('recipient_encrypted_aes_key', '')

        if not file_id:
            return jsonify({'success': False, 'error': 'File ID is required'}), 400
        if not recipient_username:
            return jsonify({'success': False, 'error': 'Recipient username is required'}), 400
        if not recipient_encrypted_aes_key:
            return jsonify({
                'success': False,
                'error': (
                    'recipient_encrypted_aes_key is required. '
                    'Re-encrypt the AES key with the recipient\'s RSA public key before sharing.'
                ),
            }), 400

        try:
            aes_key_bytes = bytes.fromhex(recipient_encrypted_aes_key)
        except ValueError:
            return jsonify({'success': False, 'error': 'recipient_encrypted_aes_key must be hex-encoded'}), 400

        share_request = ShareService.request_file_share(
            owner_id=user_id,
            file_id=file_id,
            recipient_username=recipient_username,
            recipient_encrypted_aes_key=aes_key_bytes, # type: ignore
            can_view=data.get('can_view', True),
            can_download=data.get('can_download', False),
            can_reshare=data.get('can_reshare', False),
            expires_days=data.get('expires_days'),
        )

        return jsonify({
            'success':       True,
            'message':       'Share request sent successfully',
            'share_request': share_request.to_dict(),
        }), 201

    except ValidationError as ve:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(ve)}), 400
    except Exception:
        db.session.rollback()
        logger.error(f"[{err_id}] request_share failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Share request failed', 'error_id': err_id}), 500


@share_bp.route('/requests', methods=['GET'])
@jwt_required()
def get_share_requests():
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        role    = request.args.get('role', 'recipient')

        if role not in ('recipient', 'owner'):
            return jsonify({'success': False, 'error': 'role must be recipient or owner'}), 400

        result = ShareService.get_share_requests(user_id, role)
        return jsonify(result), 200

    except Exception:
        logger.error(f"[{err_id}] get_share_requests failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to get share requests', 'error_id': err_id}), 500


@share_bp.route('/requests/<int:request_id>/accept', methods=['POST'])
@jwt_required()
def accept_share_request(request_id):
    err_id = uuid.uuid4().hex
    try:
        user_id       = int(get_jwt_identity())
        shared_access = ShareService.accept_share_request(request_id, user_id)
        return jsonify({
            'success':       True,
            'message':       'Share request accepted',
            'shared_access': shared_access.to_dict(),
        }), 200
    except ValidationError as ve:
        return jsonify({'success': False, 'error': str(ve)}), 400
    except Exception:
        logger.error(f"[{err_id}] accept_share_request failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to accept share request', 'error_id': err_id}), 500


@share_bp.route('/requests/<int:request_id>/reject', methods=['POST'])
@jwt_required()
def reject_share_request(request_id):
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        sr      = ShareService.reject_share_request(request_id, user_id)
        return jsonify({'success': True, 'message': 'Share request rejected', 'share_request': sr.to_dict()}), 200
    except ValidationError as ve:
        return jsonify({'success': False, 'error': str(ve)}), 400
    except Exception:
        logger.error(f"[{err_id}] reject_share_request failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to reject share request', 'error_id': err_id}), 500


@share_bp.route('/requests/<int:request_id>/revoke', methods=['POST'])
@jwt_required()
def revoke_share(request_id):
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        sr      = ShareService.revoke_share(request_id, user_id)
        return jsonify({'success': True, 'message': 'Share revoked successfully', 'share_request': sr.to_dict()}), 200
    except ValidationError as ve:
        return jsonify({'success': False, 'error': str(ve)}), 400
    except Exception:
        logger.error(f"[{err_id}] revoke_share failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to revoke share', 'error_id': err_id}), 500


@share_bp.route('/shared-files', methods=['GET'])
@jwt_required()
def get_shared_files():
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        result  = ShareService.get_shared_files(user_id)
        return jsonify(result), 200
    except Exception:
        logger.error(f"[{err_id}] get_shared_files failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to get shared files', 'error_id': err_id}), 500


@share_bp.route('/shared-files/<int:file_id>/download', methods=['GET'])
@jwt_required()
def download_shared_file(file_id):
    """
    Return encrypted blobs for a shared file.

    Requires an OTP download token (X-Download-Token) — same security
    model as the owner download endpoint (F-02).
    Returns the recipient-specific encrypted_aes_key, NOT the owner's key.
    """
    err_id = uuid.uuid4().hex
    try:
        from src.utils.security import SecurityUtils

        user_id        = int(get_jwt_identity())
        download_token = request.headers.get('X-Download-Token', '')

        if not SecurityUtils.verify_otp_download_token(download_token, user_id, file_id):
            return jsonify({
                'success':     False,
                'error':       'A valid OTP download token is required',
                'require_otp': True,
                'purpose':     'file_download',
                'file_id':     file_id,
            }), 403

        access = (
            SharedAccess.query
            .filter_by(file_id=file_id, recipient_id=user_id)
            .filter(SharedAccess.revoked_at.is_(None))
            .first()
        )

        if not access:
            return jsonify({'success': False, 'error': 'No access to this file'}), 403
        if not access.can_download:
            return jsonify({'success': False, 'error': 'Download permission not granted'}), 403

        file_obj = db.session.get(File, file_id)
        if not file_obj:
            return jsonify({'success': False, 'error': 'File not found'}), 404

        # Fetch the recipient-specific wrapped AES key from the share request
        share_req = db.session.get(ShareRequest, access.share_request_id)
        if not share_req or not share_req.encrypted_aes_key:
            return jsonify({
                'success': False,
                'error':   'Recipient AES key is not available for this share',
            }), 500

        access.download_count += 1
        access.last_accessed   = datetime.now(timezone.utc)

        db.session.add(ShareLog(
            share_request_id=access.share_request_id,
            user_id=user_id,
            action='download',
            details=f'Downloaded shared file "{file_obj.filename}"',
        ))
        db.session.commit()

        return jsonify({
            'success': True,
            'file': {
                'filename':      file_obj.filename,
                'original_size': file_obj.original_size,
                'encrypted_file':    file_obj.encrypted_file.hex(),
                # Recipient-specific key — NOT the owner's key
                'encrypted_aes_key': share_req.encrypted_aes_key.hex()
                    if isinstance(share_req.encrypted_aes_key, bytes)
                    else share_req.encrypted_aes_key,
            },
        }), 200

    except Exception:
        db.session.rollback()
        logger.error(f"[{err_id}] download_shared_file({file_id}) failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Download failed', 'error_id': err_id}), 500


@share_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_share_stats():
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())

        shares_sent      = ShareRequest.query.filter_by(owner_id=user_id).count()
        shares_accepted  = ShareRequest.query.filter_by(owner_id=user_id, status='accepted').count()
        shares_received  = ShareRequest.query.filter_by(recipient_id=user_id).count()
        files_accessible = (
            SharedAccess.query
            .filter_by(recipient_id=user_id)
            .filter(SharedAccess.revoked_at.is_(None))
            .count()
        )

        return jsonify({
            'success': True,
            'stats': {
                'shares_sent':      shares_sent,
                'shares_accepted':  shares_accepted,
                'shares_received':  shares_received,
                'files_accessible': files_accessible,
                'acceptance_rate':  round(
                    (shares_accepted / shares_sent * 100) if shares_sent > 0 else 0, 2
                ),
            },
        }), 200

    except Exception:
        logger.error(f"[{err_id}] get_share_stats failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to get share stats', 'error_id': err_id}), 500