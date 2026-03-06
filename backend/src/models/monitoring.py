"""
Monitoring Models for Real-time System Monitoring
"""
from src.extensions import db
from datetime import datetime
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy import Index, text

class SystemMetric(db.Model):
    """System performance metrics"""
    __tablename__ = 'system_metrics'
    
    id = db.Column(db.Integer, primary_key=True)
    metric_type = db.Column(db.String(50), nullable=False, index=True)
    metric_name = db.Column(db.String(100), nullable=False)
    metric_value = db.Column(db.Float, nullable=False)
    metric_unit = db.Column(db.String(20))
    tags = db.Column(JSON)
    hostname = db.Column(db.String(255))
    environment = db.Column(db.String(50))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    __table_args__ = (
        Index('ix_metric_type_name_time', 'metric_type', 'metric_name', 'timestamp'),
        Index('ix_hostname_time', 'hostname', 'timestamp'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'type': self.metric_type,
            'name': self.metric_name,
            'value': self.metric_value,
            'unit': self.metric_unit,
            'tags': self.tags,
            'hostname': self.hostname,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }


class AlertRule(db.Model):
    """Alert rules and configurations"""
    __tablename__ = 'alert_rules'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text)
    metric_type = db.Column(db.String(50), nullable=False)
    metric_name = db.Column(db.String(100), nullable=False)
    alert_condition = db.Column(db.String(20), nullable=False)  # gt, lt, eq, gte, lte, ne, between
    threshold_value = db.Column(db.Float)
    threshold_max = db.Column(db.Float)  # For 'between' condition
    severity = db.Column(db.String(20), nullable=False, default='warning')
    duration_seconds = db.Column(db.Integer, default=0)
    cooldown_seconds = db.Column(db.Integer, default=300)
    enabled = db.Column(db.Boolean, default=True)
    
    # Notification settings
    notify_email = db.Column(db.Boolean, default=False)
    notify_slack = db.Column(db.Boolean, default=False)
    notify_discord = db.Column(db.Boolean, default=False)
    notify_sms = db.Column(db.Boolean, default=False)
    notify_webhook = db.Column(db.Boolean, default=False)
    webhook_url = db.Column(db.String(500))
    
    # Escalation
    escalation_level = db.Column(db.Integer, default=0)
    escalation_interval = db.Column(db.Integer, default=300)
    
    # Metadata
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    history = db.relationship('AlertHistory', backref='rule', lazy='dynamic', cascade='all, delete-orphan')
    creator = db.relationship('User', foreign_keys=[created_by])
    
    __table_args__ = (
        Index('ix_alert_metric', 'metric_type', 'metric_name'),
        Index('ix_alert_enabled', 'enabled'),
        Index('ix_alert_severity', 'severity'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'metric_type': self.metric_type,
            'metric_name': self.metric_name,
            'condition': self.alert_condition,
            'threshold': self.threshold_value,
            'threshold_max': self.threshold_max,
            'severity': self.severity,
            'duration': self.duration_seconds,
            'cooldown': self.cooldown_seconds,
            'enabled': self.enabled,
            'notifications': {
                'email': self.notify_email,
                'slack': self.notify_slack,
                'discord': self.notify_discord,
                'sms': self.notify_sms,
                'webhook': self.notify_webhook,
                'webhook_url': self.webhook_url
            },
            'escalation': {
                'level': self.escalation_level,
                'interval': self.escalation_interval
            },
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class AlertHistory(db.Model):
    """Historical alert occurrences"""
    __tablename__ = 'alert_history'
    
    id = db.Column(db.Integer, primary_key=True)
    rule_id = db.Column(db.Integer, db.ForeignKey('alert_rules.id'), nullable=False)
    metric_value = db.Column(db.Float, nullable=False)
    message = db.Column(db.Text)
    severity = db.Column(db.String(20))
    
    # Status tracking
    status = db.Column(db.String(20), default='firing')  # firing, resolved, acknowledged, silenced
    acknowledged_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    acknowledged_at = db.Column(db.DateTime)
    resolved_at = db.Column(db.DateTime)
    
    # Notification tracking
    email_sent = db.Column(db.Boolean, default=False)
    slack_sent = db.Column(db.Boolean, default=False)
    sms_sent = db.Column(db.Boolean, default=False)
    webhook_sent = db.Column(db.Boolean, default=False)
    
    # Additional data
    tags = db.Column(JSON)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    acknowledged_user = db.relationship('User', foreign_keys=[acknowledged_by])
    
    __table_args__ = (
        Index('ix_alert_history_status', 'status'),
        Index('ix_alert_history_created', 'created_at'),
        Index('ix_alert_history_rule', 'rule_id', 'created_at'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'rule_id': self.rule_id,
            'rule_name': self.rule.name if self.rule else None,
            'metric_value': self.metric_value,
            'message': self.message,
            'severity': self.severity,
            'status': self.status,
            'acknowledged_by': self.acknowledged_user.username if self.acknowledged_user else None,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'notifications': {
                'email': self.email_sent,
                'slack': self.slack_sent,
                'sms': self.sms_sent,
                'webhook': self.webhook_sent
            },
            'tags': self.tags,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class UserSession(db.Model):
    """Active user sessions for real-time monitoring"""
    __tablename__ = 'user_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    session_id = db.Column(db.String(100), unique=True, nullable=False)
    socket_id = db.Column(db.String(100), unique=True, nullable=True)
    
    # Client info
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    device_type = db.Column(db.String(50))
    browser = db.Column(db.String(50))
    os = db.Column(db.String(50))
    country = db.Column(db.String(2))
    city = db.Column(db.String(100))
    
    # Session timing
    login_time = db.Column(db.DateTime, default=datetime.utcnow)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = db.Column(db.DateTime)
    
    # Session data
    is_active = db.Column(db.Boolean, default=True)
    auth_method = db.Column(db.String(20))
    login_attempts = db.Column(db.Integer, default=0)
    
    # Relationships
    user = db.relationship('User', backref='sessions')
    
    __table_args__ = (
        Index('ix_user_sessions_user', 'user_id'),
        Index('ix_user_sessions_session', 'session_id'),
        Index('ix_user_sessions_socket', 'socket_id'),
        Index('ix_user_sessions_active', 'is_active'),
        Index('ix_user_sessions_activity', 'last_activity'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'session_id': self.session_id,
            'socket_id': self.socket_id,
            'client': {
                'ip': self.ip_address,
                'device': self.device_type,
                'browser': self.browser,
                'os': self.os,
                'country': self.country,
                'city': self.city
            },
            'login_time': self.login_time.isoformat() if self.login_time else None,
            'last_activity': self.last_activity.isoformat() if self.last_activity else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_active': self.is_active,
            'auth_method': self.auth_method
        }


class ApiRequestLog(db.Model):
    """Detailed API request logging for monitoring"""
    __tablename__ = 'api_request_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.String(36), nullable=False, unique=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # Request info
    method = db.Column(db.String(10), nullable=False)
    endpoint = db.Column(db.String(500), nullable=False)
    query_params = db.Column(db.Text)
    request_headers = db.Column(JSON)
    request_body_size = db.Column(db.Integer)
    
    # Response info
    status_code = db.Column(db.Integer, nullable=False)
    response_headers = db.Column(JSON)
    response_body_size = db.Column(db.Integer)
    response_time = db.Column(db.Float, nullable=False)  # milliseconds
    
    # Performance
    db_query_count = db.Column(db.Integer, default=0)
    db_query_time = db.Column(db.Float, default=0)
    redis_operations = db.Column(db.Integer, default=0)
    
    # Client info
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    referer = db.Column(db.String(500))
    
    # Tracing
    trace_id = db.Column(db.String(36))
    span_id = db.Column(db.String(36))
    parent_span_id = db.Column(db.String(36))
    
    # Timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = db.relationship('User', backref='api_logs')
    
    __table_args__ = (
        Index('ix_api_logs_request', 'request_id'),
        Index('ix_api_logs_user_time', 'user_id', 'created_at'),
        Index('ix_api_logs_endpoint', 'endpoint'),
        Index('ix_api_logs_status', 'status_code'),
        Index('ix_api_logs_time', 'response_time'),
        Index('ix_api_logs_trace', 'trace_id'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'request_id': self.request_id,
            'user_id': self.user_id,
            'method': self.method,
            'endpoint': self.endpoint,
            'status_code': self.status_code,
            'response_time': self.response_time,
            'db_query_count': self.db_query_count,
            'db_query_time': self.db_query_time,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class DashboardConfig(db.Model):
    """User dashboard configurations"""
    __tablename__ = 'dashboard_configs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    name = db.Column(db.String(100), default='Default Dashboard')
    
    # Layout configuration
    layout = db.Column(JSON, nullable=False)
    widgets = db.Column(JSON, nullable=False)
    time_range = db.Column(db.String(20), default='last_1h')
    refresh_interval = db.Column(db.Integer, default=30)
    
    # Visual settings
    theme = db.Column(db.String(20), default='light')
    color_scheme = db.Column(JSON)
    
    # Preferences
    default_dashboard = db.Column(db.Boolean, default=False)
    shared_with = db.Column(JSON)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='dashboard_config')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'layout': self.layout,
            'widgets': self.widgets,
            'time_range': self.time_range,
            'refresh_interval': self.refresh_interval,
            'theme': self.theme,
            'color_scheme': self.color_scheme,
            'default': self.default_dashboard,
            'shared_with': self.shared_with,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class ScheduledReport(db.Model):
    """Scheduled monitoring reports"""
    __tablename__ = 'scheduled_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    
    # Schedule configuration
    report_type = db.Column(db.String(20), nullable=False)  # daily, weekly, monthly, custom
    cron_expression = db.Column(db.String(100))
    timezone = db.Column(db.String(50), default='UTC')
    
    # Content configuration
    metrics = db.Column(JSON, nullable=False)
    dashboards = db.Column(JSON)
    format = db.Column(db.String(20), default='pdf')
    
    # Delivery
    recipients = db.Column(JSON, nullable=False)
    subject_template = db.Column(db.String(200))
    body_template = db.Column(db.Text)
    
    # Status
    enabled = db.Column(db.Boolean, default=True)
    last_sent = db.Column(db.DateTime)
    next_send = db.Column(db.DateTime)
    error_count = db.Column(db.Integer, default=0)
    last_error = db.Column(db.Text)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='scheduled_reports')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'description': self.description,
            'report_type': self.report_type,
            'cron': self.cron_expression,
            'timezone': self.timezone,
            'metrics': self.metrics,
            'format': self.format,
            'recipients': self.recipients,
            'enabled': self.enabled,
            'last_sent': self.last_sent.isoformat() if self.last_sent else None,
            'next_send': self.next_send.isoformat() if self.next_send else None
        }


class ErrorTracking(db.Model):
    """Track application errors"""
    __tablename__ = 'error_tracking'
    
    id = db.Column(db.Integer, primary_key=True)
    error_type = db.Column(db.String(100), nullable=False)
    error_message = db.Column(db.Text, nullable=False)
    stack_trace = db.Column(db.Text)
    
    # Context
    endpoint = db.Column(db.String(500))
    method = db.Column(db.String(10))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    request_id = db.Column(db.String(36))
    
    # Environment
    environment = db.Column(db.String(50))
    hostname = db.Column(db.String(255))
    version = db.Column(db.String(50))
    
    # Frequency
    occurrences = db.Column(db.Integer, default=1)
    first_seen = db.Column(db.DateTime, default=datetime.utcnow)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved = db.Column(db.Boolean, default=False)
    resolved_at = db.Column(db.DateTime)
    resolved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id])
    resolver = db.relationship('User', foreign_keys=[resolved_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'type': self.error_type,
            'message': self.error_message,
            'endpoint': self.endpoint,
            'method': self.method,
            'user_id': self.user_id,
            'occurrences': self.occurrences,
            'first_seen': self.first_seen.isoformat() if self.first_seen else None,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'resolved': self.resolved,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None
        }