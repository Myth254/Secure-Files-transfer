"""
OTP Service for Email Verification - FINAL FIXED VERSION
"""
import secrets
import string
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Dict, Any
import logging

from src.extensions import db
from src.models.otp import OTPCode, OTPLog
from src.services.email_service import EmailService
from typing import Optional

logger = logging.getLogger(__name__)

class OTPService:
    """Service for OTP generation and verification"""
    
    OTP_LENGTH = 6
    OTP_EXPIRY_MINUTES = 10
    MAX_ATTEMPTS = 3
    
    @staticmethod
    def generate_otp() -> str:
        """Generate a cryptographically secure 6-digit numeric OTP"""
        return ''.join(secrets.choice(string.digits) for _ in range(OTPService.OTP_LENGTH))
    
    @staticmethod
    def _hash_otp(code: str) -> str:
        """Hash an OTP code with SHA-256 for secure storage"""
        return hashlib.sha256(code.encode()).hexdigest()
    
    @staticmethod
    def send_otp(
        user_id: int,
        email: str,
        purpose: str,
        username: Optional[str] = None,
        file_id: Optional[int] = None,
        share_request_id: Optional[int] = None,
        request: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Generate and send OTP via email.
        The plaintext OTP is never logged or stored — only its SHA-256 hash.
        """
        try:
            logger.info(f"📨 Generating OTP for user {user_id}, purpose: {purpose}")
            
            # Check for existing active OTP
            recent_otp = OTPCode.query.filter_by(
                user_id=user_id,
                purpose=purpose,
                is_used=False
            ).filter(
                OTPCode.created_at > datetime.now(timezone.utc) - timedelta(minutes=OTPService.OTP_EXPIRY_MINUTES)
            ).first()
            
            if recent_otp:
                logger.info(f"⚠️ Active OTP already exists: {recent_otp.id}")
                return {
                    'success': False,
                    'error': 'An active OTP already exists. Please check your email or wait for it to expire.',
                    'otp_id': recent_otp.id
                }
            
            # Generate new OTP (plaintext used only for emailing, never stored)
            otp_code = OTPService.generate_otp()
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTPService.OTP_EXPIRY_MINUTES)
            
            # Create OTP record — store only the hash, never the plaintext
            otp = OTPCode(
                user_id=user_id,
                email=email,
                otp_code_hash=OTPService._hash_otp(otp_code),
                purpose=purpose,
                file_id=file_id,
                share_request_id=share_request_id,
                expires_at=expires_at
            )
            
            db.session.add(otp)
            db.session.flush()
            logger.info(f"✅ OTP record created with ID: {otp.id}")
            
            # Send email (plaintext OTP is passed to the mailer but never logged here)
            email_sent = EmailService.send_otp_email(
                email=email,
                otp_code=otp_code,
                purpose=purpose,
                username=username
            )
            
            if not email_sent:
                db.session.rollback()
                logger.error("❌ Failed to send OTP email")
                return {
                    'success': False,
                    'error': 'Failed to send OTP email. Please try again.'
                }
            
            # Log OTP generation — do NOT include the plaintext OTP code
            otp_log = OTPLog(
                user_id=user_id,
                email=email,
                otp_id=otp.id,
                action='generate',
                purpose=purpose,
                status='success'
            )
            db.session.add(otp_log)
            db.session.commit()
            
            # Log success without exposing the OTP value
            logger.info(f"✅ OTP sent to {email} for {purpose}")
            
            return {
                'success': True,
                'message': 'OTP sent successfully',
                'otp_id': otp.id,
                'expires_in': OTPService.OTP_EXPIRY_MINUTES * 60
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"❌ Failed to send OTP: {str(e)}")
            return {
                'success': False,
                'error': 'Failed to send OTP. Please try again.'
            }
    
    @staticmethod
    def verify_otp(
        otp_id: int,
        otp_code: str,
        user_id: Optional[int] = None,
        request: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Verify OTP code by comparing hashes.
        Returns a download_token when purpose is file_download or delete_file.
        """
        try:
            logger.info(f"🔐 Verifying OTP {otp_id} for user {user_id}")
            
            otp = db.session.get(OTPCode, otp_id)
            
            if not otp:
                logger.warning(f"❌ OTP {otp_id} not found")
                return {'success': False, 'error': 'Invalid OTP request'}
            
            if user_id and otp.user_id != user_id:
                logger.warning(f"❌ OTP {otp_id} belongs to user {otp.user_id}, not {user_id}")
                return {'success': False, 'error': 'OTP does not belong to this user'}
            
            if otp.is_used:
                logger.warning(f"❌ OTP {otp_id} already used")
                return {'success': False, 'error': 'OTP has already been used'}
            
            if otp.expires_at < datetime.now(timezone.utc):
                logger.warning(f"❌ OTP {otp_id} expired at {otp.expires_at}")
                return {'success': False, 'error': 'OTP has expired'}
            
            # Check attempts
            otp.attempts += 1
            
            if otp.attempts > OTPService.MAX_ATTEMPTS:
                db.session.commit()
                logger.warning(f"❌ OTP {otp_id} max attempts exceeded")
                return {'success': False, 'error': 'Maximum verification attempts exceeded'}
            
            # Verify by comparing hashes — plaintext never stored or logged
            if otp.otp_code_hash != OTPService._hash_otp(otp_code):
                db.session.commit()
                remaining = OTPService.MAX_ATTEMPTS - otp.attempts
                logger.warning(f"❌ Invalid OTP code for {otp_id}. {remaining} attempts left")
                return {
                    'success': False,
                    'error': f'Invalid OTP code. {remaining} attempts remaining.'
                }
            
            # Success — mark as used
            otp.is_used = True
            db.session.commit()
            
            logger.info(f"✅ OTP {otp_id} verified successfully for user {otp.user_id}")
            
            result: Dict[str, Any] = {
                'success': True,
                'message': 'OTP verified successfully',
                'purpose': otp.purpose,
                'file_id': otp.file_id,
                'share_request_id': otp.share_request_id
            }
            
            # Issue a download token for file-action purposes (F-02)
            if otp.purpose in ('file_download', 'delete_file'):
                from src.utils.security import SecurityUtils
                download_token = SecurityUtils.generate_otp_download_token(otp.user_id, otp.file_id)
                result['download_token'] = download_token
            
            return result
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"❌ OTP verification failed: {str(e)}")
            return {'success': False, 'error': 'OTP verification failed'}
    
    @staticmethod
    def resend_otp(
        otp_id: int,
        user_id: Optional[int] = None,
        request: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Resend OTP by invalidating the old one and generating a fresh code.
        The old hash is no longer stored, so we cannot resend the original value.
        """
        try:
            logger.info(f"📨 Resending OTP {otp_id}")
            
            otp = db.session.get(OTPCode, otp_id)
            
            if not otp:
                logger.warning(f"❌ OTP {otp_id} not found")
                return {'success': False, 'error': 'OTP request not found'}
            
            if user_id and otp.user_id != user_id:
                logger.warning(f"❌ OTP {otp_id} belongs to user {otp.user_id}, not {user_id}")
                return {'success': False, 'error': 'OTP does not belong to this user'}
            
            if otp.is_used:
                logger.warning(f"❌ OTP {otp_id} already used")
                return {'success': False, 'error': 'OTP has already been used'}
            
            if otp.expires_at < datetime.now(timezone.utc):
                logger.warning(f"❌ OTP {otp_id} expired")
                return {'success': False, 'error': 'OTP has expired'}
            
            # Invalidate the old OTP and generate a fresh one
            otp.is_used = True
            db.session.commit()
            
            return OTPService.send_otp(
                user_id=otp.user_id,
                email=otp.email,
                purpose=otp.purpose,
                file_id=otp.file_id,
                share_request_id=otp.share_request_id,
                request=request
            )
            
        except Exception as e:
            logger.error(f"❌ Failed to resend OTP: {str(e)}")
            return {'success': False, 'error': 'Failed to resend OTP'}
    
    @staticmethod
    def verify_otp_for_login(otp_id: int, otp_code: str, request: Optional[Any] = None) -> Dict[str, Any]:
        """
        Verify login OTP.  Returns user_id resolved from the DB record —
        never trusts a user_id supplied by the caller.
        """
        result = OTPService.verify_otp(otp_id, otp_code, user_id=None, request=request)
        if result['success']:
            otp = db.session.get(OTPCode, otp_id)
            result['user_id'] = otp.user_id if otp else None
        return result
    
    @staticmethod
    def resend_otp_by_id(otp_id: int, request: Optional[Any] = None) -> Dict[str, Any]:
        """Resend OTP by otp_id alone — no user_id required from the caller."""
        return OTPService.resend_otp(otp_id, user_id=None, request=request)