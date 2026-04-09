"""
File routes — /api/files/*

Fixes applied
─────────────
F-02  download_file and delete_file now require a server-issued OTP
      download token (X-Download-Token).  ?skip_otp and X-OTP-Verified
      are gone entirely.
F-04  secure_filename() applied inside FileService.upload_file().
F-08  str(e) never returned; generic messages + error IDs.
F-09  Inline encrypt_file_with_aes() removed; all crypto via FileService
      → EncryptionService (single source of truth).
Runtime fix: hash(file_data) replaced by EncryptionService.generate_file_hash()
      (SHA-256). Python's built-in hash() is process-local, non-deterministic
      across restarts, and useless for deduplication or integrity checks.
Performance: get_stats() no longer loads every encrypted BLOB into memory;
      SQL aggregates used via FileService.get_file_stats().
SQLAlchemy 2.x: Model.query.get() → db.session.get()
datetime.utcnow() → datetime.now(timezone.utc)
"""
import uuid
import logging
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin

from src.extensions import db, socketio
from src.models.log import Log
from src.models.file import File
from src.services.file_service import FileService
from src.utils.exceptions import ValidationError, FileError

logger = logging.getLogger(__name__)

files_bp = Blueprint('files', __name__)


def _log(user_id, action: str, details: str) -> None:
    try:
        db.session.add(Log(
            user_id=user_id,
            action=action,
            details=details,
            ip_address=request.remote_addr,
            user_agent=request.user_agent.string if request.user_agent else None,
        ))
    except Exception as exc:
        logger.error(f"Audit log failed: {exc}")


# ── upload ────────────────────────────────────────────────────────────────────

@files_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    """
    Validate, encrypt, and persist an uploaded file.
    Filename is sanitised with secure_filename() inside FileService.
    """
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())

        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400

        file_record = FileService.upload_file(user_id, request.files['file'])
        _log(user_id, 'upload', f'Uploaded {file_record.filename} ({file_record.original_size} bytes)')
        db.session.commit()

        logger.info(f"File uploaded: {file_record.filename} by user {user_id}")
        socketio.emit('file_uploaded', {
            'user_id':   user_id,
            'filename':  file_record.filename,
            'file_id':   file_record.id,
            'size':      file_record.original_size,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }, namespace='/monitoring')

        return jsonify({
            'success': True,
            'message': 'File uploaded successfully',
            'file':    file_record.to_dict(),
        }), 201

    except (ValidationError, FileError) as known:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(known)}), 400
    except Exception:
        db.session.rollback()
        logger.error(f"[{err_id}] Upload failed for user {get_jwt_identity()}", exc_info=True)
        return jsonify({'success': False, 'error': 'Upload failed', 'error_id': err_id}), 500


# ── list ──────────────────────────────────────────────────────────────────────

@files_bp.route('', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_files():
    """Return paginated file metadata — no encrypted payloads."""
    err_id = uuid.uuid4().hex
    try:
        user_id  = int(get_jwt_identity())
        page     = max(request.args.get('page',     1,  type=int), 1)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        search   = request.args.get('search')

        result = FileService.get_user_files(
            user_id, page=page, per_page=per_page, search=search
        )
        return jsonify({'success': True, **result}), 200

    except Exception:
        logger.error(f"[{err_id}] list_files failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to retrieve files', 'error_id': err_id}), 500


# ── download ──────────────────────────────────────────────────────────────────

@files_bp.route('/<int:file_id>', methods=['GET'])
@jwt_required()
def download_file(file_id):
    """
    Return encrypted blobs for client-side decryption.

    Requires a valid OTP download token in the X-Download-Token header.
    Obtain the token via POST /api/otp/verify with purpose='file_download'.
    The token is HMAC-SHA256 signed and encodes user_id + file_id + expiry;
    it cannot be forged by the client.
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

        file_data = FileService.get_file_for_access(user_id, file_id, required_permission='download')
        _log(user_id, 'download', f'Downloaded file id={file_id}')
        db.session.commit()

        logger.info(f"File downloaded: id={file_id} by user {user_id}")
        socketio.emit('file_downloaded', {
            'user_id':   user_id,
            'file_id':   file_id,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }, namespace='/monitoring')
        return jsonify({'success': True, 'file': file_data}), 200

    except (ValidationError, FileError) as known:
        _log(user_id, 'download_failed', f'Failed download file id={file_id}: {known}')  # type: ignore[name-defined]
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
        return jsonify({'success': False, 'error': str(known)}), 404
    except Exception:
        logger.error(f"[{err_id}] download_file({file_id}) failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Download failed', 'error_id': err_id}), 500


@files_bp.route('/<int:file_id>/content', methods=['GET'])
@jwt_required()
def get_file_content(file_id):
    """
    Return encrypted blobs for client-side preview or download.
    The API never returns plaintext.
    """
    err_id = uuid.uuid4().hex
    try:
        from src.utils.security import SecurityUtils

        user_id        = int(get_jwt_identity())
        intent         = request.args.get('intent', 'view')
        download_token = request.headers.get('X-Download-Token', '')

        if intent not in ('view', 'download'):
            return jsonify({'success': False, 'error': 'intent must be view or download'}), 400

        if not SecurityUtils.verify_otp_download_token(download_token, user_id, file_id):
            return jsonify({
                'success':     False,
                'error':       'A valid OTP download token is required',
                'require_otp': True,
                'purpose':     'file_download',
                'file_id':     file_id,
            }), 403

        file_data = FileService.get_file_for_access(user_id, file_id, required_permission=intent)
        _log(user_id, intent, f'{intent.title()}ed file id={file_id}')
        db.session.commit()

        return jsonify({'success': True, 'intent': intent, 'file': file_data}), 200

    except (ValidationError, FileError) as known:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(known)}), 404
    except Exception:
        db.session.rollback()
        logger.error(f"[{err_id}] get_file_content({file_id}) failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to retrieve file content', 'error_id': err_id}), 500


# ── get file key (for client-side re-wrapping) ─────────────────────────────────

@files_bp.route('/<int:file_id>/key', methods=['GET'])
@cross_origin()
@jwt_required()
def get_file_key(file_id):
    """
    Return only the owner's encrypted AES key for client-side re-wrapping.
    
    Does NOT require an OTP download token — JWT ownership check is sufficient
    because no file content is exposed, only the RSA-wrapped key envelope.
    The encrypted_aes_key alone is useless without the owner's private key
    (which never leaves the browser).
    
    Used by the share flow to obtain the AES key that will be
    unwrapped with the owner's private key, then re-wrapped for the recipient.
    """
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        
        # The caller must own the file
        file_record = db.session.query(File).filter_by(
            id=file_id,
            owner_id=user_id
        ).first()
        
        if not file_record:
            return jsonify({'success': False, 'error': 'File not found'}), 404
        
        # Return the encrypted AES key (already in hex from model or convert bytes)
        encrypted_aes_key_hex = (
            file_record.encrypted_aes_key.hex()
            if isinstance(file_record.encrypted_aes_key, bytes)
            else file_record.encrypted_aes_key
        )
        
        return jsonify({
            'success': True,
            'file_id': file_id,
            'encrypted_aes_key': encrypted_aes_key_hex,
        }), 200
    
    except Exception:
        logger.error(f"[{err_id}] get_file_key({file_id}) failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to retrieve file key', 'error_id': err_id}), 500


# ── delete ────────────────────────────────────────────────────────────────────

@files_bp.route('/<int:file_id>', methods=['DELETE'])
@jwt_required()
def delete_file(file_id):
    """Delete a file. Requires an OTP download token scoped to this file_id."""
    err_id = uuid.uuid4().hex
    try:
        from src.utils.security import SecurityUtils

        user_id        = int(get_jwt_identity())
        download_token = request.headers.get('X-Download-Token', '')

        if not SecurityUtils.verify_otp_download_token(download_token, user_id, file_id):
            return jsonify({
                'success':     False,
                'error':       'A valid OTP token is required to delete files',
                'require_otp': True,
                'purpose':     'delete_file',
                'file_id':     file_id,
            }), 403

        filename = FileService.delete_file(user_id, file_id)
        _log(user_id, 'delete', f'Deleted {filename}')
        db.session.commit()

        logger.info(f"File deleted: {filename} by user {user_id}")
        socketio.emit('file_deleted', {
            'user_id':   user_id,
            'filename':  filename,
            'file_id':   file_id,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }, namespace='/monitoring')
        return jsonify({'success': True, 'message': f'File "{filename}" deleted successfully'}), 200

    except (ValidationError, FileError) as known:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(known)}), 404
    except Exception:
        db.session.rollback()
        logger.error(f"[{err_id}] delete_file({file_id}) failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Delete failed', 'error_id': err_id}), 500


# ── stats ─────────────────────────────────────────────────────────────────────

@files_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    """
    Return file statistics using SQL aggregates.
    No encrypted BLOBs are loaded into Python memory.
    """
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        stats   = FileService.get_file_stats(user_id)
        return jsonify({'success': True, 'stats': stats}), 200
    except Exception:
        logger.error(f"[{err_id}] get_stats failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to get statistics', 'error_id': err_id}), 500
