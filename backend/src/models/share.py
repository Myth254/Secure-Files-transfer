"""
Share Models for File Sharing Functionality
"""
from src.extensions import db
from datetime import datetime

class ShareRequest(db.Model):
    """Track file sharing requests between users"""
    __tablename__ = 'share_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Sharing info
    file_id = db.Column(db.Integer, db.ForeignKey('files.id'), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Sharing permissions
    can_view = db.Column(db.Boolean, default=True)
    can_download = db.Column(db.Boolean, default=True)
    can_reshare = db.Column(db.Boolean, default=False)
    
    # Status
    status = db.Column(db.String(20), default='pending')  # pending, accepted, rejected, revoked
    encrypted_aes_key = db.Column(db.Text)  # AES key encrypted with recipient's public key
    
    # Timestamps
    requested_at = db.Column(db.DateTime, default=datetime.utcnow)
    responded_at = db.Column(db.DateTime, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    file = db.relationship('File', backref='share_requests', lazy=True)
    owner = db.relationship('User', foreign_keys=[owner_id], backref='sent_shares')
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref='received_shares')
    
    def to_dict(self):
        return {
            'id': self.id,
            'file_id': self.file_id,
            'owner_id': self.owner_id,
            'recipient_id': self.recipient_id,
            'permissions': {
                'can_view': self.can_view,
                'can_download': self.can_download,
                'can_reshare': self.can_reshare
            },
            'status': self.status,
            'requested_at': self.requested_at.isoformat() if self.requested_at else None,
            'responded_at': self.responded_at.isoformat() if self.responded_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }

class SharedAccess(db.Model):
    """Track actual shared file access"""
    __tablename__ = 'shared_access'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Access info
    share_request_id = db.Column(db.Integer, db.ForeignKey('share_requests.id'), nullable=False)
    file_id = db.Column(db.Integer, db.ForeignKey('files.id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Access permissions
    can_view = db.Column(db.Boolean, default=True)
    can_download = db.Column(db.Boolean, default=True)
    can_reshare = db.Column(db.Boolean, default=False)
    
    # Usage tracking
    view_count = db.Column(db.Integer, default=0)
    download_count = db.Column(db.Integer, default=0)
    last_accessed = db.Column(db.DateTime, nullable=True)
    
    # Timestamps
    granted_at = db.Column(db.DateTime, default=datetime.utcnow)
    revoked_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    share_request = db.relationship('ShareRequest', backref='access_records', lazy=True)
    file = db.relationship('File', backref='shared_access', lazy=True)
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref='accessible_files')
    
    def to_dict(self):
        return {
            'id': self.id,
            'file_id': self.file_id,
            'recipient_id': self.recipient_id,
            'permissions': {
                'can_view': self.can_view,
                'can_download': self.can_download,
                'can_reshare': self.can_reshare
            },
            'usage': {
                'view_count': self.view_count,
                'download_count': self.download_count,
                'last_accessed': self.last_accessed.isoformat() if self.last_accessed else None
            },
            'granted_at': self.granted_at.isoformat() if self.granted_at else None,
            'revoked_at': self.revoked_at.isoformat() if self.revoked_at else None
        }

class ShareLog(db.Model):
    """Log sharing activities"""
    __tablename__ = 'share_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Activity info
    share_request_id = db.Column(db.Integer, db.ForeignKey('share_requests.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(20), nullable=False)  # view, download, reshare, revoke, accept, reject
    details = db.Column(db.Text)
    
    # Timestamp
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    share_request = db.relationship('ShareRequest', backref='logs', lazy=True)
    user = db.relationship('User', backref='share_activities', lazy=True)