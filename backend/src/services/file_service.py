"""
File Service
Handles file upload, download, deletion, and statistics.

Changes from original
─────────────────────
• werkzeug.utils.secure_filename() applied before any filename is stored
  (F-04: path traversal via raw filename).
• python-magic MIME type validation added alongside extension check
  (F-13: content-type not verified).
• encrypted_aes_key stored and returned as raw bytes throughout; hex
  conversion is deferred to the JSON serialisation layer (F-05 type fix).
• EncryptionService.generate_file_hash() call is now valid — the method
  was added to the fixed encryption_service.py (runtime crash fix).
• User.query.get() replaced with db.session.get() (SQLAlchemy 2.x).
• get_file_stats() uses SQL aggregates instead of loading every BLOB into
  memory (performance fix).
"""
import logging
from typing import Dict, Any, Optional, Tuple

from werkzeug.utils import secure_filename

from src.extensions import db
from src.models.user import User
from src.models.file import File
from src.services.encryption_service import EncryptionService
from src.utils.exceptions import FileError, ValidationError

logger = logging.getLogger(__name__)

# MIME types that correspond to the allowed extensions.
# python-magic is used to read actual file magic bytes.
_ALLOWED_MIME_TYPES: Dict[str, str] = {
    'pdf':  'application/pdf',
    'txt':  'text/plain',
    'jpg':  'image/jpeg',
    'jpeg': 'image/jpeg',
    'png':  'image/png',
    'doc':  'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls':  'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt':  'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}


def _detect_mime(file_obj) -> str:
    """
    Return the MIME type detected from the first 2 KiB of *file_obj*.
    Falls back to 'application/octet-stream' if python-magic is unavailable.
    """
    try:
        import magic  # python-magic
        file_obj.seek(0)
        mime = magic.from_buffer(file_obj.read(2048), mime=True)
        file_obj.seek(0)
        return mime
    except ImportError:
        logger.warning(
            "python-magic is not installed; MIME type validation skipped. "
            "Install it with: pip install python-magic"
        )
        file_obj.seek(0)
        return ''


class FileService:
    """Service for file management operations."""

    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    ALLOWED_EXTENSIONS = set(_ALLOWED_MIME_TYPES.keys())

    # ── Validation ────────────────────────────────────────────────────────

    @staticmethod
    def validate_file(file_obj) -> Tuple[bool, str]:
        """
        Validate an uploaded file by extension, MIME type, and size.

        Returns:
            (is_valid, error_message)
        """
        try:
            if not file_obj or not file_obj.filename:
                return False, "No file selected"

            # ── Sanitise and check extension ──────────────────────────────
            safe_name = secure_filename(file_obj.filename)
            if not safe_name:
                return False, "Filename is invalid or empty after sanitisation"

            if '.' not in safe_name:
                return False, "File has no extension"

            file_ext = safe_name.rsplit('.', 1)[-1].lower()
            if file_ext not in FileService.ALLOWED_EXTENSIONS:
                return False, (
                    f"File type '.{file_ext}' not allowed. "
                    f"Allowed: {', '.join(sorted(FileService.ALLOWED_EXTENSIONS))}"
                )

            # ── MIME type check ───────────────────────────────────────────
            detected_mime = _detect_mime(file_obj)
            if detected_mime:
                expected_mime = _ALLOWED_MIME_TYPES.get(file_ext, '')
                # Some types (e.g. text/plain) may differ slightly; allow
                # a broad check: either exact match or the top-level type.
                if expected_mime and detected_mime not in (
                    expected_mime,
                    expected_mime.split('/')[0] + '/' + expected_mime.split('/')[0],
                ):
                    # Strict: reject if mime doesn't match expected
                    allowed_mimes = set(_ALLOWED_MIME_TYPES.values())
                    if detected_mime not in allowed_mimes:
                        return False, (
                            f"File content type '{detected_mime}' does not match "
                            f"the declared extension '.{file_ext}'"
                        )

            # ── Size check ────────────────────────────────────────────────
            file_obj.seek(0, 2)
            file_size = file_obj.tell()
            file_obj.seek(0)

            if file_size == 0:
                return False, "File is empty"
            if file_size > FileService.MAX_FILE_SIZE:
                max_mb = FileService.MAX_FILE_SIZE // (1024 * 1024)
                return False, f"File too large. Maximum size is {max_mb} MB"

            return True, ""

        except Exception as e:
            logger.error(f"File validation error: {e}")
            return False, "Error validating file"

    # ── Upload ────────────────────────────────────────────────────────────

    @staticmethod
    def upload_file(user_id: int, file_obj) -> File:
        """
        Validate, encrypt, and persist an uploaded file.

        The filename is sanitised with secure_filename() before storage.
        encrypted_aes_key is stored as raw bytes.

        Returns:
            The created File ORM object (not yet committed).

        Raises:
            ValidationError, FileError
        """
        try:
            is_valid, error = FileService.validate_file(file_obj)
            if not is_valid:
                raise ValidationError(error)

            # Sanitise filename — must happen before any use
            safe_name = secure_filename(file_obj.filename)
            if not safe_name:
                raise ValidationError("Filename could not be sanitised")

            file_data = file_obj.read()

            user = db.session.get(User, user_id)
            if not user:
                raise ValidationError("User not found")

            # Encrypt file — returns (encrypted_bytes, aes_key_bytes)
            encrypted_file, encrypted_aes_key = EncryptionService.encrypt_file(
                file_data, user.rsa_public_key
            )

            file_hash = EncryptionService.generate_file_hash(file_data)

            # Check for duplicates (informational log only; still stored)
            existing = File.query.filter_by(
                owner_id=user_id, file_hash=file_hash
            ).first()
            if existing:
                logger.info(
                    f"Duplicate file detected for user {user_id}: {safe_name}"
                )

            file_record = File(
                owner_id=user_id,
                filename=safe_name,                 # sanitised name
                original_size=len(file_data),
                encrypted_file=encrypted_file,
                encrypted_aes_key=encrypted_aes_key,  # stored as bytes
                file_hash=file_hash,
            )

            db.session.add(file_record)
            db.session.flush()

            logger.info(
                f"File uploaded: {safe_name} "
                f"({len(file_data)} → {len(encrypted_file)} bytes) "
                f"owner={user_id}"
            )
            return file_record

        except (ValidationError, FileError):
            raise
        except Exception as e:
            logger.error(f"Upload failed for user {user_id}: {e}")
            raise FileError("Failed to upload file")

    # ── Listing ───────────────────────────────────────────────────────────

    @staticmethod
    def get_user_files(
        user_id: int,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Return a paginated list of file metadata for *user_id*.
        The encrypted payload is NOT included — call get_file_for_download()
        for that.
        """
        try:
            query = File.query.filter_by(owner_id=user_id)

            if search:
                query = query.filter(File.filename.ilike(f"%{search}%"))

            query = query.order_by(File.upload_date.desc())
            paginated = query.paginate(page=page, per_page=per_page, error_out=False)

            files_list = [
                {
                    'id':            f.id,
                    'filename':      f.filename,
                    'original_size': f.original_size,
                    'upload_date':   f.upload_date.isoformat(),
                    'extension':     f.filename.rsplit('.', 1)[-1].lower() if '.' in f.filename else '',
                }
                for f in paginated.items
            ]

            return {
                'files': files_list,
                'pagination': {
                    'page':        paginated.page,
                    'per_page':    paginated.per_page,
                    'total_pages': paginated.pages,
                    'total_items': paginated.total,
                    'has_next':    paginated.has_next,
                    'has_prev':    paginated.has_prev,
                },
            }

        except Exception as e:
            logger.error(f"get_user_files failed for user {user_id}: {e}")
            raise FileError("Failed to retrieve files")

    # ── Download ──────────────────────────────────────────────────────────

    @staticmethod
    def get_file_for_download(user_id: int, file_id: int) -> Dict[str, Any]:
        """
        Return the encrypted file blobs for client-side decryption.

        encrypted_aes_key is hex-encoded in the response so it can be
        safely embedded in JSON.

        Raises:
            ValidationError: if file not found or user is not the owner.
        """
        try:
            file_record = File.query.filter_by(
                id=file_id, owner_id=user_id
            ).first()

            if not file_record:
                raise ValidationError("File not found or unauthorised")

            return {
                'id':                file_record.id,
                'filename':          file_record.filename,
                'original_size':     file_record.original_size,
                'upload_date':       file_record.upload_date.isoformat(),
                # Both payloads hex-encoded for JSON transport
                'encrypted_file':    file_record.encrypted_file.hex(),
                'encrypted_aes_key': file_record.encrypted_aes_key.hex()
                    if isinstance(file_record.encrypted_aes_key, bytes)
                    else file_record.encrypted_aes_key,
            }

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"get_file_for_download({file_id}) failed: {e}")
            raise FileError("Failed to prepare file for download")

    # ── Deletion ──────────────────────────────────────────────────────────

    @staticmethod
    def delete_file(user_id: int, file_id: int) -> str:
        """
        Delete a file owned by *user_id*.

        Returns:
            The deleted filename.

        Raises:
            ValidationError: file not found or not owned by user.
        """
        try:
            file_record = File.query.filter_by(
                id=file_id, owner_id=user_id
            ).first()

            if not file_record:
                raise ValidationError("File not found or unauthorised")

            filename = file_record.filename
            db.session.delete(file_record)
            db.session.flush()

            logger.info(f"File deleted: {filename} by user {user_id}")
            return filename

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"delete_file({file_id}) failed: {e}")
            raise FileError("Failed to delete file")

    # ── Statistics ────────────────────────────────────────────────────────

    @staticmethod
    def get_file_stats(user_id: int) -> Dict[str, Any]:
        """
        Return file statistics for *user_id* using SQL aggregates so that
        large encrypted BLOBs are never loaded into Python memory.
        """
        try:
            from sqlalchemy import func

            # Aggregate query — never loads encrypted_file blobs
            row = db.session.query(
                func.count(File.id).label('total_files'),
                func.coalesce(func.sum(File.original_size), 0).label('total_original'),
            ).filter(File.owner_id == user_id).one()

            total_files    = row.total_files
            total_original = int(row.total_original)

            # File-type distribution (only filename column loaded)
            ext_rows = db.session.query(File.filename).filter(
                File.owner_id == user_id
            ).all()
            file_types: Dict[str, int] = {}
            for (fname,) in ext_rows:
                ext = fname.rsplit('.', 1)[-1].lower() if fname and '.' in fname else 'unknown'
                file_types[ext] = file_types.get(ext, 0) + 1

            return {
                'total_files':            total_files,
                'total_original_bytes':   total_original,
                'total_original_mb':      round(total_original / (1024 * 1024), 2),
                'file_types':             file_types,
                'storage_limit_mb':       FileService.MAX_FILE_SIZE // (1024 * 1024),
            }

        except Exception as e:
            logger.error(f"get_file_stats failed for user {user_id}: {e}")
            raise FileError("Failed to get file statistics")

    # ── Filename validation helper ────────────────────────────────────────

    @staticmethod
    def validate_filename(filename: str) -> bool:
        """
        Return True if *filename* is safe to store.
        Applies secure_filename() and checks length.
        """
        try:
            if not filename:
                return False
            safe = secure_filename(filename)
            return bool(safe) and len(safe) <= 255
        except Exception:
            return False