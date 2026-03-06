"""
File Service
Handles file upload, download, and management logic
"""
import os
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from src.extensions import db
from src.models.user import User
from src.models.file import File
from src.services.encryption_service import EncryptionService
from src.utils.exceptions import FileError, ValidationError

logger = logging.getLogger(__name__)

class FileService:
    """Service for file management operations"""
    
    # File constraints
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS = {
        'pdf', 'txt', 'jpg', 'jpeg', 'png', 
        'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'
    }
    
    @staticmethod
    def validate_file(file_obj) -> Tuple[bool, str]:
        """
        Validate uploaded file
        
        Args:
            file_obj: Flask FileStorage object
            
        Returns:
            Tuple[bool, str]: (is_valid, error_message)
        """
        try:
            # Check if file has a name
            if not file_obj or file_obj.filename == '':
                return False, "No file selected"
            
            # Check file extension
            file_ext = file_obj.filename.rsplit('.', 1)[-1].lower() if '.' in file_obj.filename else ''
            
            if not file_ext:
                return False, "File has no extension"
            
            if file_ext not in FileService.ALLOWED_EXTENSIONS:
                return False, (
                    f"File type '.{file_ext}' not allowed. "
                    f"Allowed types: {', '.join(sorted(FileService.ALLOWED_EXTENSIONS))}"
                )
            
            # Check file size
            file_obj.seek(0, 2)  # Seek to end
            file_size = file_obj.tell()
            file_obj.seek(0)  # Reset to beginning
            
            if file_size > FileService.MAX_FILE_SIZE:
                max_mb = FileService.MAX_FILE_SIZE // (1024 * 1024)
                return False, f"File too large. Maximum size is {max_mb}MB"
            
            if file_size == 0:
                return False, "File is empty"
            
            return True, ""
            
        except Exception as e:
            logger.error(f"File validation error: {str(e)}")
            return False, "Error validating file"
    
    @staticmethod
    def upload_file(user_id: int, file_obj) -> File:
        """
        Upload and encrypt a file
        
        Args:
            user_id: User ID
            file_obj: Flask FileStorage object
            
        Returns:
            File: Created File object
            
        Raises:
            ValidationError: If file validation fails
            FileError: If upload/encryption fails
        """
        try:
            # Validate file
            is_valid, error = FileService.validate_file(file_obj)
            if not is_valid:
                raise ValidationError(error)
            
            # Read file data
            file_data = file_obj.read()
            
            # Get user and their public key
            user = User.query.get(user_id)
            if not user:
                raise ValidationError("User not found")
            
            # Encrypt the file
            encrypted_file, encrypted_aes_key = EncryptionService.encrypt_file(
                file_data, 
                user.rsa_public_key
            )
            
            # Generate file hash for deduplication
            file_hash = EncryptionService.generate_file_hash(file_data)
            
            # Check for duplicate files
            existing_file = File.query.filter_by(
                owner_id=user_id,
                file_hash=file_hash
            ).first()
            
            if existing_file:
                logger.info(f"Duplicate file detected for user {user_id}: {file_obj.filename}")
                # Optional: Handle duplicates differently
                # For now, we'll still create a new file record
            
            # Create file record
            file_record = File(
                owner_id=user_id,
                filename=file_obj.filename,
                original_size=len(file_data),
                encrypted_file=encrypted_file,
                encrypted_aes_key=encrypted_aes_key,
                file_hash=file_hash
            )
            
            db.session.add(file_record)
            db.session.flush()  # Get file ID without committing
            
            logger.info(
                f"File uploaded: {file_obj.filename} "
                f"({len(file_data)} bytes -> {len(encrypted_file)} bytes) "
                f"by user {user_id}"
            )
            
            return file_record
            
        except (ValidationError, FileError):
            raise
        except Exception as e:
            logger.error(f"Upload failed for user {user_id}: {str(e)}")
            raise FileError("Failed to upload file")
    
    @staticmethod
    def get_user_files(
        user_id: int, 
        page: int = 1, 
        per_page: int = 20,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get paginated list of user's files
        
        Args:
            user_id: User ID
            page: Page number
            per_page: Items per page
            search: Optional search term
            
        Returns:
            Dict[str, Any]: Files and pagination info
        """
        try:
            # Build query
            query = File.query.filter_by(owner_id=user_id)
            
            # Apply search filter if provided
            if search:
                search_term = f"%{search}%"
                query = query.filter(File.filename.ilike(search_term))
            
            # Order by upload date (newest first)
            query = query.order_by(File.upload_date.desc())
            
            # Get paginated results
            paginated_files = query.paginate(
                page=page, 
                per_page=per_page, 
                error_out=False
            )
            
            # Prepare file list
            files_list = []
            for file in paginated_files.items:
                files_list.append({
                    'id': file.id,
                    'filename': file.filename,
                    'original_size': file.original_size,
                    'encrypted_size': len(file.encrypted_file),
                    'upload_date': file.upload_date.isoformat(),
                    'extension': file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
                })
            
            logger.debug(f"Retrieved {len(files_list)} files for user {user_id}")
            
            return {
                'files': files_list,
                'pagination': {
                    'page': paginated_files.page,
                    'per_page': paginated_files.per_page,
                    'total_pages': paginated_files.pages,
                    'total_items': paginated_files.total,
                    'has_next': paginated_files.has_next,
                    'has_prev': paginated_files.has_prev
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get files for user {user_id}: {str(e)}")
            raise FileError("Failed to retrieve files")
    
    @staticmethod
    def get_file_for_download(user_id: int, file_id: int) -> Dict[str, Any]:
        """
        Get file data for download
        
        Args:
            user_id: User ID
            file_id: File ID
            
        Returns:
            Dict[str, Any]: File data
            
        Raises:
            ValidationError: If file not found or unauthorized
        """
        try:
            # Find the file
            file_record = File.query.filter_by(id=file_id, owner_id=user_id).first()
            
            if not file_record:
                raise ValidationError("File not found or unauthorized")
            
            # Prepare response
            file_data = {
                'id': file_record.id,
                'filename': file_record.filename,
                'original_size': file_record.original_size,
                'upload_date': file_record.upload_date.isoformat(),
                'encrypted_file': file_record.encrypted_file.hex(),
                'encrypted_aes_key': file_record.encrypted_aes_key
            }
            
            logger.debug(f"Prepared file for download: {file_record.filename} for user {user_id}")
            
            return file_data
            
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Failed to prepare file {file_id} for download: {str(e)}")
            raise FileError("Failed to prepare file for download")
    
    @staticmethod
    def delete_file(user_id: int, file_id: int) -> str:
        """
        Delete a file
        
        Args:
            user_id: User ID
            file_id: File ID
            
        Returns:
            str: Deleted filename
            
        Raises:
            ValidationError: If file not found or unauthorized
        """
        try:
            # Find the file
            file_record = File.query.filter_by(id=file_id, owner_id=user_id).first()
            
            if not file_record:
                raise ValidationError("File not found or unauthorized")
            
            filename = file_record.filename
            
            # Delete the file
            db.session.delete(file_record)
            db.session.flush()
            
            logger.info(f"File deleted: {filename} by user {user_id}")
            
            return filename
            
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Failed to delete file {file_id} for user {user_id}: {str(e)}")
            raise FileError("Failed to delete file")
    
    @staticmethod
    def get_file_stats(user_id: int) -> Dict[str, Any]:
        """
        Get user's file statistics
        
        Args:
            user_id: User ID
            
        Returns:
            Dict[str, Any]: File statistics
        """
        try:
            # Get all user's files
            files = File.query.filter_by(owner_id=user_id).all()
            
            # Calculate statistics
            total_files = len(files)
            total_storage = sum(len(f.encrypted_file) for f in files)
            
            # File type distribution
            file_types = {}
            for file in files:
                ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else 'unknown'
                file_types[ext] = file_types.get(ext, 0) + 1
            
            # Recent uploads (last 7 days)
            seven_days_ago = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            recent_uploads = sum(
                1 for f in files 
                if f.upload_date >= seven_days_ago
            )
            
            logger.debug(f"Retrieved stats for user {user_id}")
            
            return {
                'total_files': total_files,
                'total_storage_bytes': total_storage,
                'total_storage_mb': round(total_storage / (1024 * 1024), 2),
                'file_types': file_types,
                'recent_uploads_7d': recent_uploads,
                'storage_limit_mb': FileService.MAX_FILE_SIZE // (1024 * 1024)
            }
            
        except Exception as e:
            logger.error(f"Failed to get stats for user {user_id}: {str(e)}")
            raise FileError("Failed to get file statistics")
    
    @staticmethod
    def validate_filename(filename: str) -> bool:
        """
        Validate filename
        
        Args:
            filename: Filename to validate
            
        Returns:
            bool: True if filename is valid
        """
        try:
            # Basic filename validation
            if not filename or len(filename) > 255:
                return False
            
            # Check for invalid characters
            invalid_chars = ['\\', '/', ':', '*', '?', '"', '<', '>', '|']
            for char in invalid_chars:
                if char in filename:
                    return False
            
            return True
            
        except Exception:
            return False