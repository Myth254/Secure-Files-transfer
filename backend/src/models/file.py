from src.extensions import db
from datetime import datetime

class File(db.Model):
    __tablename__ = 'files'
    
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)
    original_size = db.Column(db.Integer, nullable=False)  # Original file size in bytes
    encrypted_file = db.Column(db.LargeBinary, nullable=False)
    encrypted_aes_key = db.Column(db.Text, nullable=False)
    file_hash = db.Column(db.String(64), nullable=True)  # SHA-256 of original file
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'original_size': self.original_size,
            'upload_date': self.upload_date.isoformat(),
            'encrypted_size': len(self.encrypted_file)
        }