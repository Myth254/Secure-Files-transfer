from src.extensions import db
from datetime import datetime, timezone


def _now():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = 'users'

    id                        = db.Column(db.Integer,     primary_key=True)
    username                  = db.Column(db.String(50),  unique=True, nullable=False, index=True)
    email                     = db.Column(db.String(100), unique=True, nullable=False, index=True)
    password_hash             = db.Column(db.String(255), nullable=False)
    rsa_public_key            = db.Column(db.Text,        nullable=False)
    # Stores: <salt_hex>:<iv_hex>:<ciphertext_hex>:<tag_hex>  (Argon2id + AES-256-GCM)
    rsa_private_key_encrypted = db.Column(db.Text,        nullable=False)
    is_active                 = db.Column(db.Boolean,     default=True)
    created_at                = db.Column(db.DateTime,    default=_now)
    updated_at                = db.Column(db.DateTime,    default=_now, onupdate=_now)

    # Relationships
    files = db.relationship('File', backref='owner', lazy=True, cascade='all, delete-orphan')
    logs  = db.relationship('Log',  backref='user',  lazy=True, passive_deletes=True)

    def to_dict(self):
        return {
            'id':         self.id,
            'username':   self.username,
            'email':      self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active':  self.is_active,
        }