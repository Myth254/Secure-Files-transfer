# Secure File Transfer Platform - Backend

A production-hardened secure file transfer platform with end-to-end encryption using AES-256-GCM + RSA-2048-OAEP. The backend ensures the server cannot decrypt user files—only encrypted data is stored.

## Features

### Core Security
- **End-to-End Encryption**: AES-256-GCM for file encryption with RSA-2048-OAEP for key wrapping
- **User Authentication**: JWT with Redis-backed token blocklist
- **OTP Verification**: Two-factor authentication for login via OTP
- **Password Hashing**: Argon2id for secure password storage
- **Rate Limiting**: Request throttling to prevent abuse

### File Management
- Secure file upload/download with encryption
- File sharing with approval workflow
- File deletion with secure purging
- User activity logging and audit trails

### Monitoring & Observability
- Real-time metrics collection (requests, response times, errors)
- Server performance monitoring (CPU, memory, disk usage)
- Error tracking and correlation IDs
- WebSocket-based monitoring dashboard
- Alert management for critical events

### User Management
- User registration with RSA key pair generation
- User profile management
- Public key retrieval for other users
- Activity history and login tracking
- Username and email validation

### API Features
- RESTful API with JSON responses
- CORS support for cross-origin requests
- Comprehensive error handling with correlation IDs
- ProxyFix middleware for correct client IP detection

## Tech Stack
- **Backend**: Flask 2.3.3
- **Database**: MySQL 8.0+
- **Authentication**: JWT (Flask-JWT-Extended)
- **Real-time**: WebSocket via Flask-SocketIO & eventlet
- **Encryption**: cryptography library (RSA, AES-GCM)
- **Password Hashing**: Argon2id (argon2-cffi) & bcrypt
- **Caching/Blocklist**: Redis
- **Rate Limiting**: Flask-Limiter
- **Monitoring**: psutil for system metrics

## Setup

### 1. Prerequisites
- Python 3.8+
- MySQL 8.0+
- Redis 5.0+
- pip

### 2. Environment Configuration
Create a `.env` file with required variables:

```bash
# Flask config
SECRET_KEY=<64-char hex string> # Generate: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY=<64-char hex string>
FLASK_ENV=production
FLASK_DEBUG=0

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<your-db-password>
DB_NAME=secure_files

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_ACCESS_TOKEN_EXPIRES=3600  # 1 hour in seconds
JWT_REFRESH_TOKEN_EXPIRES=2592000  # 30 days in seconds

# OTP
OTP_LENGTH=6
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=3

# Email (for OTP delivery)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=<your-email@gmail.com>
SMTP_PASSWORD=<your-app-password>
FROM_EMAIL=noreply@yoursite.com
APP_NAME=Secure File Transfer

# Admin
ADMIN_PASSWORD=<secure-12-char-minimum-password>
```

### 3. Installation

```bash
# Clone the repository
git clone <repository-url>
cd secure-file-transfer/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Initialize database
python -c "from app import app, db; app.app_context().push(); db.create_all()"

# Run server
python app.py
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user (returns encrypted private key)
- `POST /login` - Initiate login (sends OTP)
- `POST /verify-login-otp` - Verify OTP and get JWT token
- `POST /resend-login-otp` - Resend OTP code
- `POST /logout` - Logout and blocklist token
- `GET /verify` - Verify token validity

### Files (`/api/files`)
- `POST /upload` - Upload encrypted file
- `GET /` - List user's files
- `GET /<file_id>` - Download encrypted file
- `DELETE /<file_id>` - Delete file
- `GET /stats` - Get file statistics

### Sharing (`/api/share`)
- `POST /request` - Request to share file with user
- `GET /requests` - Get pending share requests
- `POST /requests/<request_id>/accept` - Accept share request
- `POST /requests/<request_id>/reject` - Reject share request

### User (`/api/user`)
- `GET /` - Get user profile
- `GET /public_key` - Get user's public RSA key
- `PUT /update` - Update user profile
- `GET /activity` - Get user activity history
- `GET /check_username/<username>` - Check username availability
- `GET /check_email/<email>` - Check email availability

### Monitoring (`/api/monitoring`)
- Real-time metrics and server status via WebSocket
- Performance dashboards and error tracking

## Security Notes

- **No Server-side Decryption**: Private keys are Argon2id-encrypted and stored only on client
- **Token Blocklist**: Redis maintains a blocklist of logged-out tokens
- **Rate Limiting**: API endpoints are rate-limited to prevent brute force attacks
- **Secure File Upload**: All files are validated using `werkzeug.utils.secure_filename()`
- **CORS Configured**: Only trusted origins can access the API
- **Proxy Support**: ProxyFix configured for correct X-Forwarded-For detection

## Testing

```bash
# Run all tests
python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/test_auth.py -v

# Run with coverage
python -m pytest tests/ --cov=src/
```

## Project Structure

```
backend/
├── app.py                    # Flask application entry point
├── config.py                 # Configuration management
├── requirements.txt          # Python dependencies
├── src/
│   ├── extensions.py        # Flask extensions initialization
│   ├── models/              # SQLAlchemy models
│   ├── routes/              # API blueprints
│   ├── services/            # Business logic
│   ├── utils/               # Helpers and utilities
│   └── monitoring/          # Metrics, alerts, middleware
├── scripts/                 # Initialization scripts
├── tests/                   # Test suite
└── monitoring/dashboard     # Static monitoring dashboard
```

## Troubleshooting

- **Redis Connection Failed**: Ensure Redis is running on configured URL
- **Database Connection Failed**: Check MySQL credentials in `.env`
- **OTP Not Sending**: Verify SMTP credentials and "Less secure apps" enabled (Gmail)
- **JWT Errors**: Ensure `JWT_SECRET_KEY` is set and consistent across restarts