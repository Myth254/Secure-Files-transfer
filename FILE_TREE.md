# VaultSync — Complete File Tree Structure

## Project Overview
VaultSync is a secure file transfer application with end-to-end encryption, featuring a Flask backend and vanilla JavaScript frontend.

---

## Root Directory
```
The_Lock/
├── .codex/                          # Code analysis cache
├── .git/                            # Git repository
├── .venv/                           # Python virtual environment
├── README.md                        # Project documentation
├── Sharing_Analysis_Report.txt      # Analysis report
├── backend/                         # Flask backend application
└── frontend/                        # Web frontend application
```

---

## Backend Structure

### `/backend` — Flask Application Root
```
backend/
├── .env                             # Environment variables (local)
├── .env.example                     # Environment variables template
├── .gitignore                       # Git ignore rules
├── .ruff_cache/                     # Ruff linter cache
├── __pycache__/                     # Python bytecode cache
├── README.md                        # Backend documentation
├── app.py                           # Main Flask application (v4.1)
├── config.py                        # Configuration management
├── requirements.txt                 # Python dependencies
├── run_tests.py                     # Test runner script
├── venv/                            # Python virtual environment
│
├── scripts/                         # Utility scripts
│   └── init_monitoring.py           # Initialize monitoring system
│
├── src/                             # Source code (main application logic)
│   ├── __init__.py
│   ├── extensions.py                # Flask extensions (db, jwt, cors, etc)
│   │
│   ├── models/                      # Database models (SQLAlchemy)
│   │   ├── __init__.py
│   │   ├── user.py                  # User model
│   │   ├── file.py                  # File metadata model
│   │   ├── share.py                 # File sharing model
│   │   ├── otp.py                   # One-time password model
│   │   ├── log.py                   # Audit log model
│   │   └── monitoring.py            # Monitoring/error tracking model
│   │
│   ├── routes/                      # API route blueprints
│   │   ├── __init__.py
│   │   ├── auth.py                  # Authentication endpoints
│   │   ├── user.py                  # User profile endpoints
│   │   ├── files.py                 # File upload/download endpoints
│   │   ├── share.py                 # File sharing endpoints
│   │   ├── otp.py                   # OTP verification endpoints
│   │   └── monitoring.py            # Monitoring/metrics endpoints
│   │
│   ├── services/                    # Business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py          # Authentication logic
│   │   ├── user_service.py          # User management logic
│   │   ├── file_service.py          # File handling logic
│   │   ├── share_service.py         # File sharing logic
│   │   ├── otp_service.py           # OTP generation/verification
│   │   ├── email_service.py         # Email sending
│   │   └── encryption_service.py    # Encryption/decryption logic
│   │
│   ├── utils/                       # Utility modules
│   │   ├── __init__.py
│   │   ├── exceptions.py            # Custom exceptions
│   │   ├── responses.py             # Response formatting utilities
│   │   ├── security.py              # Security utilities
│   │   └── validators.py            # Input validation utilities
│   │
│   └── monitoring/                  # Real-time monitoring & alerting
│       ├── _init__.py               # (Note: typo in filename)
│       ├── alerts.py                # Alert management
│       ├── metrics.py               # Metrics collection & analysis
│       ├── middleware.py            # Request/response middleware
│       └── socket_events.py         # WebSocket event handlers
│
├── tests/                           # Test suite
│   ├── conftest.py                  # Pytest configuration
│   ├── test_auth.py                 # Authentication tests
│   ├── test_files.py                # File operation tests
│   └── test_otp_service.py          # OTP service tests
│
└── [Test files in root]             # Additional test scripts
    ├── test_client_perspective.py   # Client-side flow tests
    ├── test_complete_flow.py        # End-to-end flow tests
    ├── test_db.py                   # Database tests
    ├── test_decryption.py           # Decryption tests
    ├── test_otp_console.py          # OTP console tests
    ├── test_real_encryption.py      # Encryption tests
    ├── test_websocket.py            # WebSocket tests
    └── [Sample files]
        ├── original_document.txt
        ├── test_document.txt
        └── share_me.txt
```

### Backend Key Components

**Models (Database)**
- `User`: User accounts with authentication credentials
- `File`: File metadata, encryption keys, storage paths
- `Share`: File sharing records with per-recipient key wrapping
- `OTP`: One-time passwords for 2FA verification
- `Log`: Audit logs for compliance
- `ErrorTracking`: System error tracking for monitoring

**Services (Business Logic)**
- `AuthService`: User registration, login, JWT token management
- `FileService`: Upload, download, encryption/decryption orchestration
- `ShareService`: File sharing, recipient management
- `OTPService`: OTP generation via email
- `EncryptionService`: AES-256-GCM + RSA-2048-OAEP
- `EmailService`: Email delivery for OTP codes

**Routes (API Endpoints)**
- `/api/auth/*`: Login, register, logout
- `/api/user/*`: Profile management
- `/api/files/*`: File operations
- `/api/share/*`: Sharing management
- `/api/otp/*`: OTP verification
- `/api/monitoring/*`: Health checks, metrics, alerts

**Monitoring**
- Real-time metrics collection
- Alert management system
- Request/response middleware
- WebSocket event streaming

---

## Frontend Structure

### `/frontend` — Web Application Root
```
frontend/
├── index.html                       # Main entry point (SPA shell)
├── project structure.txt            # Project documentation
│
├── css/                             # Stylesheets
│   ├── tokens.css                   # Design tokens (colors, spacing, fonts)
│   ├── base.css                     # Base styles & resets
│   ├── layout.css                   # Layout components (grid, flexbox)
│   ├── components.css               # Reusable component styles
│   └── pages.css                    # Page-specific styles
│
├── html/                            # HTML partial templates
│   ├── sidebar.html                 # Main navigation sidebar
│   ├── modals.html                  # Modal dialogs
│   │
│   ├── [Authentication pages]
│   │   ├── login.html               # Login form
│   │   ├── register.html            # Registration form
│   │   ├── otp.html                 # OTP verification
│   │   └── key-backup.html          # Encryption key backup
│   │
│   └── [Dashboard pages]
│       ├── page-files.html          # File management page
│       ├── page-sharing.html        # Sharing management page
│       ├── page-profile.html        # User profile page
│       └── page-monitoring.html     # Monitoring dashboard
│
└── js/                              # JavaScript modules
    ├── loader.js                    # HTML partial loader
    ├── app.js                       # Main application entry
    ├── ui.js                        # UI utility functions
    │
    ├── [Feature modules]
    ├── auth.js                      # Authentication flow
    ├── files.js                     # File operations
    ├── sharing.js                   # Sharing management
    ├── profile.js                   # User profile
    ├── monitoring.js                # Monitoring display
    │
    ├── [Core utilities]
    ├── api.js                       # API client (fetch wrapper)
    ├── crypto.js                    # Client-side encryption (AES-GCM, RSA-OAEP, Argon2id)
    └── file-viewer.js               # Document preview (Word, Excel, ZIP, etc)
```

### Frontend Key Components

**Architecture**
- **Single Page Application (SPA)**: Dynamic partial loading
- **Client-side Encryption**: All sensitive data encrypted before transmission
- **Stateful Sessions**: JWT tokens stored securely

**HTML Partials** (loaded dynamically by `loader.js`)
- `sidebar.html`: Navigation menu with user info
- `modals.html`: Reusable modal dialogs
- Auth pages: Login, register, OTP, key backup
- Dashboard pages: Files, sharing, profile, monitoring

**CSS Organization**
- `tokens.css`: Design system variables (colors, spacing, typography)
- `base.css`: Normalization and base element styles
- `layout.css`: Grid and layout patterns
- `components.css`: Button, form, card, badge styles
- `pages.css`: Page-specific overrides

**JavaScript Modules**
- `loader.js`: Fetches and injects HTML partials
- `app.js`: Application initialization and routing
- `auth.js`: Login/register/logout flow
- `api.js`: HTTP client with error handling
- `crypto.js`: Client-side AES-256-GCM & RSA-2048-OAEP encryption
- `files.js`: File upload/download management
- `sharing.js`: Share link generation & management
- `profile.js`: User profile management
- `monitoring.js`: Real-time metrics display
- `file-viewer.js`: Document preview (DOC, XLS, ZIP support)
- `ui.js`: Toast notifications, theme toggle, UI helpers

---

## Technology Stack

### Backend
- **Framework**: Flask 2.x
- **Database**: PostgreSQL / SQLite (SQLAlchemy ORM)
- **Cache/Queue**: Redis
- **Authentication**: Flask-JWT-Extended (JWT + blocklist)
- **Real-time**: Flask-SocketIO (WebSocket)
- **Encryption**: `cryptography` library (AES-256-GCM, RSA-2048-OAEP)
- **Rate Limiting**: Flask-Limiter
- **CORS**: Flask-CORS

### Frontend
- **Architecture**: Vanilla JavaScript (no framework)
- **Encryption**: Argon2id (WASM), TweetNaCl.js or similar
- **HTTP**: Fetch API
- **Document Preview**: 
  - Mammoth.js (Word documents)
  - XLSX.js (Excel spreadsheets)
  - fflate (ZIP archives)

---

## Key Features

### Security
✅ End-to-end encryption (AES-256-GCM)  
✅ Public key infrastructure (RSA-2048-OAEP)  
✅ Key derivation (Argon2id)  
✅ JWT with Redis blocklist  
✅ Two-factor authentication (OTP via email)  
✅ Per-recipient key wrapping for shares  
✅ Audit logging  

### Monitoring
✅ Real-time metrics collection  
✅ Error tracking & alerting  
✅ WebSocket event streaming  
✅ Health check endpoints  

### File Management
✅ Secure upload/download  
✅ File sharing with expiration  
✅ Document preview (Word, Excel, ZIP)  
✅ Encryption key versioning  

---

## Environment Configuration

**Backend** (`.env`)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `SECRET_KEY`: JWT signing key
- `JWT_SECRET_KEY`: JWT secret
- `EMAIL_*`: SMTP configuration
- `CORS_ORIGINS`: Allowed CORS origins

**Frontend**
- No `.env` needed (configuration via API at runtime)

---

## Testing

**Backend Test Files**
- `tests/`: Official test suite
- Root-level test files: Integration & scenario tests
  - `test_complete_flow.py`: End-to-end flow
  - `test_real_encryption.py`: Encryption validation
  - `test_decryption.py`: Decryption validation
  - `test_otp_console.py`: OTP testing
  - `test_websocket.py`: WebSocket testing

**Frontend Testing**
- Manual browser testing via `index.html`
- No automated test suite currently

---

## Deployment

**Backend**
```bash
pip install -r requirements.txt
export FLASK_ENV=production
flask run --host 0.0.0.0 --port 5000
```

**Frontend**
```bash
# Serve static files from any HTTP server
# Example with Python:
python -m http.server 8000
```

---

## Known Issues & Notes

- Backend monitoring directory has typo: `_init__.py` should be `__init__.py`
- Frontend uses CDN for dependencies (Argon2, Mammoth, XLSX, fflate)
- No build system for frontend (uses vanilla JS modules)
- Database migrations not included (manual schema setup required)

---

**Generated**: May 1, 2026  
**Project**: VaultSync v4.1 (Secure File Transfer)
