"""
Tests for file management endpoints
"""
import json
import io
import pytest
from src.models.file import File
from src.models.log import Log

class TestFileUpload:
    """Test cases for file upload endpoint"""
    
    def test_upload_file_success(self, client, headers, test_user, sample_file_data):
        """Test successful file upload"""
        data = {
            'file': (io.BytesIO(sample_file_data), 'test.txt')
        }
        
        response = client.post('/api/files/upload',
                             data=data,
                             headers={'Authorization': headers['Authorization']},
                             content_type='multipart/form-data')
        
        assert response.status_code == 201
        response_data = response.get_json()
        
        assert response_data['success'] is True
        assert response_data['message'] == 'File uploaded successfully'
        assert 'file' in response_data
        assert response_data['file']['filename'] == 'test.txt'
        
        # Verify file was saved in database
        file_record = File.query.filter_by(owner_id=test_user.id).first()
        assert file_record is not None
        assert file_record.filename == 'test.txt'
        assert file_record.original_size == len(sample_file_data)
        
        # Verify upload was logged
        log = Log.query.filter_by(action='upload', user_id=test_user.id).first()
        assert log is not None
        assert 'test.txt' in log.details
    
    def test_upload_file_no_file(self, client, headers):
        """Test upload without file"""
        response = client.post('/api/files/upload',
                             data={},
                             headers={'Authorization': headers['Authorization']},
                             content_type='multipart/form-data')
        
        assert response.status_code == 400
        response_data = response.get_json()
        assert response_data['success'] is False
        assert 'No file provided' in response_data['error']
    
    def test_upload_file_empty_filename(self, client, headers):
        """Test upload with empty filename"""
        data = {
            'file': (io.BytesIO(b'test content'), '')
        }
        
        response = client.post('/api/files/upload',
                             data=data,
                             headers={'Authorization': headers['Authorization']},
                             content_type='multipart/form-data')
        
        assert response.status_code == 400
        response_data = response.get_json()
        assert response_data['success'] is False
        assert 'No file selected' in response_data['error']
    
    def test_upload_file_invalid_extension(self, client, headers):
        """Test upload with invalid file extension"""
        data = {
            'file': (io.BytesIO(b'test content'), 'test.exe')
        }
        
        response = client.post('/api/files/upload',
                             data=data,
                             headers={'Authorization': headers['Authorization']},
                             content_type='multipart/form-data')
        
        assert response.status_code == 400
        response_data = response.get_json()
        assert response_data['success'] is False
        assert 'File type not allowed' in response_data['error']
    
    def test_upload_file_too_large(self, client, headers):
        """Test upload with file too large"""
        # Create a file larger than 10MB
        large_content = b'x' * (11 * 1024 * 1024)  # 11MB
        
        data = {
            'file': (io.BytesIO(large_content), 'large.txt')
        }
        
        response = client.post('/api/files/upload',
                             data=data,
                             headers={'Authorization': headers['Authorization']},
                             content_type='multipart/form-data')
        
        assert response.status_code == 400
        response_data = response.get_json()
        assert response_data['success'] is False
        assert 'File too large' in response_data['error']
    
    def test_upload_file_unauthorized(self, client):
        """Test upload without authentication"""
        data = {
            'file': (io.BytesIO(b'test content'), 'test.txt')
        }
        
        response = client.post('/api/files/upload',
                             data=data,
                             content_type='multipart/form-data')
        
        assert response.status_code == 401
    
    def test_upload_image_file(self, client, headers, sample_image_data):
        """Test upload of image file (PNG)"""
        data = {
            'file': (io.BytesIO(sample_image_data), 'test.png')
        }
        
        response = client.post('/api/files/upload',
                             data=data,
                             headers={'Authorization': headers['Authorization']},
                             content_type='multipart/form-data')
        
        assert response.status_code == 201
        response_data = response.get_json()
        assert response_data['success'] is True

class TestFileListing:
    """Test cases for file listing endpoint"""
    
    def test_get_files_empty(self, client, headers):
        """Test getting files when user has no files"""
        response = client.get('/api/files',
                            headers=headers)
        
        assert response.status_code == 200
        response_data = response.get_json()
        
        assert response_data['success'] is True
        assert 'files' in response_data
        assert len(response_data['files']) == 0
        assert 'pagination' in response_data
    
    def test_get_files_with_data(self, client, headers, test_file, test_user):
        """Test getting files when user has files"""
        # Create another file
        file2 = File(
            owner_id=test_user.id,
            filename='test2.txt',
            original_size=200,
            encrypted_file=b'encrypted_content_2',
            encrypted_aes_key='encrypted_aes_key_hex_2'
        )
        
        from src.extensions import db
        db.session.add(file2)
        db.session.commit()
        
        response = client.get('/api/files',
                            headers=headers)
        
        assert response.status_code == 200
        response_data = response.get_json()
        
        assert response_data['success'] is True
        assert 'files' in response_data
        assert len(response_data['files']) == 2
        
        # Verify file details
        filenames = [f['filename'] for f in response_data['files']]
        assert 'test.txt' in filenames
        assert 'test2.txt' in filenames
        
        # Verify pagination
        assert 'pagination' in response_data
        assert response_data['pagination']['total_items'] == 2
    
    def test_get_files_pagination(self, client, headers, test_user):
        """Test file listing with pagination"""
        # Create multiple files
        from src.extensions import db
        for i in range(25):
            file = File(
                owner_id=test_user.id,
                filename=f'test_{i}.txt',
                original_size=100 + i,
                encrypted_file=f'encrypted_content_{i}'.encode(),
                encrypted_aes_key=f'encrypted_aes_key_hex_{i}'
            )
            db.session.add(file)
        db.session.commit()
        
        # Test first page
        response = client.get('/api/files?page=1&per_page=10',
                            headers=headers)
        
        assert response.status_code == 200
        response_data = response.get_json()
        
        assert response_data['success'] is True
        assert len(response_data['files']) == 10
        assert response_data['pagination']['page'] == 1
        assert response_data['pagination']['per_page'] == 10
        assert response_data['pagination']['total_items'] == 25
        assert response_data['pagination']['has_next'] is True
        
        # Test second page
        response = client.get('/api/files?page=2&per_page=10',
                            headers=headers)
        
        assert response.status_code == 200
        response_data = response.get_json()
        
        assert response_data['success'] is True
        assert len(response_data['files']) == 10
        assert response_data['pagination']['page'] == 2
    
    def test_get_files_search(self, client, headers, test_user):
        """Test file listing with search"""
        from src.extensions import db
        
        # Create files with different names
        files = [
            File(
                owner_id=test_user.id,
                filename='document.pdf',
                original_size=100,
                encrypted_file=b'content',
                encrypted_aes_key='key'
            ),
            File(
                owner_id=test_user.id,
                filename='image.jpg',
                original_size=200,
                encrypted_file=b'content',
                encrypted_aes_key='key'
            ),
            File(
                owner_id=test_user.id,
                filename='another_document.pdf',
                original_size=300,
                encrypted_file=b'content',
                encrypted_aes_key='key'
            )
        ]
        
        for file in files:
            db.session.add(file)
        db.session.commit()
        
        # Search for PDF files
        response = client.get('/api/files?search=document',
                            headers=headers)
        
        assert response.status_code == 200
        response_data = response.get_json()
        
        assert response_data['success'] is True
        assert len(response_data['files']) == 2  # document.pdf and another_document.pdf
    
    def test_get_files_unauthorized(self, client):
        """Test getting files without authentication"""
        response = client.get('/api/files')
        
        assert response.status_code == 401

class TestFileDownload:
    """Test cases for file download endpoint"""
    
    def test_download_file_success(self, client, headers, test_file, test_user):
        """Test successful file download"""
        response = client.get(f'/api/files/{test_file.id}',
                            headers=headers)
        
        assert response.status_code == 200
        response_data = response.get_json()
        
        assert response_data['success'] is True
        assert 'file' in response_data
        assert response_data['file']['filename'] == test_file.filename
        assert response_data['file']['original_size'] == test_file.original_size
        assert 'encrypted_file' in response_data['file']
        assert 'encrypted_aes_key' in response_data['file']
        
        # Verify download was logged
        log = Log.query.filter_by(action='download', user_id=test_user.id).first()
        assert log is not None
        assert test_file.filename in log.details
    
    def test_download_file_not_found(self, client, headers):
        """Test download of non-existent file"""
        response = client.get('/api/files/999',
                            headers=headers)
        
        assert response.status_code == 404
        response_data = response.get_json()
        assert response_data['success'] is False
        assert 'File not found' in response_data['error']
    
    def test_download_other_users_file(self, client, headers, test_db):
        """Test downloading another user's file"""
        from src.models.user import User
        import bcrypt
        
        # Create another user
        other_user = User(
            username='otheruser',
            email='other@example.com',
            password_hash=bcrypt.hashpw('password123'.encode(), bcrypt.gensalt()).decode(),
            rsa_public_key='public_key',
            rsa_private_key_encrypted='encrypted_key'
        )
        test_db.session.add(other_user)
        test_db.session.commit()
        
        # Create file for other user
        other_file = File(
            owner_id=other_user.id,
            filename='other.txt',
            original_size=100,
            encrypted_file=b'encrypted',
            encrypted_aes_key='key'
        )
        test_db.session.add(other_file)
        test_db.session.commit()
        
        # Try to download other user's file
        response = client.get(f'/api/files/{other_file.id}',
                            headers=headers)
        
        assert response.status_code == 404
        response_data = response.get_json()
        assert response_data['success'] is False
    
    def test_download_file_unauthorized(self, client, test_file):
        """Test download without authentication"""
        response = client.get(f'/api/files/{test_file.id}')
        
        assert response.status_code == 401

class TestFileDeletion:
    """Test cases for file deletion endpoint"""
    
    def test_delete_file_success(self, client, headers, test_file, test_user, test_db):
        """Test successful file deletion"""
        response = client.delete(f'/api/files/{test_file.id}',
                               headers=headers)
        
        assert response.status_code == 200
        response_data = response.get_json()
        
        assert response_data['success'] is True
        assert 'deleted successfully' in response_data['message']
        
        # Verify file was deleted from database
        file_record = File.query.get(test_file.id)
        assert file_record is None
        
        # Verify deletion was logged
        log = Log.query.filter_by(action='delete', user_id=test_user.id).first()
        assert log is not None
        assert test_file.filename in log.details
    
    def test_delete_file_not_found(self, client, headers):
        """Test deletion of non-existent file"""
        response = client.delete('/api/files/999',
                               headers=headers)
        
        assert response.status_code == 404
        response_data = response.get_json()
        assert response_data['success'] is False
    
    def test_delete_other_users_file(self, client, headers, test_db):
        """Test deleting another user's file"""
        from src.models.user import User
        import bcrypt
        
        # Create another user
        other_user = User(
            username='otheruser',
            email='other@example.com',
            password_hash=bcrypt.hashpw('password123'.encode(), bcrypt.gensalt()).decode(),
            rsa_public_key='public_key',
            rsa_private_key_encrypted='encrypted_key'
        )
        test_db.session.add(other_user)
        test_db.session.commit()
        
        # Create file for other user
        other_file = File(
            owner_id=other_user.id,
            filename='other.txt',
            original_size=100,
            encrypted_file=b'encrypted',
            encrypted_aes_key='key'
        )
        test_db.session.add(other_file)
        test_db.session.commit()
        
        # Try to delete other user's file
        response = client.delete(f'/api/files/{other_file.id}',
                               headers=headers)
        
        assert response.status_code == 404
        response_data = response.get_json()
        assert response_data['success'] is False
    
    def test_delete_file_unauthorized(self, client, test_file):
        """Test deletion without authentication"""
        response = client.delete(f'/api/files/{test_file.id}')
        
        assert response.status_code == 401

class TestFileStats:
    """Test cases for file statistics endpoint"""
    
    def test_get_file_stats(self, client, headers, test_user):
        """Test getting file statistics"""
        from src.extensions import db
        
        # Create some files
        files = [
            File(
                owner_id=test_user.id,
                filename='doc1.pdf',
                original_size=1000,
                encrypted_file=b'x' * 1500,
                encrypted_aes_key='key'
            ),
            File(
                owner_id=test_user.id,
                filename='image.jpg',
                original_size=2000,
                encrypted_file=b'x' * 2500,
                encrypted_aes_key='key'
            ),
            File(
                owner_id=test_user.id,
                filename='doc2.pdf',
                original_size=3000,
                encrypted_file=b'x' * 3500,
                encrypted_aes_key='key'
            )
        ]
        
        for file in files:
            db.session.add(file)
        db.session.commit()
        
        response = client.get('/api/files/stats',
                            headers=headers)
        
        assert response.status_code == 200
        response_data = response.get_json()
        
        assert response_data['success'] is True
        assert 'stats' in response_data
        
        stats = response_data['stats']
        assert stats['total_files'] == 3
        assert stats['total_storage_bytes'] == 1500 + 2500 + 3500  # Encrypted sizes
        assert 'file_types' in stats
        assert stats['file_types']['pdf'] == 2
        assert stats['file_types']['jpg'] == 1
    
    def test_get_file_stats_empty(self, client, headers):
        """Test getting stats when user has no files"""
        response = client.get('/api/files/stats',
                            headers=headers)
        
        assert response.status_code == 200
        response_data = response.get_json()
        
        assert response_data['success'] is True
        assert response_data['stats']['total_files'] == 0
        assert response_data['stats']['total_storage_bytes'] == 0
    
    def test_get_file_stats_unauthorized(self, client):
        """Test getting stats without authentication"""
        response = client.get('/api/files/stats')
        
        assert response.status_code == 401

class TestEncryptionFlow:
    """Test cases for encryption/decryption flow"""
    
    def test_encryption_integration(self, client, headers, test_user, sample_file_data):
        """Test complete encryption flow"""
        # 1. Upload file (server encrypts it)
        data = {
            'file': (io.BytesIO(sample_file_data), 'integration_test.txt')
        }
        
        upload_response = client.post('/api/files/upload',
                                    data=data,
                                    headers={'Authorization': headers['Authorization']},
                                    content_type='multipart/form-data')
        
        assert upload_response.status_code == 201
        upload_data = upload_response.get_json()
        file_id = upload_data['file']['id']
        
        # 2. Download file (get encrypted data)
        download_response = client.get(f'/api/files/{file_id}',
                                     headers=headers)
        
        assert download_response.status_code == 200
        download_data = download_response.get_json()
        
        assert 'encrypted_file' in download_data['file']
        assert 'encrypted_aes_key' in download_data['file']
        
        # Note: In a real test with the frontend, you would:
        # 3. Decrypt AES key with RSA private key (client-side)
        # 4. Decrypt file with AES key (client-side)
        # 5. Verify decrypted content matches original
        
        # For this backend test, we verify the structure is correct
        encrypted_file_hex = download_data['file']['encrypted_file']
        encrypted_aes_key_hex = download_data['file']['encrypted_aes_key']
        
        # Verify they are valid hex strings
        assert len(encrypted_file_hex) > 0
        assert len(encrypted_aes_key_hex) > 0
        
        # Try to decode hex (should not raise exception)
        import binascii
        binascii.unhexlify(encrypted_file_hex)
        binascii.unhexlify(encrypted_aes_key_hex)