from src.extensions import db
from datetime import datetime, timezone


def _now():
    return datetime.now(timezone.utc)


class ShareRequest(db.Model):
    __tablename__ = 'share_requests'

    id           = db.Column(db.Integer,     primary_key=True)
    file_id      = db.Column(db.Integer,     db.ForeignKey('files.id'),  nullable=False)
    owner_id     = db.Column(db.Integer,     db.ForeignKey('users.id'),  nullable=False, index=True)
    recipient_id = db.Column(db.Integer,     db.ForeignKey('users.id'),  nullable=False, index=True)

    can_view     = db.Column(db.Boolean,     default=True)
    can_download = db.Column(db.Boolean,     default=True)
    can_reshare  = db.Column(db.Boolean,     default=False)

    # pending | accepted | rejected | revoked
    status = db.Column(db.String(20), default='pending', nullable=False)

    # AES key re-encrypted with the *recipient's* RSA public key (raw bytes).
    # Was Text — changed to LargeBinary so it stores bytes consistently with
    # EncryptionService output and avoids the hex-mismatch on decryption.
    encrypted_aes_key = db.Column(db.LargeBinary, nullable=True)

    requested_at = db.Column(db.DateTime, default=_now)
    responded_at = db.Column(db.DateTime, nullable=True)
    expires_at   = db.Column(db.DateTime, nullable=True)

    file      = db.relationship('File', backref='share_requests',                  lazy=True)
    owner     = db.relationship('User', foreign_keys=[owner_id],     backref='sent_shares')
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref='received_shares')

    def to_dict(self):
        return {
            'id':           self.id,
            'file_id':      self.file_id,
            'owner_id':     self.owner_id,
            'recipient_id': self.recipient_id,
            'permissions': {
                'can_view':     self.can_view,
                'can_download': self.can_download,
                'can_reshare':  self.can_reshare,
            },
            'status':       self.status,
            'requested_at': self.requested_at.isoformat() if self.requested_at else None,
            'responded_at': self.responded_at.isoformat() if self.responded_at else None,
            'expires_at':   self.expires_at.isoformat()   if self.expires_at   else None,
        }


class SharedAccess(db.Model):
    __tablename__ = 'shared_access'

    id               = db.Column(db.Integer, primary_key=True)
    share_request_id = db.Column(db.Integer, db.ForeignKey('share_requests.id'), nullable=False)
    file_id          = db.Column(db.Integer, db.ForeignKey('files.id'),          nullable=False, index=True)
    recipient_id     = db.Column(db.Integer, db.ForeignKey('users.id'),          nullable=False, index=True)

    can_view     = db.Column(db.Boolean, default=True)
    can_download = db.Column(db.Boolean, default=True)
    can_reshare  = db.Column(db.Boolean, default=False)

    view_count     = db.Column(db.Integer,  default=0)
    download_count = db.Column(db.Integer,  default=0)
    last_accessed  = db.Column(db.DateTime, nullable=True)

    granted_at = db.Column(db.DateTime, default=_now)
    revoked_at = db.Column(db.DateTime, nullable=True)

    share_request = db.relationship('ShareRequest', backref='access_records', lazy=True)
    file          = db.relationship('File',         backref='shared_access',  lazy=True)
    recipient     = db.relationship('User', foreign_keys=[recipient_id], backref='accessible_files')

    def to_dict(self):
        return {
            'id':           self.id,
            'file_id':      self.file_id,
            'recipient_id': self.recipient_id,
            'permissions': {
                'can_view':     self.can_view,
                'can_download': self.can_download,
                'can_reshare':  self.can_reshare,
            },
            'usage': {
                'view_count':     self.view_count,
                'download_count': self.download_count,
                'last_accessed':  self.last_accessed.isoformat() if self.last_accessed else None,
            },
            'granted_at': self.granted_at.isoformat() if self.granted_at else None,
            'revoked_at': self.revoked_at.isoformat() if self.revoked_at else None,
        }


class ShareLog(db.Model):
    __tablename__ = 'share_logs'

    id               = db.Column(db.Integer,    primary_key=True)
    share_request_id = db.Column(db.Integer,    db.ForeignKey('share_requests.id'), nullable=False)
    user_id          = db.Column(db.Integer,    db.ForeignKey('users.id'),          nullable=False)
    action           = db.Column(db.String(20), nullable=False)
    details          = db.Column(db.Text,       nullable=True)
    timestamp        = db.Column(db.DateTime,   default=_now, index=True)

    share_request = db.relationship('ShareRequest', backref='logs',             lazy=True)
    user          = db.relationship('User',          backref='share_activities', lazy=True)