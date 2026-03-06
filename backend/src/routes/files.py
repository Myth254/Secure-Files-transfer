from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
import io
from datetime import datetime
from src.extensions import db
from src.models.user import User
from src.models.file import File
from src.models.log import Log
import logging

logger = logging.getLogger(__name__)

files_bp = Blueprint('files', __name__)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'pdf', 'txt', 'jpg', 'jpeg', 'png', 'doc', 'docx'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def encrypt_file_with_aes(file_data: bytes, public_key_pem: str):
    """Encrypt file with AES and encrypt AES key with RSA"""
    from cryptography.hazmat.primitives import serialization, hashes
    from cryptography.hazmat.primitives.asymmetric import padding
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.backends import default_backend
    import os
    
    # 1. Generate random AES key (32 bytes for AES-256)
    aes_key = os.urandom(32)
    
    # 2. Generate random IV for AES-GCM
    iv = os.urandom(12)
    
    # 3. Encrypt file with AES-GCM
    cipher = Cipher(algorithms.AES(aes_key), modes.GCM(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    encrypted_file = iv + encryptor.update(file_data) + encryptor.finalize() + encryptor.tag
    
    # 4. Load public key
    public_key = serialization.load_pem_public_key(
        public_key_pem.encode(),
        backend=default_backend()
    )
    
    # 5. Encrypt AES key with RSA-OAEP
    encrypted_aes_key = public_key.encrypt(
        aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    
    return encrypted_file, encrypted_aes_key.hex()

@files_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    """
    Upload and encrypt a file
    ---
    tags:
      - Files
    security:
      - Bearer: []
    requestBody:
      required: true
      content:
        multipart/form-data:
          schema:
            type: object
            properties:
              file:
                type: string
                format: binary
    responses:
      201:
        description: File uploaded successfully
      400:
        description: Invalid file or upload error
      401:
        description: Unauthorized
    """
    user_id = get_jwt_identity()
    
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        # Validate file
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'error': f'File type not allowed. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400
        
        # Check file size
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({
                'error': f'File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB'
            }), 400
        
        # Read file data
        file_data = file.read()
        
        # Get user and their public key
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Encrypt the file
        encrypted_file, encrypted_aes_key = encrypt_file_with_aes(file_data, user.rsa_public_key)
        
        # Create file record
        new_file = File(
            owner_id=user_id,
            filename=file.filename,
            original_size=len(file_data),
            encrypted_file=encrypted_file,
            encrypted_aes_key=encrypted_aes_key,
            file_hash=hash(file_data)  # Simple hash for deduplication
        )
        
        db.session.add(new_file)
        
        # Log upload
        log_entry = Log(
            user_id=user_id,
            action='upload',
            details=f'Uploaded {file.filename} ({len(file_data)} bytes)',
            ip_address=request.remote_addr,
            user_agent=request.user_agent.string
        )
        db.session.add(log_entry)
        
        db.session.commit()
        
        logger.info(f"File uploaded: {file.filename} by user {user_id}")
        
        return jsonify({
            'success': True,
            'message': 'File uploaded successfully',
            'file': {
                'id': new_file.id,
                'filename': new_file.filename,
                'original_size': new_file.original_size,
                'upload_date': new_file.upload_date.isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Upload error for user {user_id}: {str(e)}")
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

@files_bp.route('', methods=['GET'])
@jwt_required()
def get_files():
    """
    Get list of user's files
    ---
    tags:
      - Files
    security:
      - Bearer: []
    parameters:
      - name: page
        in: query
        type: integer
        description: Page number
      - name: per_page
        in: query
        type: integer
        description: Items per page
    responses:
      200:
        description: List of files
      401:
        description: Unauthorized
    """
    user_id = get_jwt_identity()
    
    try:
        # Pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Validate pagination
        if page < 1:
            page = 1
        if per_page < 1 or per_page > 100:
            per_page = 20
        
        # Query files with pagination
        files_query = File.query.filter_by(owner_id=user_id).order_by(File.upload_date.desc())
        
        # Get paginated results
        paginated_files = files_query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Prepare response
        files_list = []
        for file in paginated_files.items:
            files_list.append({
                'id': file.id,
                'filename': file.filename,
                'original_size': file.original_size,
                'upload_date': file.upload_date.isoformat(),
                'encrypted_size': len(file.encrypted_file)
            })
        
        logger.info(f"Retrieved {len(files_list)} files for user {user_id}")
        
        return jsonify({
            'success': True,
            'files': files_list,
            'pagination': {
                'page': paginated_files.page,
                'per_page': paginated_files.per_page,
                'total_pages': paginated_files.pages,
                'total_items': paginated_files.total,
                'has_next': paginated_files.has_next,
                'has_prev': paginated_files.has_prev
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting files for user {user_id}: {str(e)}")
        return jsonify({'error': 'Failed to retrieve files'}), 500

@files_bp.route('/<int:file_id>', methods=['GET'])
@jwt_required()
def download_file(file_id):
    """
    Get encrypted file data for download
    ---
    tags:
      - Files
    security:
      - Bearer: []
    parameters:
      - name: file_id
        in: path
        required: true
        type: integer
    responses:
      200:
        description: Encrypted file data
      404:
        description: File not found
      401:
        description: Unauthorized
    """
    user_id = get_jwt_identity()
    
    try:
        # Find the file
        file = File.query.filter_by(id=file_id, owner_id=user_id).first()
        
        if not file:
            return jsonify({'error': 'File not found or unauthorized'}), 404
        
        # Log download
        log_entry = Log(
            user_id=user_id,
            action='download',
            details=f'Downloaded {file.filename}',
            ip_address=request.remote_addr,
            user_agent=request.user_agent.string
        )
        db.session.add(log_entry)
        db.session.commit()
        
        logger.info(f"File downloaded: {file.filename} by user {user_id}")
        
        return jsonify({
            'success': True,
            'file': {
                'filename': file.filename,
                'original_size': file.original_size,
                'upload_date': file.upload_date.isoformat(),
                'encrypted_file': file.encrypted_file.hex(),  # Convert to hex string
                'encrypted_aes_key': file.encrypted_aes_key   # Already hex string
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Download error for file {file_id} by user {user_id}: {str(e)}")
        return jsonify({'error': 'Download failed'}), 500

@files_bp.route('/<int:file_id>', methods=['DELETE'])
@jwt_required()
def delete_file(file_id):
    """
    Delete a file
    ---
    tags:
      - Files
    security:
      - Bearer: []
    parameters:
      - name: file_id
        in: path
        required: true
        type: integer
    responses:
      200:
        description: File deleted
      404:
        description: File not found
      401:
        description: Unauthorized
    """
    user_id = get_jwt_identity()
    
    try:
        # Find the file
        file = File.query.filter_by(id=file_id, owner_id=user_id).first()
        
        if not file:
            return jsonify({'error': 'File not found or unauthorized'}), 404
        
        filename = file.filename
        
        # Delete the file
        db.session.delete(file)
        
        # Log deletion
        log_entry = Log(
            user_id=user_id,
            action='delete',
            details=f'Deleted {filename}',
            ip_address=request.remote_addr,
            user_agent=request.user_agent.string
        )
        db.session.add(log_entry)
        
        db.session.commit()
        
        logger.info(f"File deleted: {filename} by user {user_id}")
        
        return jsonify({
            'success': True,
            'message': f'File "{filename}" deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete error for file {file_id} by user {user_id}: {str(e)}")
        return jsonify({'error': 'Delete failed'}), 500

@files_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    """
    Get user's file statistics
    ---
    tags:
      - Files
    security:
      - Bearer: []
    responses:
      200:
        description: File statistics
      401:
        description: Unauthorized
    """
    user_id = get_jwt_identity()
    
    try:
        # Count total files
        total_files = File.query.filter_by(owner_id=user_id).count()
        
        # Calculate total storage used (encrypted size)
        files = File.query.filter_by(owner_id=user_id).all()
        total_storage = sum(len(f.encrypted_file) for f in files)
        
        # Get file type distribution
        file_types = {}
        for file in files:
            ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else 'unknown'
            file_types[ext] = file_types.get(ext, 0) + 1
        
        logger.info(f"Retrieved stats for user {user_id}")
        
        return jsonify({
            'success': True,
            'stats': {
                'total_files': total_files,
                'total_storage_bytes': total_storage,
                'total_storage_mb': round(total_storage / (1024 * 1024), 2),
                'file_types': file_types,
                'storage_limit_mb': MAX_FILE_SIZE // (1024 * 1024)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting stats for user {user_id}: {str(e)}")
        return jsonify({'error': 'Failed to get statistics'}), 500