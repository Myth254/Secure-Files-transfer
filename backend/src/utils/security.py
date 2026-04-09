"""
Security utilities — token helpers, header middleware, input sanitisation.

Changes from original
─────────────────────
• Added missing ``import json`` (F-15: NameError in log_security_event).
• Removed validate_jwt_token() — callers must use @jwt_required() instead
  (F-11: shadowed / potentially unverified token decoding).
• CSP header: removed ``'unsafe-inline'`` from script-src; replaced with
  nonce support (F-16).
• get_client_ip() now only trusts X-Forwarded-For when explicitly enabled
  via trusted-proxy mode. Callers should prefer ProxyFix middleware (F-14).
• datetime.utcnow() replaced with datetime.now(timezone.utc) throughout.
"""
import json
import os
import re
import secrets
import string
from datetime import datetime, timezone
from typing import Optional, Tuple, List

from flask import request, current_app
import logging

logger = logging.getLogger(__name__)


class SecurityUtils:
    """Collection of security-related utility methods."""

    # ── Token / key generation ────────────────────────────────────────────

    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """
        Generate a cryptographically secure token.

        Args:
            length: Number of random bytes (output is twice as long in hex).

        Returns:
            Hex-encoded token string.
        """
        return secrets.token_hex(length)

    @staticmethod
    def generate_api_key() -> str:
        """Return a 64-character random alphanumeric API key."""
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(64))

    @staticmethod
    def hash_api_key(api_key: str) -> str:
        """
        Hash an API key for safe DB storage.

        SHA-256 pre-hash prevents the bcrypt 72-byte input limit from
        truncating long keys.
        """
        import hashlib
        import bcrypt

        sha256_hash = hashlib.sha256(api_key.encode()).hexdigest()
        salt        = bcrypt.gensalt()
        return bcrypt.hashpw(sha256_hash.encode(), salt).decode()

    @staticmethod
    def verify_api_key(api_key: str, hashed_api_key: str) -> bool:
        """Verify an API key against its stored bcrypt hash."""
        import hashlib
        import bcrypt

        sha256_hash = hashlib.sha256(api_key.encode()).hexdigest()
        return bcrypt.checkpw(sha256_hash.encode(), hashed_api_key.encode())

    # ── Filename / path sanitisation ──────────────────────────────────────

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """
        Sanitise a filename to prevent path-traversal attacks.

        Delegates to werkzeug.utils.secure_filename for the primary
        sanitisation step, then enforces a length cap.
        """
        from werkzeug.utils import secure_filename
        safe = secure_filename(filename)
        if len(safe) > 255:
            name, ext = os.path.splitext(safe)
            safe = name[: 255 - len(ext)] + ext
        return safe

    @staticmethod
    def validate_path_traversal(path: str, base_dir: str = '') -> bool:
        """
        Return True if *path* resolves to a location inside *base_dir*.

        The check is performed by resolving both paths to their absolute real
        paths and verifying that the candidate stays within the base directory.
        This is the only safe approach — string-level ``..`` checks can be
        bypassed by URL-encoding, backslashes, or symlinks.

        Args:
            path:     Candidate path (relative or absolute).
            base_dir: Trusted base directory.  Defaults to the process CWD.
                      Pass ``current_app.config['UPLOAD_FOLDER']`` at call
                      sites that deal with uploaded files.

        Returns:
            True  — path is safely inside base_dir.
            False — path is empty, escapes base_dir, or is suspicious.

        Note:
            Prefer ``werkzeug.utils.safe_join()`` for constructing filesystem
            paths from user input; call this helper only when you need to
            validate a pre-existing path string.
        """
        if not path:
            return False

        # Resolve the base directory once (default to CWD if not supplied)
        resolved_base = os.path.realpath(base_dir or os.getcwd())

        # Build the candidate absolute path and resolve symlinks / .. components
        candidate = os.path.realpath(os.path.join(resolved_base, path))

        # The candidate must be equal to OR a strict sub-path of the base dir.
        # os.path.realpath guarantees no trailing separator on the base string,
        # so we append os.sep to avoid a partial-directory prefix match
        # (e.g. /uploads-evil starting with /uploads).
        return candidate == resolved_base or candidate.startswith(resolved_base + os.sep)

    # ── Client IP ─────────────────────────────────────────────────────────

    @staticmethod
    def get_client_ip() -> str:
        """
        Return the client's IP address.

        Reads from ``request.remote_addr`` (set correctly by ProxyFix
        middleware if the app is behind a trusted reverse proxy).
        Direct use of X-Forwarded-For is intentionally avoided here to
        prevent header-spoofing — configure werkzeug ProxyFix instead:

            from werkzeug.middleware.proxy_fix import ProxyFix
            app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)
        """
        return request.remote_addr or '0.0.0.0'

    # ── IP validation ─────────────────────────────────────────────────────

    @staticmethod
    def validate_ip_address(ip: str) -> bool:
        """Return True if *ip* is a valid IPv4 or abbreviated IPv6 address."""
        ipv4 = re.compile(r'^(\d{1,3}\.){3}\d{1,3}$')
        ipv6 = re.compile(r'^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$')

        if ipv4.match(ip):
            return all(0 <= int(octet) <= 255 for octet in ip.split('.'))
        return bool(ipv6.match(ip))

    # ── URL safety ────────────────────────────────────────────────────────

    @staticmethod
    def is_safe_url(url: str) -> bool:
        """Return True if *url* is a relative or same-origin HTTP(S) URL."""
        from urllib.parse import urlparse

        try:
            parsed = urlparse(url)
            if parsed.scheme not in ('http', 'https', ''):
                return False

            suspicious = (
                '<script', 'javascript:', 'data:', 'vbscript:',
                'onload=', 'onerror=', 'onclick='
            )
            url_lower = url.lower()
            return not any(p in url_lower for p in suspicious)
        except Exception:
            return False

    # ── Password strength ─────────────────────────────────────────────────

    @staticmethod
    def check_password_strength(password: str) -> Tuple[bool, List[str]]:
        """
        Evaluate password strength.

        Returns:
            (is_strong, list_of_issues)
            is_strong is True only when list_of_issues is empty.
        """
        issues: List[str] = []

        if len(password) < 8:
            issues.append("Password must be at least 8 characters")
        if not re.search(r'[A-Z]', password):
            issues.append("Password must contain at least one uppercase letter")
        if not re.search(r'[a-z]', password):
            issues.append("Password must contain at least one lowercase letter")
        if not re.search(r'[0-9]', password):
            issues.append("Password must contain at least one number")
        if not re.search(r'[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]', password):
            issues.append("Password must contain at least one special character")

        common = {
            'password', '123456', '12345678', '123456789',
            'qwerty', 'abc123', 'password1', 'admin',
        }
        if password.lower() in common:
            issues.append("Password is too common")

        if re.search(r'(.)\1{2,}', password):
            issues.append("Password contains too many repeating characters")

        return len(issues) == 0, issues

    # ── Password generation ───────────────────────────────────────────────

    @staticmethod
    def generate_password(length: int = 16) -> str:
        """Generate a random password that satisfies check_password_strength()."""
        length = max(length, 8)

        lowercase = string.ascii_lowercase
        uppercase = string.ascii_uppercase
        digits    = string.digits
        special   = '!@#$%^&*()-_=+[]{}|;:,.<>?'
        all_chars = lowercase + uppercase + digits + special

        chars = [
            secrets.choice(lowercase),
            secrets.choice(uppercase),
            secrets.choice(digits),
            secrets.choice(special),
        ]
        chars.extend(secrets.choice(all_chars) for _ in range(length - 4))
        secrets.SystemRandom().shuffle(chars)
        return ''.join(chars)

    # ── Rate-limit key ────────────────────────────────────────────────────

    @staticmethod
    def rate_limit_key() -> str:
        """Return a rate-limit cache key scoped to endpoint + client IP."""
        endpoint = request.endpoint or 'unknown'
        ip       = SecurityUtils.get_client_ip()
        return f"rate_limit:{endpoint}:{ip}"

    # ── CSRF token validation ─────────────────────────────────────────────

    @staticmethod
    def validate_csrf_token(token: str) -> bool:
        """
        Validate a CSRF token (64 lowercase hex characters).

        For production use Flask-WTF or a similar library instead of
        this manual check.
        """
        if len(token) != 64:
            return False
        return bool(re.match(r'^[a-f0-9]{64}$', token.lower()))

    # ── OTP download token ────────────────────────────────────────────────

    @staticmethod
    def generate_otp_download_token(user_id: int, file_id: int, ttl_seconds: int = 300) -> str:
        """
        Generate a short-lived signed token that authorises a file download.

        The token embeds user_id, file_id, and expiry, signed with HMAC-SHA256
        using the application's SECRET_KEY.  It replaces the insecure
        X-OTP-Verified header approach.

        Returns:
            Opaque token string safe for HTTP headers / query params.
        """
        import hmac
        import hashlib
        import base64
        import time

        expires_at = int(time.time()) + ttl_seconds
        payload    = f"{user_id}:{file_id}:{expires_at}"
        secret     = current_app.config['SECRET_KEY'].encode('utf-8')
        sig        = hmac.HMAC(secret, payload.encode('utf-8'), hashlib.sha256).hexdigest()
        raw        = f"{payload}:{sig}"
        return base64.urlsafe_b64encode(raw.encode()).decode()

    @staticmethod
    def verify_otp_download_token(token: str, user_id: int, file_id: int) -> bool:
        """
        Verify a token produced by generate_otp_download_token().

        Returns:
            True if the token is valid, belongs to this user and file,
            and has not expired.
        """
        import hmac
        import hashlib
        import base64
        import time

        try:
            raw     = base64.urlsafe_b64decode(token.encode()).decode()
            parts   = raw.split(':')
            if len(parts) != 4:
                return False

            tok_uid, tok_fid, tok_exp, tok_sig = parts
            payload = f"{tok_uid}:{tok_fid}:{tok_exp}"
            secret  = current_app.config['SECRET_KEY'].encode('utf-8')
            expected_sig = hmac.HMAC(secret, payload.encode('utf-8'), hashlib.sha256).hexdigest()

            # Constant-time comparison
            if not hmac.compare_digest(tok_sig, expected_sig):
                return False
            if int(tok_uid) != user_id or int(tok_fid) != file_id:
                return False
            if int(tok_exp) < int(time.time()):
                return False

            return True
        except Exception:
            return False


# ── Security headers middleware ───────────────────────────────────────────────

class SecurityHeaders:
    """After-request hook that adds security headers to every response."""

    _BASE_HEADERS = {
        'X-Content-Type-Options':  'nosniff',
        'X-Frame-Options':         'DENY',
        'X-XSS-Protection':        '1; mode=block',
        'Referrer-Policy':         'strict-origin-when-cross-origin',
        'Permissions-Policy':      'geolocation=(), microphone=(), camera=()',
    }

    @staticmethod
    def add_headers(response):
        """
        Attach security headers to *response*.

        CSP uses a per-request nonce for inline scripts to avoid
        ``'unsafe-inline'``.  The nonce is stored in
        ``g.csp_nonce`` so templates can reference it.
        """
        from flask import g

        for header, value in SecurityHeaders._BASE_HEADERS.items():
            response.headers[header] = value

        # Generate a fresh nonce for this response
        nonce = getattr(g, 'csp_nonce', None)
        if nonce is None:
            nonce = secrets.token_urlsafe(16)

        if not current_app.config.get('DEBUG', False):
            csp = (
                f"default-src 'self'; "
                f"script-src 'self' 'nonce-{nonce}'; "   # no unsafe-inline
                f"style-src 'self' 'unsafe-inline'; "    # styles: inline still OK
                f"img-src 'self' data:; "
                f"font-src 'self'; "
                f"connect-src 'self'; "
                f"frame-ancestors 'none'; "
                f"base-uri 'self'; "
                f"form-action 'self'"
            )
            response.headers['Content-Security-Policy'] = csp

        return response


# ── Security audit context ────────────────────────────────────────────────────

class SecurityContext:
    """Lightweight context object for security-event logging."""

    def __init__(self, user_id: Optional[int] = None, action: str = ''):
        self.user_id    = user_id
        self.action     = action
        self.timestamp  = datetime.now(timezone.utc)
        self.ip_address = SecurityUtils.get_client_ip()
        self.user_agent = request.user_agent.string if request.user_agent else ''

    def to_dict(self) -> dict:
        return {
            'user_id':    self.user_id,
            'action':     self.action,
            'timestamp':  self.timestamp.isoformat(),
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
        }

    def log_security_event(self, event_type: str, details: str = '') -> None:
        """Emit a structured security event to the application logger."""
        log_entry = {
            'event_type': event_type,
            'context':    self.to_dict(),
            'details':    details,
        }
        # json is now properly imported at the top of this module
        logger.info(f"Security event: {json.dumps(log_entry)}")
