from src.extensions import db
from datetime import datetime, timezone


def _now():
    return datetime.now(timezone.utc)


class Log(db.Model):
    __tablename__ = 'logs'

    id         = db.Column(db.Integer,     primary_key=True)
    user_id    = db.Column(db.Integer,     db.ForeignKey('users.id'), nullable=True, index=True)
    action     = db.Column(db.String(100), nullable=False, index=True)
    details    = db.Column(db.Text,        nullable=True)
    ip_address = db.Column(db.String(45),  nullable=True)
    user_agent = db.Column(db.Text,        nullable=True)
    timestamp  = db.Column(db.DateTime,    default=_now, index=True)