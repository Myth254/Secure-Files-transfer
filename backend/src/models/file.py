from src.extensions import db
from datetime import datetime, timezone


def _now():
    return datetime.now(timezone.utc)


class File(db.Model):
    __tablename__ = 'files'

    id                = db.Column(db.Integer,     primary_key=True)
    owner_id          = db.Column(db.Integer,     db.ForeignKey('users.id'), nullable=False, index=True)
    filename          = db.Column(db.String(255), nullable=False)
    original_size     = db.Column(db.Integer,     nullable=False)
    encrypted_file    = db.Column(db.LargeBinary, nullable=False)
    # LargeBinary (was Text) — stores the RSA-OAEP-wrapped AES key as raw bytes.
    # Previously Text caused a type mismatch: encryption_service returns bytes,
    # but Text expects a str.  All callers must use .hex() when serialising to JSON.
    encrypted_aes_key = db.Column(db.LargeBinary, nullable=False)
    file_hash         = db.Column(db.String(64),  nullable=True, index=True)
    upload_date       = db.Column(db.DateTime,    default=_now,  index=True)

    def to_dict(self):
        return {
            'id':             self.id,
            'filename':       self.filename,
            'original_size':  self.original_size,
            'upload_date':    self.upload_date.isoformat() if self.upload_date else None,
            'encrypted_size': len(self.encrypted_file) if self.encrypted_file else 0,
        }