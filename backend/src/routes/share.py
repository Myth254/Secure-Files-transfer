"""
Share Routes for File Sharing
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from src.extensions import db
from src.models.user import User
from src.models.file import File
from src.models.share import ShareRequest, SharedAccess, ShareLog
from src.services.share_service import ShareService

logger = logging.getLogger(__name__)

share_bp = Blueprint('share', __name__)

@share_bp.route('/request', methods=['POST'])
@jwt_required()
def request_share():
    """
    Request to share a file with another user
    ---
    tags: [Sharing]
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        file_id = data.get('file_id')
        recipient_username = data.get('recipient_username', '').strip()
        
        if not file_id:
            return jsonify({'success': False, 'error': 'File ID is required'}), 400
        
        if not recipient_username:
            return jsonify({'success': False, 'error': 'Recipient username is required'}), 400
        
        # Permissions (default to view only)
        can_view = data.get('can_view', True)
        can_download = data.get('can_download', False)
        can_reshare = data.get('can_reshare', False)
        expires_days = data.get('expires_days')
        
        # Create share request
        share_request = ShareService.request_file_share(
            owner_id=user_id,
            file_id=file_id,
            recipient_username=recipient_username,
            can_view=can_view,
            can_download=can_download,
            can_reshare=can_reshare,
            expires_days=expires_days
        )
        
        return jsonify({
            'success': True,
            'message': 'Share request sent successfully',
            'share_request': share_request.to_dict()
        }), 201
        
    except Exception as e:
        logger.error(f"Share request failed: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@share_bp.route('/requests', methods=['GET'])
@jwt_required()
def get_share_requests():
    """
    Get share requests for current user
    ---
    tags: [Sharing]
    parameters:
      - name: role
        in: query
        type: string
        enum: [recipient, owner]
        default: recipient
    """
    try:
        user_id = get_jwt_identity()
        role = request.args.get('role', 'recipient')
        
        if role not in ['recipient', 'owner']:
            return jsonify({'success': False, 'error': 'Invalid role'}), 400
        
        result = ShareService.get_share_requests(user_id, role)
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Failed to get share requests: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@share_bp.route('/requests/<int:request_id>/accept', methods=['POST'])
@jwt_required()
def accept_share_request(request_id):
    """
    Accept a share request
    ---
    tags: [Sharing]
    parameters:
      - name: request_id
        in: path
        required: true
        type: integer
    """
    try:
        user_id = get_jwt_identity()
        
        shared_access = ShareService.accept_share_request(request_id, user_id)
        
        return jsonify({
            'success': True,
            'message': 'Share request accepted',
            'shared_access': shared_access.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to accept share request: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@share_bp.route('/requests/<int:request_id>/reject', methods=['POST'])
@jwt_required()
def reject_share_request(request_id):
    """
    Reject a share request
    ---
    tags: [Sharing]
    """
    try:
        user_id = get_jwt_identity()
        
        share_request = ShareService.reject_share_request(request_id, user_id)
        
        return jsonify({
            'success': True,
            'message': 'Share request rejected',
            'share_request': share_request.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to reject share request: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@share_bp.route('/requests/<int:request_id>/revoke', methods=['POST'])
@jwt_required()
def revoke_share(request_id):
    """
    Revoke a share (owner only)
    ---
    tags: [Sharing]
    """
    try:
        user_id = get_jwt_identity()
        
        share_request = ShareService.revoke_share(request_id, user_id)
        
        return jsonify({
            'success': True,
            'message': 'Share revoked successfully',
            'share_request': share_request.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to revoke share: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@share_bp.route('/shared-files', methods=['GET'])
@jwt_required()
def get_shared_files():
    """
    Get files shared with current user
    ---
    tags: [Sharing]
    """
    try:
        user_id = get_jwt_identity()
        
        result = ShareService.get_shared_files(user_id)
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Failed to get shared files: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@share_bp.route('/shared-files/<int:file_id>/download', methods=['GET'])
@jwt_required()
def download_shared_file(file_id):
    """
    Download a shared file
    ---
    tags: [Sharing]
    """
    try:
        user_id = get_jwt_identity()
        
        # This endpoint would need the owner's private key to re-encrypt
        # For now, just check permissions and return the file
        
        # Check if user has access
        access = SharedAccess.query.filter_by(
            file_id=file_id,
            recipient_id=user_id
        ).filter(
            SharedAccess.revoked_at.is_(None)
        ).first()
        
        if not access or not access.can_download:
            return jsonify({'success': False, 'error': 'No download permission'}), 403
        
        # Get the file
        file = File.query.get(file_id)
        if not file:
            return jsonify({'success': False, 'error': 'File not found'}), 404
        
        # Update access stats
        access.download_count += 1
        access.last_accessed = datetime.utcnow()
        
        # Log download
        log = ShareLog(
            share_request_id=access.share_request_id,
            user_id=user_id,
            action='download',
            details=f'Downloaded shared file "{file.filename}"'
        )
        db.session.add(log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'file': {
                'filename': file.filename,
                'original_size': file.original_size,
                'encrypted_file': file.encrypted_file.hex(),
                'encrypted_aes_key': file.encrypted_aes_key.hex(),
                'note': 'This AES key is encrypted with the owner\'s public key. '
                       'The owner must provide their private key to decrypt and re-encrypt for you.'
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to download shared file: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@share_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_share_stats():
    """
    Get sharing statistics for current user
    ---
    tags: [Sharing]
    """
    try:
        user_id = get_jwt_identity()
        
        # Files shared by user
        shares_sent = ShareRequest.query.filter_by(owner_id=user_id).count()
        shares_accepted = ShareRequest.query.filter_by(
            owner_id=user_id,
            status='accepted'
        ).count()
        
        # Files shared with user
        shares_received = ShareRequest.query.filter_by(recipient_id=user_id).count()
        files_accessible = SharedAccess.query.filter_by(
            recipient_id=user_id
        ).filter(
            SharedAccess.revoked_at.is_(None)
        ).count()
        
        return jsonify({
            'success': True,
            'stats': {
                'shares_sent': shares_sent,
                'shares_accepted': shares_accepted,
                'shares_received': shares_received,
                'files_accessible': files_accessible,
                'acceptance_rate': round((shares_accepted / shares_sent * 100) if shares_sent > 0 else 0, 2)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get share stats: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500