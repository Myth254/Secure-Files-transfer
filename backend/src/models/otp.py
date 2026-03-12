from src.extensions import db
from datetime import datetime, timezone


def _now():
    return datetime.now(timezone.utc)


class OTPCode(db.Model):
    __tablename__ = 'otp_codes'

    id     = db.Column(db.Integer,     primary_key=True)
    user_id = db.Column(db.Integer,    db.ForeignKey('users.id'), nullable=False, index=True)
    email  = db.Column(db.String(120), nullable=False)

    # SHA-256 hex digest of the OTP — NEVER store the plaintext code.
    # A DB read would otherwise expose valid codes to anyone with SELECT.
    # OTPService must hash before storing and hash again before comparing.
    otp_code_hash = db.Column(db.String(64), nullable=False)

    # login | file_download | file_share | delete_file | change_password | verify_email
    purpose          = db.Column(db.String(50), nullable=False)
    file_id          = db.Column(db.Integer,    db.ForeignKey('files.id'),          nullable=True)
    share_request_id = db.Column(db.Integer,    db.ForeignKey('share_requests.id'), nullable=True)

    is_used    = db.Column(db.Boolean,  default=False)
    attempts   = db.Column(db.Integer,  default=0)
    created_at = db.Column(db.DateTime, default=_now)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)

    user          = db.relationship('User',         backref='otp_codes')
    file          = db.relationship('File',         backref='otp_codes')
    share_request = db.relationship('ShareRequest', backref='otp_codes')

    def to_dict(self):
        """Safe metadata only — never exposes the code or its hash."""
        return {
            'id':         self.id,
            'user_id':    self.user_id,
            'email':      self.email,
            'purpose':    self.purpose,
            'is_used':    self.is_used,
            'attempts':   self.attempts,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
        }


class OTPLog(db.Model):
    __tablename__ = 'otp_logs'

    id         = db.Column(db.Integer,     primary_key=True)
    user_id    = db.Column(db.Integer,     db.ForeignKey('users.id'),    nullable=True)
    email      = db.Column(db.String(120), nullable=False)
    otp_id     = db.Column(db.Integer,     db.ForeignKey('otp_codes.id'), nullable=True)
    action     = db.Column(db.String(50),  nullable=False)   # generate | verify | resend
    purpose    = db.Column(db.String(50),  nullable=False)
    status     = db.Column(db.String(20),  nullable=False)   # success | failed | expired | max_attempts
    ip_address = db.Column(db.String(45),  nullable=True)
    user_agent = db.Column(db.Text,        nullable=True)
    details    = db.Column(db.Text,        nullable=True)
    created_at = db.Column(db.DateTime,    default=_now, index=True)

    user = db.relationship('User',    backref='otp_logs')
    otp  = db.relationship('OTPCode', backref='logs')