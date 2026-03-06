"""
OTP Routes for Email Verification
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.services.otp_service import OTPService
from src.models.user import User
from src.models.file import File
from src.models.share import ShareRequest
import logging

logger = logging.getLogger(__name__)

otp_bp = Blueprint('otp', __name__, url_prefix='/api/otp')

@otp_bp.route('/send', methods=['POST'])
@jwt_required()
def send_otp():
    """Send OTP to user's email"""
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
        
        # Validate purpose
        valid_purposes = ['login', 'file_download', 'file_share', 'delete_file', 'change_password', 'verify_email']
        if purpose not in valid_purposes:
            return jsonify({'success': False, 'error': 'Invalid purpose'}), 400
        
        # Get user
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        # For file-specific OTPs, verify file ownership
        if file_id:
            file = File.query.get(file_id)
            if not file:
                return jsonify({'success': False, 'error': 'File not found'}), 404
            
            if file.owner_id != user_id and purpose == 'delete_file':
                return jsonify({'success': False, 'error': 'You do not own this file'}), 403
        
        # For share-specific OTPs, verify share request
        if share_request_id and purpose == 'file_share':
            share_request = ShareRequest.query.get(share_request_id)
            if not share_request:
                return jsonify({'success': False, 'error': 'Share request not found'}), 404
            
            if share_request.owner_id != user_id:
                return jsonify({'success': False, 'error': 'You do not own this share request'}), 403
        
        # Send OTP
        result = OTPService.send_otp(
            user_id=user_id,
            email=user.email,
            purpose=purpose,
            username=user.username,
            file_id=file_id,
            share_request_id=share_request_id
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

@otp_bp.route('/verify', methods=['POST'])
@jwt_required()
def verify_otp():
    """Verify OTP code"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        otp_id = data.get('otp_id')
        otp_code = data.get('otp_code')
        
        if not otp_id or not otp_code:
            return jsonify({'success': False, 'error': 'OTP ID and code are required'}), 400
        
        # Verify OTP
        result = OTPService.verify_otp(otp_id, otp_code, user_id)
        
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

@otp_bp.route('/resend/<int:otp_id>', methods=['POST'])
@jwt_required()
def resend_otp(otp_id):
    """Resend OTP email"""
    try:
        user_id = int(get_jwt_identity())
        
        result = OTPService.resend_otp(otp_id)
        
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