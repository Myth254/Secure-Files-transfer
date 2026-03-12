"""
Share Service for File Sharing Between Users
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from src.extensions import db
from src.models.user import User
from src.models.file import File
from src.models.share import ShareRequest, SharedAccess, ShareLog
from src.utils.exceptions import ShareError, ValidationError

logger = logging.getLogger(__name__)

class ShareService:
    """Service for handling file sharing operations"""
    
    @staticmethod
    def request_file_share(
        owner_id: int,
        file_id: int,
        recipient_username: str,
        recipient_encrypted_aes_key: bytes,
        can_view: bool = True,
        can_download: bool = True,
        can_reshare: bool = False,
        expires_days: Optional[int] = None
    ) -> ShareRequest:
        """
        Request to share a file with another user.

        The caller must supply recipient_encrypted_aes_key — the file's AES key
        already re-encrypted with the recipient's public key.  The owner's
        encrypted AES key is never stored in the recipient's ShareRequest.

        Args:
            owner_id: ID of file owner
            file_id: ID of file to share
            recipient_username: Username of recipient
            recipient_encrypted_aes_key: AES key encrypted with recipient's public key (bytes)
            can_view: Allow viewing
            can_download: Allow downloading
            can_reshare: Allow resharing
            expires_days: Days until share expires

        Returns:
            ShareRequest: Created share request

        Raises:
            ValidationError: If validation fails
            ShareError: If sharing operation fails
        """
        try:
            # Validate inputs
            if owner_id <= 0 or file_id <= 0:
                raise ValidationError("Invalid owner or file ID")
            
            if not recipient_username:
                raise ValidationError("Recipient username is required")
            
            # Get file and verify ownership
            file = db.session.get(File, file_id)
            if not file:
                raise ValidationError("File not found")
            
            if file.owner_id != owner_id:
                raise ValidationError("You don't own this file")
            
            # Get recipient
            recipient = User.query.filter_by(username=recipient_username).first()
            if not recipient:
                raise ValidationError("Recipient not found")
            
            if recipient.id == owner_id:
                raise ValidationError("Cannot share file with yourself")
            
            # Check for existing active share
            existing = ShareRequest.query.filter_by(
                file_id=file_id,
                recipient_id=recipient.id,
                status='accepted'
            ).first()
            
            if existing:
                raise ValidationError("File is already shared with this user")
            
            # Verify owner exists
            owner = db.session.get(User, owner_id)
            if not owner:
                raise ValidationError("Owner not found")
            
            # Create share request, storing AES key encrypted with recipient's public key
            share_request = ShareRequest(
                file_id=file_id,
                owner_id=owner_id,
                recipient_id=recipient.id,
                can_view=can_view,
                can_download=can_download,
                can_reshare=can_reshare,
                encrypted_aes_key=recipient_encrypted_aes_key
            )
            
            if expires_days:
                share_request.expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)
            
            db.session.add(share_request)
            
            # Log the request
            log = ShareLog(
                share_request_id=share_request.id,
                user_id=owner_id,
                action='request',
                details=f'Requested to share file "{file.filename}" with {recipient_username}'
            )
            db.session.add(log)
            
            db.session.commit()
            
            logger.info(f"Share request created: file {file_id} from {owner_id} to {recipient.id}")
            
            return share_request
            
        except (ValidationError, ShareError):
            raise
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to create share request: {e}")
            raise ShareError("Failed to create share request")
    
    @staticmethod
    def accept_share_request(request_id: int, recipient_id: int) -> SharedAccess:
        """
        Accept a share request

        Args:
            request_id: ID of share request
            recipient_id: ID of recipient (must match)

        Returns:
            SharedAccess: Created access record

        Raises:
            ValidationError: If validation fails
            ShareError: If operation fails
        """
        try:
            # Get share request
            share_request = db.session.get(ShareRequest, request_id)
            if not share_request:
                raise ValidationError("Share request not found")
            
            # Verify recipient
            if share_request.recipient_id != recipient_id:
                raise ValidationError("Not authorized to accept this request")
            
            if share_request.status != 'pending':
                raise ValidationError(f"Share request is already {share_request.status}")
            
            # Update share request
            share_request.status = 'accepted'
            share_request.responded_at = datetime.now(timezone.utc)
            
            # Create shared access record
            shared_access = SharedAccess(
                share_request_id=request_id,
                file_id=share_request.file_id,
                recipient_id=recipient_id,
                can_view=share_request.can_view,
                can_download=share_request.can_download,
                can_reshare=share_request.can_reshare
            )
            
            db.session.add(shared_access)
            
            # Log acceptance
            log = ShareLog(
                share_request_id=request_id,
                user_id=recipient_id,
                action='accept',
                details=f'Accepted share request for file ID {share_request.file_id}'
            )
            db.session.add(log)
            
            db.session.commit()
            
            logger.info(f"Share request accepted: {request_id} by {recipient_id}")
            
            return shared_access
            
        except (ValidationError, ShareError):
            raise
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to accept share request: {e}")
            raise ShareError("Failed to accept share request")
    
    @staticmethod
    def reject_share_request(request_id: int, recipient_id: int) -> ShareRequest:
        """
        Reject a share request

        Args:
            request_id: ID of share request
            recipient_id: ID of recipient (must match)

        Returns:
            ShareRequest: Updated share request
        """
        try:
            share_request = db.session.get(ShareRequest, request_id)
            if not share_request:
                raise ValidationError("Share request not found")
            
            if share_request.recipient_id != recipient_id:
                raise ValidationError("Not authorized to reject this request")
            
            share_request.status = 'rejected'
            share_request.responded_at = datetime.now(timezone.utc)
            
            # Log rejection
            log = ShareLog(
                share_request_id=request_id,
                user_id=recipient_id,
                action='reject',
                details=f'Rejected share request for file ID {share_request.file_id}'
            )
            db.session.add(log)
            
            db.session.commit()
            
            logger.info(f"Share request rejected: {request_id} by {recipient_id}")
            
            return share_request
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to reject share request: {e}")
            raise ShareError("Failed to reject share request")
    
    @staticmethod
    def revoke_share(request_id: int, owner_id: int) -> ShareRequest:
        """
        Revoke a share (owner only)

        Args:
            request_id: ID of share request
            owner_id: ID of owner (must match)

        Returns:
            ShareRequest: Updated share request
        """
        try:
            share_request = db.session.get(ShareRequest, request_id)
            if not share_request:
                raise ValidationError("Share request not found")
            
            if share_request.owner_id != owner_id:
                raise ValidationError("Only the owner can revoke sharing")
            
            share_request.status = 'revoked'
            
            # Also revoke any access records
            access_records = SharedAccess.query.filter_by(
                share_request_id=request_id
            ).all()
            
            for access in access_records:
                access.revoked_at = datetime.now(timezone.utc)
            
            # Log revocation
            log = ShareLog(
                share_request_id=request_id,
                user_id=owner_id,
                action='revoke',
                details=f'Revoked share for file ID {share_request.file_id}'
            )
            db.session.add(log)
            
            db.session.commit()
            
            logger.info(f"Share revoked: {request_id} by owner {owner_id}")
            
            return share_request
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to revoke share: {e}")
            raise ShareError("Failed to revoke share")
    
    @staticmethod
    def get_shared_files(user_id: int) -> Dict[str, Any]:
        """
        Get files shared with user

        Args:
            user_id: User ID

        Returns:
            Dict[str, Any]: Shared files and permissions
        """
        try:
            # Get active shared access records
            access_records = SharedAccess.query.filter_by(
                recipient_id=user_id
            ).filter(
                SharedAccess.revoked_at.is_(None)
            ).all()
            
            shared_files = []
            for access in access_records:
                file = db.session.get(File, access.file_id)
                if file:
                    shared_files.append({
                        'file_id': file.id,
                        'filename': file.filename,
                        'original_size': file.original_size,
                        'owner_id': file.owner_id,
                        'permissions': {
                            'can_view': access.can_view,
                            'can_download': access.can_download,
                            'can_reshare': access.can_reshare
                        },
                        'access_granted': access.granted_at.isoformat(),
                        'view_count': access.view_count,
                        'download_count': access.download_count
                    })
            
            return {
                'success': True,
                'shared_files': shared_files,
                'count': len(shared_files)
            }
            
        except Exception as e:
            logger.error(f"Failed to get shared files for user {user_id}: {e}")
            raise ShareError("Failed to get shared files")
    
    @staticmethod
    def get_share_requests(user_id: int, role: str = 'recipient') -> Dict[str, Any]:
        """
        Get share requests for user

        Args:
            user_id: User ID
            role: 'recipient' or 'owner'

        Returns:
            Dict[str, Any]: Share requests
        """
        try:
            if role == 'recipient':
                # Requests sent to user
                query = ShareRequest.query.filter_by(
                    recipient_id=user_id,
                    status='pending'
                )
            else:
                # Requests sent by user
                query = ShareRequest.query.filter_by(
                    owner_id=user_id
                )
            
            requests = query.order_by(ShareRequest.requested_at.desc()).all()
            
            request_list = []
            for req in requests:
                file = db.session.get(File, req.file_id)
                if file:
                    request_list.append({
                        'request_id': req.id,
                        'file_id': file.id,
                        'filename': file.filename,
                        'owner_id': req.owner_id,
                        'recipient_id': req.recipient_id,
                        'status': req.status,
                        'requested_at': req.requested_at.isoformat(),
                        'permissions': {
                            'can_view': req.can_view,
                            'can_download': req.can_download,
                            'can_reshare': req.can_reshare
                        }
                    })
            
            return {
                'success': True,
                'requests': request_list,
                'count': len(request_list),
                'role': role
            }
            
        except Exception as e:
            logger.error(f"Failed to get share requests for user {user_id}: {e}")
            raise ShareError("Failed to get share requests")