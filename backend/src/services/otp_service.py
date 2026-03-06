"""
OTP Service for Email Verification - FINAL FIXED VERSION
"""
import random
import string
from datetime import datetime, timedelta
from typing import Dict, Any
import logging


# Import db directly from extensions - this is the KEY FIX
from src.extensions import db
from src.models.otp import OTPCode, OTPLog
from src.services.email_service import EmailService

logger = logging.getLogger(__name__)

class OTPService:
    """Service for OTP generation and verification"""
    
    OTP_LENGTH = 6
    OTP_EXPIRY_MINUTES = 10
    MAX_ATTEMPTS = 3
    
    @staticmethod
    def generate_otp() -> str:
        """Generate a 6-digit numeric OTP"""
        return ''.join(random.choices(string.digits, k=OTPService.OTP_LENGTH))
    
    @staticmethod
    def send_otp(
        user_id: int,
        email: str,
        purpose: str,
        username: str = None,
        file_id: int = None,
        share_request_id: int = None,
        request=None
    ) -> Dict[str, Any]:
        """
        Generate and send OTP via email
        """
        try:
            logger.info(f"📨 Generating OTP for user {user_id}, purpose: {purpose}")
            
            # Check for existing active OTP
            recent_otp = OTPCode.query.filter_by(
                user_id=user_id,
                purpose=purpose,
                is_used=False
            ).filter(
                OTPCode.created_at > datetime.utcnow() - timedelta(minutes=OTPService.OTP_EXPIRY_MINUTES)
            ).first()
            
            if recent_otp:
                logger.info(f"⚠️ Active OTP already exists: {recent_otp.id}")
                return {
                    'success': False,
                    'error': 'An active OTP already exists. Please check your email or wait for it to expire.',
                    'otp_id': recent_otp.id
                }
            
            # Generate new OTP
            otp_code = OTPService.generate_otp()
            expires_at = datetime.utcnow() + timedelta(minutes=OTPService.OTP_EXPIRY_MINUTES)
            
            # Create OTP record
            otp = OTPCode(
                user_id=user_id,
                email=email,
                otp_code=otp_code,
                purpose=purpose,
                file_id=file_id,
                share_request_id=share_request_id,
                expires_at=expires_at
            )
            
            db.session.add(otp)
            db.session.flush()
            logger.info(f"✅ OTP record created with ID: {otp.id}")
            
            # Send email (console version will print OTP)
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
            
            # Log OTP generation
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
            
            logger.info(f"✅ OTP {otp_code} sent to {email} for {purpose}")
            
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
                'error': f'Failed to send OTP: {str(e)}'
            }
    
    @staticmethod
    def verify_otp(
        otp_id: int, 
        otp_code: str, 
        user_id: int = None,
        request=None
    ) -> Dict[str, Any]:
        """
        Verify OTP code
        """
        try:
            logger.info(f"🔐 Verifying OTP {otp_id} for user {user_id}")
            
            otp = OTPCode.query.get(otp_id)
            
            if not otp:
                logger.warning(f"❌ OTP {otp_id} not found")
                return {'success': False, 'error': 'Invalid OTP request'}
            
            if user_id and otp.user_id != user_id:
                logger.warning(f"❌ OTP {otp_id} belongs to user {otp.user_id}, not {user_id}")
                return {'success': False, 'error': 'OTP does not belong to this user'}
            
            if otp.is_used:
                logger.warning(f"❌ OTP {otp_id} already used")
                return {'success': False, 'error': 'OTP has already been used'}
            
            if otp.expires_at < datetime.utcnow():
                logger.warning(f"❌ OTP {otp_id} expired at {otp.expires_at}")
                return {'success': False, 'error': 'OTP has expired'}
            
            # Check attempts
            otp.attempts += 1
            
            if otp.attempts > OTPService.MAX_ATTEMPTS:
                db.session.commit()
                logger.warning(f"❌ OTP {otp_id} max attempts exceeded")
                return {'success': False, 'error': 'Maximum verification attempts exceeded'}
            
            # Verify code
            if otp.otp_code != otp_code:
                db.session.commit()
                remaining = OTPService.MAX_ATTEMPTS - otp.attempts
                logger.warning(f"❌ Invalid OTP code for {otp_id}. {remaining} attempts left")
                return {
                    'success': False, 
                    'error': f'Invalid OTP code. {remaining} attempts remaining.'
                }
            
            # Success
            otp.is_used = True
            db.session.commit()
            
            logger.info(f"✅ OTP {otp_id} verified successfully for user {otp.user_id}")
            
            return {
                'success': True,
                'message': 'OTP verified successfully',
                'purpose': otp.purpose,
                'file_id': otp.file_id,
                'share_request_id': otp.share_request_id
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"❌ OTP verification failed: {str(e)}")
            return {'success': False, 'error': 'OTP verification failed'}
    
    @staticmethod
    def resend_otp(
        otp_id: int, 
        user_id: int = None,
        request=None
    ) -> Dict[str, Any]:
        """
        Resend OTP email
        """
        try:
            logger.info(f"📨 Resending OTP {otp_id}")
            
            otp = OTPCode.query.get(otp_id)
            
            if not otp:
                logger.warning(f"❌ OTP {otp_id} not found")
                return {'success': False, 'error': 'OTP request not found'}
            
            if user_id and otp.user_id != user_id:
                logger.warning(f"❌ OTP {otp_id} belongs to user {otp.user_id}, not {user_id}")
                return {'success': False, 'error': 'OTP does not belong to this user'}
            
            if otp.is_used:
                logger.warning(f"❌ OTP {otp_id} already used")
                return {'success': False, 'error': 'OTP has already been used'}
            
            if otp.expires_at < datetime.utcnow():
                logger.warning(f"❌ OTP {otp_id} expired")
                return {'success': False, 'error': 'OTP has expired'}
            
            # Resend email
            email_sent = EmailService.send_otp_email(
                email=otp.email,
                otp_code=otp.otp_code,
                purpose=otp.purpose,
                username=None
            )
            
            if not email_sent:
                logger.error(f"❌ Failed to resend OTP {otp_id}")
                return {'success': False, 'error': 'Failed to resend OTP email'}
            
            logger.info(f"✅ OTP {otp_id} resent successfully")
            
            return {
                'success': True,
                'message': 'OTP resent successfully',
                'expires_at': otp.expires_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to resend OTP: {str(e)}")
            return {'success': False, 'error': 'Failed to resend OTP'}