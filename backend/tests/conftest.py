"""
Test configuration and fixtures for pytest
"""
import pytest
import os
import tempfile
from flask import Flask
from src.extensions import db, jwt
from src.models.user import User
from src.models.file import File
from src.models.log import Log
import bcrypt

# Test configuration
TEST_CONFIG = {
    'TESTING': True,
    'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
    'SQLALCHEMY_TRACK_MODIFICATIONS': False,
    'SECRET_KEY': 'test-secret-key',
    'JWT_SECRET_KEY': 'test-jwt-secret-key',
    'BCRYPT_ROUNDS': 4,  # Faster for testing
    'MAX_CONTENT_LENGTH': 10 * 1024 * 1024,  # 10MB
    'ALLOWED_EXTENSIONS': {'pdf', 'txt', 'jpg', 'jpeg', 'png'}
}

@pytest.fixture(scope='session')
def app():
    """Create and configure a Flask app for testing"""
    # Create temporary directory for file uploads
    temp_dir = tempfile.mkdtemp()
    
    app = Flask(__name__)
    app.config.update(TEST_CONFIG)
    app.config['UPLOAD_FOLDER'] = temp_dir
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    yield app
    
    # Cleanup
    import shutil
    shutil.rmtree(temp_dir, ignore_errors=True)

@pytest.fixture
def client(app):
    """Test client for making requests"""
    return app.test_client()

@pytest.fixture
def test_db(app):
    """Database session for testing"""
    with app.app_context():
        yield db
        
        # Clean up after each test
        db.session.remove()
        db.drop_all()
        db.create_all()

@pytest.fixture
def test_user(test_db):
    """Create a test user"""
    password_hash = bcrypt.hashpw('testpassword123'.encode(), bcrypt.gensalt()).decode()
    
    user = User(
        username='testuser',
        email='test@example.com',
        password_hash=password_hash,
        rsa_public_key='-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----',
        rsa_private_key_encrypted='encrypted:private:key'
    )
    
    test_db.session.add(user)
    test_db.session.commit()
    
    return user

@pytest.fixture
def test_file(test_db, test_user):
    """Create a test file"""
    file = File(
        owner_id=test_user.id,
        filename='test.txt',
        original_size=100,
        encrypted_file=b'encrypted_content',
        encrypted_aes_key='encrypted_aes_key_hex'
    )
    
    test_db.session.add(file)
    test_db.session.commit()
    
    return file

@pytest.fixture
def auth_token(client, test_user):
    """Get authentication token for test user"""
    # Create a token directly (bypass login for speed)
    from flask_jwt_extended import create_access_token
    from src.app import create_app
    
    app = create_app('testing')
    with app.app_context():
        return create_access_token(identity=test_user.id)

@pytest.fixture
def headers(auth_token):
    """Authorization headers for authenticated requests"""
    return {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }

@pytest.fixture
def sample_file_data():
    """Sample file data for testing uploads"""
    return b'This is test file content for encryption testing.'

@pytest.fixture
def sample_image_data():
    """Sample image data (small PNG)"""
    # Base64 encoded 1x1 transparent PNG
    return bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082')

# Mock encryption service for testing
@pytest.fixture
def mock_encryption_service(monkeypatch):
    """Mock encryption service to avoid actual encryption in tests"""
    class MockEncryptionService:
        @staticmethod
        def generate_rsa_keypair():
            return (
                '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7...\n-----END PRIVATE KEY-----',
                '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7...\n-----END PUBLIC KEY-----'
            )
        
        @staticmethod
        def encrypt_file(file_data, public_key_pem):
            return b'mock_encrypted_file', 'mock_encrypted_aes_key_hex'
        
        @staticmethod
        def hash_password(password):
            return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        
        @staticmethod
        def verify_password(password, hashed_password):
            return bcrypt.checkpw(password.encode(), hashed_password.encode())
    
    monkeypatch.setattr('src.services.encryption_service.EncryptionService', MockEncryptionService)
    return MockEncryptionService

# Test utilities
class TestUtils:
    """Utility functions for testing"""
    
    @staticmethod
    def assert_response_structure(response, expected_status=200):
        """Assert response has proper structure"""
        assert response.status_code == expected_status
        data = response.get_json()
        assert isinstance(data, dict)
        return data
    
    @staticmethod
    def assert_error_response(response, expected_status=400):
        """Assert error response structure"""
        data = TestUtils.assert_response_structure(response, expected_status)
        assert 'success' in data
        assert data['success'] is False
        assert 'error' in data
        return data
    
    @staticmethod
    def assert_success_response(response, expected_status=200):
        """Assert success response structure"""
        data = TestUtils.assert_response_structure(response, expected_status)
        assert 'success' in data
        assert data['success'] is True
        return data

# Environment setup for tests
@pytest.fixture(scope='session', autouse=True)
def setup_test_environment():
    """Setup test environment before running tests"""
    # Ensure test environment variables are set
    os.environ['FLASK_ENV'] = 'testing'
    os.environ['FLASK_CONFIG'] = 'testing'
    
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    yield
    
    # Cleanup after all tests
    pass