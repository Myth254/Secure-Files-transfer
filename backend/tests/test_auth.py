"""
Tests for authentication endpoints
"""
import json
from src.models.user import User
from src.models.log import Log

class TestAuthEndpoints:
    """Test cases for authentication endpoints"""
    
    def test_register_success(self, client, test_db, mock_encryption_service):
        """Test successful user registration"""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'SecurePass123!'
        }
        
        response = client.post('/api/auth/register', 
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 201
        response_data = response.get_json()
        
        assert response_data['success'] is True
        assert response_data['message'] == 'Registration successful'
        assert 'user' in response_data
        assert response_data['user']['username'] == 'newuser'
        assert response_data['user']['email'] == 'newuser@example.com'
        assert 'rsa_private_key' in response_data
        
        # Verify user was created in database
        user = User.query.filter_by(username='newuser').first()
        assert user is not None
        assert user.email == 'newuser@example.com'
        
        # Verify log was created
        log = Log.query.filter_by(action='register').first()
        assert log is not None
        assert 'newuser' in log.details
    
    def test_register_missing_fields(self, client):
        """Test registration with missing required fields"""
        # Test missing username
        data = {
            'email': 'test@example.com',
            'password': 'password123'
        }
        
        response = client.post('/api/auth/register',
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 400
        response_data = response.get_json()
        assert response_data['success'] is False
        assert 'error' in response_data
    
    def test_register_invalid_email(self, client):
        """Test registration with invalid email"""
        data = {
            'username': 'testuser',
            'email': 'invalid-email',
            'password': 'password123'
        }
        
        response = client.post('/api/auth/register',
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 400
        response_data = response.get_json()
        assert response_data['success'] is False
        assert 'Invalid email' in response_data['error']
    
    def test_register_weak_password(self, client):
        """Test registration with weak password"""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': '123'
        }
        
        response = client.post('/api/auth/register',
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 400
        response_data = response.get_json()
        assert response_data['success'] is False
        assert 'Password must be at least' in response_data['error']
    
    def test_register_duplicate_username(self, client, test_user):
        """Test registration with duplicate username"""
        data = {
            'username': test_user.username,  # Already exists
            'email': 'different@example.com',
            'password': 'SecurePass123!'
        }
        
        response = client.post('/api/auth/register',
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 400
        response_data = response.get_json()
        assert response_data['success'] is False
        assert 'Username already exists' in response_data['error']
    
    def test_register_duplicate_email(self, client, test_user):
        """Test registration with duplicate email"""
        data = {
            'username': 'differentuser',
            'email': test_user.email,  # Already exists
            'password': 'SecurePass123!'
        }
        
        response = client.post('/api/auth/register',
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 400
        response_data = response.get_json()
        assert response_data['success'] is False
        assert 'Email already exists' in response_data['error']
    
    def test_login_success(self, client, test_user):
        """Test successful login"""
        data = {
            'username': test_user.username,
            'password': 'testpassword123'
        }
        
        response = client.post('/api/auth/login',
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 200
        response_data = response.get_json()
        
        assert response_data['success'] is True
        assert response_data['message'] == 'Login successful'
        assert 'token' in response_data
        assert len(response_data['token']) > 0
        assert 'user' in response_data
        assert response_data['user']['username'] == test_user.username
        
        # Verify login was logged
        log = Log.query.filter_by(action='login', user_id=test_user.id).first()
        assert log is not None
    
    def test_login_invalid_username(self, client):
        """Test login with non-existent username"""
        data = {
            'username': 'nonexistent',
            'password': 'password123'
        }
        
        response = client.post('/api/auth/login',
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 401
        response_data = response.get_json()
        assert response_data['success'] is False
        assert 'Invalid credentials' in response_data['error']
        
        # Verify failed login was logged
        log = Log.query.filter_by(action='login_failed').first()
        assert log is not None
        assert 'nonexistent' in log.details
    
    def test_login_invalid_password(self, client, test_user):
        """Test login with incorrect password"""
        data = {
            'username': test_user.username,
            'password': 'wrongpassword'
        }
        
        response = client.post('/api/auth/login',
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 401
        response_data = response.get_json()
        assert response_data['success'] is False
        assert 'Invalid credentials' in response_data['error']
    
    def test_login_missing_credentials(self, client):
        """Test login with missing credentials"""
        # Missing password
        data = {
            'username': 'testuser'
        }
        
        response = client.post('/api/auth/login',
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 400
        response_data = response.get_json()
        assert response_data['success'] is False
    
    def test_logout(self, client, headers):
        """Test logout endpoint"""
        response = client.post('/api/auth/logout',
                             headers=headers)
        
        assert response.status_code == 200
        response_data = response.get_json()
        assert response_data['success'] is True
        assert 'Logout successful' in response_data['message']
    
    def test_verify_token_valid(self, client, headers):
        """Test token verification with valid token"""
        response = client.get('/api/auth/verify',
                            headers=headers)
        
        assert response.status_code == 200
        response_data = response.get_json()
        assert response_data['success'] is True
        assert 'Token is valid' in response_data['message']
    
    def test_verify_token_missing(self, client):
        """Test token verification without token"""
        response = client.get('/api/auth/verify')
        
        assert response.status_code == 401
        response_data = response.get_json()
        assert response_data['success'] is False
    
    def test_verify_token_invalid(self, client):
        """Test token verification with invalid token"""
        headers = {
            'Authorization': 'Bearer invalid.token.here',
            'Content-Type': 'application/json'
        }
        
        response = client.get('/api/auth/verify',
                            headers=headers)
        
        assert response.status_code == 401
        response_data = response.get_json()
        assert response_data['success'] is False
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get('/health')
        
        assert response.status_code == 200
        response_data = response.get_json()
        assert response_data['status'] == 'healthy'
    
    def test_check_username_available(self, client):
        """Test username availability check - available"""
        response = client.get('/api/user/check_username/newusername')
        
        assert response.status_code == 200
        response_data = response.get_json()
        assert response_data['success'] is True
        assert response_data['available'] is True
    
    def test_check_username_taken(self, client, test_user):
        """Test username availability check - taken"""
        response = client.get(f'/api/user/check_username/{test_user.username}')
        
        assert response.status_code == 200
        response_data = response.get_json()
        assert response_data['success'] is True
        assert response_data['available'] is False
    
    def test_check_email_available(self, client):
        """Test email availability check - available"""
        response = client.get('/api/user/check_email/newemail@example.com')
        
        assert response.status_code == 200
        response_data = response.get_json()
        assert response_data['success'] is True
        assert response_data['available'] is True
    
    def test_check_email_taken(self, client, test_user):
        """Test email availability check - taken"""
        response = client.get(f'/api/user/check_email/{test_user.email}')
        
        assert response.status_code == 200
        response_data = response.get_json()
        assert response_data['success'] is True
        assert response_data['available'] is False
    
    def test_check_email_invalid(self, client):
        """Test email availability check - invalid format"""
        response = client.get('/api/user/check_email/invalid-email')
        
        assert response.status_code == 200
        response_data = response.get_json()
        assert response_data['success'] is True
        assert response_data['available'] is False
        assert 'Invalid email' in response_data['message']

class TestUserProfile:
    """Test cases for user profile endpoints"""
    
    def test_get_user_info(self, client, headers, test_user):
        """Test getting user information"""
        response = client.get('/api/user',
                            headers=headers)
        
        assert response.status_code == 200
        response_data = response.get_json()
        
        assert response_data['success'] is True
        assert 'user' in response_data
        assert response_data['user']['username'] == test_user.username
        assert response_data['user']['email'] == test_user.email
    
    def test_get_user_info_unauthorized(self, client):
        """Test getting user information without authentication"""
        response = client.get('/api/user')
        
        assert response.status_code == 401
    
    def test_get_public_key(self, client, headers, test_user):
        """Test getting user's public key"""
        response = client.get('/api/user/public_key',
                            headers=headers)
        
        assert response.status_code == 200
        response_data = response.get_json()
        
        assert response_data['success'] is True
        assert 'public_key' in response_data
        assert response_data['public_key'] == test_user.rsa_public_key
    
    def test_update_user_email(self, client, headers, test_user, test_db):
        """Test updating user email"""
        data = {
            'email': 'updated@example.com',
            'current_password': 'testpassword123'
        }
        
        response = client.put('/api/user/update',
                            data=json.dumps(data),
                            headers=headers,
                            content_type='application/json')
        
        assert response.status_code == 200
        response_data = response.get_json()
        
        assert response_data['success'] is True
        
        # Verify email was updated in database
        test_db.session.refresh(test_user)
        assert test_user.email == 'updated@example.com'
    
    def test_update_user_password(self, client, headers, test_user, test_db):
        """Test updating user password"""
        data = {
            'current_password': 'testpassword123',
            'new_password': 'NewSecurePass123!'
        }
        
        response = client.put('/api/user/update',
                            data=json.dumps(data),
                            headers=headers,
                            content_type='application/json')
        
        assert response.status_code == 200
        response_data = response.get_json()
        
        assert response_data['success'] is True
        
        # Verify password was updated by trying to login with new password
        login_data = {
            'username': test_user.username,
            'password': 'NewSecurePass123!'
        }
        
        login_response = client.post('/api/auth/login',
                                   data=json.dumps(login_data),
                                   content_type='application/json')
        
        assert login_response.status_code == 200
    
    def test_update_user_wrong_current_password(self, client, headers):
        """Test updating user with wrong current password"""
        data = {
            'current_password': 'wrongpassword',
            'new_password': 'NewSecurePass123!'
        }
        
        response = client.put('/api/user/update',
                            data=json.dumps(data),
                            headers=headers,
                            content_type='application/json')
        
        assert response.status_code == 401
        response_data = response.get_json()
        assert response_data['success'] is False
        assert 'Current password is incorrect' in response_data['error']
    
    def test_get_user_activity(self, client, headers, test_user):
        """Test getting user activity logs"""
        # First create some activity
        from src.models.log import Log
        log = Log(
            user_id=test_user.id,
            action='test_action',
            details='Test activity',
            ip_address='127.0.0.1'
        )
        
        from src.extensions import db
        db.session.add(log)
        db.session.commit()
        
        # Get activity logs
        response = client.get('/api/user/activity',
                            headers=headers)
        
        assert response.status_code == 200
        response_data = response.get_json()
        
        assert response_data['success'] is True
        assert 'activity' in response_data
        assert len(response_data['activity']) > 0