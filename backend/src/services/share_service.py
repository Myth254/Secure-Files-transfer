"""
Share Service for File Sharing Between Users
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from sqlalchemy import func
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
            recipient = db.session.query(User).filter_by(username=recipient_username).first()
            if not recipient:
                raise ValidationError("Recipient not found")
            
            if recipient.id == owner_id:
                raise ValidationError("Cannot share file with yourself")
            
            # Check for existing active share
            existing = db.session.query(ShareRequest).filter_by(
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
            db.session.flush()  # Flush to assign ID before using it
            
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
            access_records = db.session.query(SharedAccess).filter_by(
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
            access_records = (
                db.session.query(SharedAccess)
                .join(ShareRequest, ShareRequest.id == SharedAccess.share_request_id)
                .join(File, File.id == SharedAccess.file_id)
                .filter(
                    SharedAccess.recipient_id == user_id,
                    SharedAccess.revoked_at.is_(None),
                    ShareRequest.status == 'accepted',
                )
                .order_by(SharedAccess.granted_at.desc())
                .all()
            )
            
            shared_files = []
            for access in access_records:
                file = access.file
                share_request = access.share_request
                owner = share_request.owner if share_request else db.session.get(User, file.owner_id) if file else None
                if not file:
                    continue

                shared_files.append({
                    'access_id': access.id,
                    'share_request_id': access.share_request_id,
                    'file_id': file.id,
                    'filename': file.filename,
                    'extension': file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else '',
                    'original_size': file.original_size,
                    'owner_id': file.owner_id,
                    'owner_username': owner.username if owner else None,
                    'permissions': {
                        'can_view': access.can_view,
                        'can_download': access.can_download,
                        'can_reshare': access.can_reshare
                    },
                    'access_granted': access.granted_at.isoformat(),
                    'upload_date': file.upload_date.isoformat() if file.upload_date else None,
                    'updated_at': file.updated_at.isoformat() if file.updated_at else None,
                    'storage_model': 'shared_reference',
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
                query = db.session.query(ShareRequest).filter_by(
                    recipient_id=user_id,
                    status='pending'
                )
            else:
                # Requests sent by user
                query = db.session.query(ShareRequest).filter_by(
                    owner_id=user_id
                )
            
            requests = query.order_by(ShareRequest.requested_at.desc()).all()
            
            request_list = []
            for req in requests:
                file = db.session.get(File, req.file_id)
                if file:
                    request_list.append({
                        'id': req.id,
                        'request_id': req.id,
                        'file_id': file.id,
                        'filename': file.filename,
                        'owner_id': req.owner_id,
                        'owner_username': req.owner.username if req.owner else None,
                        'recipient_id': req.recipient_id,
                        'recipient_username': req.recipient.username if req.recipient else None,
                        'status': req.status,
                        'requested_at': req.requested_at.isoformat(),
                        'responded_at': req.responded_at.isoformat() if req.responded_at else None,
                        'expires_at': req.expires_at.isoformat() if req.expires_at else None,
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

    @staticmethod
    def get_share_stats(user_id: int) -> Dict[str, Any]:
        """
        Return a consistent breakdown of inbound/outbound sharing state.
        """
        try:
            outbound_rows = (
                db.session.query(ShareRequest.status, func.count(ShareRequest.id))
                .filter(ShareRequest.owner_id == user_id)
                .group_by(ShareRequest.status)
                .all()
            )
            inbound_rows = (
                db.session.query(ShareRequest.status, func.count(ShareRequest.id))
                .filter(ShareRequest.recipient_id == user_id)
                .group_by(ShareRequest.status)
                .all()
            )

            outbound = {status: count for status, count in outbound_rows}
            inbound = {status: count for status, count in inbound_rows}
            accessible_files = (
                db.session.query(SharedAccess)
                .filter(
                    SharedAccess.recipient_id == user_id,
                    SharedAccess.revoked_at.is_(None),
                )
                .count()
            )

            sent_total = sum(outbound.values())
            inbound_total = sum(inbound.values())
            closed_total = (
                outbound.get('rejected', 0) + outbound.get('revoked', 0) +
                inbound.get('rejected', 0) + inbound.get('revoked', 0)
            )

            return {
                'success': True,
                'stats': {
                    'outbound': {
                        'total': sent_total,
                        'pending': outbound.get('pending', 0),
                        'accepted': outbound.get('accepted', 0),
                        'rejected': outbound.get('rejected', 0),
                        'revoked': outbound.get('revoked', 0),
                    },
                    'inbound': {
                        'total': inbound_total,
                        'pending': inbound.get('pending', 0),
                        'accepted': inbound.get('accepted', 0),
                        'rejected': inbound.get('rejected', 0),
                        'revoked': inbound.get('revoked', 0),
                    },
                    'summary': {
                        'shares_sent': sent_total,
                        'pending_requests': inbound.get('pending', 0),
                        'accepted_shares': inbound.get('accepted', 0),
                        'accessible_files': accessible_files,
                        'closed_shares': closed_total,
                    },
                },
            }
        except Exception as e:
            logger.error(f"Failed to get share stats for user {user_id}: {e}")
            raise ShareError("Failed to get share stats")
