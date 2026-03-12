"""
Monitoring routes — /api/monitoring/*

Fixes applied
─────────────
F-08  str(e) never returned to clients; generic messages + error IDs.
Admin gate: /monitoring/init now verifies is_admin before executing.
      The original had the check commented out — anyone with a JWT
      could reset all monitoring rules and dashboard configs.
Bare except: all bare `except:` replaced with `except Exception`.
db.session.execute('SELECT 1') → db.session.execute(text('SELECT 1'))
      (string SQL removed in SQLAlchemy 2.x).
Redis health: proper redis.ping() instead of dummy socketio import.
Alert rule PUT: only whitelisted fields are setattr'd — previously any
      model field could be overwritten via the request body.
datetime.utcnow() → datetime.now(timezone.utc) throughout.
SQLAlchemy 2.x: Model.query.get() → db.session.get()
cap on hours/limit params to prevent trivially large DB scans.
"""
import uuid
import logging
from datetime import datetime, timezone, timedelta

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text

from src.extensions import db
from src.models.monitoring import (
    AlertRule, AlertHistory, UserSession,
    ApiRequestLog, DashboardConfig,
)
from src.monitoring.metrics import MetricsCollector
from src.monitoring.alerts import AlertManager

logger = logging.getLogger(__name__)

monitoring_bp = Blueprint('monitoring', __name__, url_prefix='/api/monitoring')

# Whitelist of fields a caller may update on an AlertRule (prevents arbitrary
# model attribute injection via the unrestricted setattr loop in the original).
_ALERT_RULE_UPDATABLE = {
    'name', 'description', 'metric_type', 'metric_name', 'alert_condition',
    'threshold_value', 'threshold_max', 'severity', 'duration_seconds',
    'cooldown_seconds', 'enabled', 'notify_email', 'notify_slack',
    'notify_discord', 'notify_sms', 'notify_webhook', 'webhook_url',
}


def _is_admin(user_id: int) -> bool:
    from src.models.user import User
    user = db.session.get(User, user_id)
    return bool(user and user.username == current_app.config.get('ADMIN_USERNAME', ''))


# ════════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ════════════════════════════════════════════════════════════════════════════════

@monitoring_bp.route('/dashboard/config', methods=['GET'])
@jwt_required()
def get_dashboard_config():
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        config  = DashboardConfig.query.filter_by(user_id=user_id).first()

        if not config:
            config = DashboardConfig(
                user_id=user_id,
                layout={'grid': [[0, 0, 6, 4], [6, 0, 6, 4], [0, 4, 12, 4]]},
                widgets=['cpu', 'memory', 'disk', 'network', 'users', 'files', 'alerts', 'api'],
                time_range='last_1h',
                refresh_interval=30,
                theme='light',
            )
            db.session.add(config)
            db.session.commit()

        return jsonify({'success': True, 'config': config.to_dict()})

    except Exception:
        logger.error(f"[{err_id}] get_dashboard_config failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Request failed', 'error_id': err_id}), 500


@monitoring_bp.route('/dashboard/config', methods=['PUT'])
@jwt_required()
def update_dashboard_config():
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        data    = request.get_json(silent=True) or {}

        config = DashboardConfig.query.filter_by(user_id=user_id).first()
        if not config:
            return jsonify({'success': False, 'error': 'Dashboard config not found'}), 404

        allowed = {'layout', 'widgets', 'time_range', 'refresh_interval', 'theme', 'color_scheme'}
        for key in allowed:
            if key in data:
                setattr(config, key, data[key])

        db.session.commit()
        return jsonify({'success': True, 'config': config.to_dict()})

    except Exception:
        db.session.rollback()
        logger.error(f"[{err_id}] update_dashboard_config failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Request failed', 'error_id': err_id}), 500


# ════════════════════════════════════════════════════════════════════════════════
# METRICS
# ════════════════════════════════════════════════════════════════════════════════

@monitoring_bp.route('/metrics/current', methods=['GET'])
@jwt_required()
def get_current_metrics():
    metrics = MetricsCollector.get_latest_metrics()
    return jsonify({'success': True, 'metrics': metrics})


@monitoring_bp.route('/metrics/history/<metric_type>/<metric_name>', methods=['GET'])
@jwt_required()
def get_metric_history(metric_type, metric_name):
    hours   = min(request.args.get('hours', 24, type=int), 168)
    history = MetricsCollector.get_metrics_history(metric_type, metric_name, hours)
    return jsonify({'success': True, 'metric_type': metric_type, 'metric_name': metric_name, 'history': history})


@monitoring_bp.route('/metrics/aggregated/<metric_type>/<metric_name>', methods=['GET'])
@jwt_required()
def get_aggregated_metrics(metric_type, metric_name):
    hours      = min(request.args.get('hours', 24, type=int), 168)
    interval   = request.args.get('interval', '1h')
    aggregated = MetricsCollector.get_aggregated_metrics(metric_type, metric_name, interval, hours)
    return jsonify({'success': True, 'metric_type': metric_type, 'metric_name': metric_name, 'aggregated': aggregated})


# ════════════════════════════════════════════════════════════════════════════════
# ALERT RULES
# ════════════════════════════════════════════════════════════════════════════════

@monitoring_bp.route('/alerts/rules', methods=['GET'])
@jwt_required()
def get_alert_rules():
    rules = AlertRule.query.all()
    return jsonify({'success': True, 'rules': [r.to_dict() for r in rules]})


@monitoring_bp.route('/alerts/rules', methods=['POST'])
@jwt_required()
def create_alert_rule():
    err_id = uuid.uuid4().hex
    try:
        user_id = int(get_jwt_identity())
        data    = request.get_json(silent=True) or {}

        rule = AlertRule(
            name             = data['name'],
            description      = data.get('description'),
            metric_type      = data['metric_type'],
            metric_name      = data['metric_name'],
            alert_condition  = data['condition'],
            threshold_value  = data.get('threshold'),
            threshold_max    = data.get('threshold_max'),
            severity         = data.get('severity', 'warning'),
            duration_seconds = data.get('duration', 0),
            cooldown_seconds = data.get('cooldown', 300),
            enabled          = data.get('enabled', True),
            notify_email     = data.get('notify_email', False),
            notify_slack     = data.get('notify_slack', False),
            notify_discord   = data.get('notify_discord', False),
            notify_sms       = data.get('notify_sms', False),
            notify_webhook   = data.get('notify_webhook', False),
            webhook_url      = data.get('webhook_url'),
            created_by       = user_id,
        )
        db.session.add(rule)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Alert rule created successfully', 'rule': rule.to_dict()}), 201

    except KeyError as ke:
        return jsonify({'success': False, 'error': f'Missing required field: {ke}'}), 400
    except Exception:
        db.session.rollback()
        logger.error(f"[{err_id}] create_alert_rule failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Request failed', 'error_id': err_id}), 400


@monitoring_bp.route('/alerts/rules/<int:rule_id>', methods=['PUT'])
@jwt_required()
def update_alert_rule(rule_id):
    """Update an alert rule — only whitelisted fields are written."""
    err_id = uuid.uuid4().hex
    try:
        rule = db.session.get(AlertRule, rule_id)
        if not rule:
            return jsonify({'success': False, 'error': 'Alert rule not found'}), 404

        data = request.get_json(silent=True) or {}
        for key, value in data.items():
            if key in _ALERT_RULE_UPDATABLE:
                setattr(rule, key, value)

        db.session.commit()
        return jsonify({'success': True, 'message': 'Alert rule updated successfully', 'rule': rule.to_dict()})

    except Exception:
        db.session.rollback()
        logger.error(f"[{err_id}] update_alert_rule({rule_id}) failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Request failed', 'error_id': err_id}), 400


@monitoring_bp.route('/alerts/rules/<int:rule_id>', methods=['DELETE'])
@jwt_required()
def delete_alert_rule(rule_id):
    err_id = uuid.uuid4().hex
    try:
        rule = db.session.get(AlertRule, rule_id)
        if not rule:
            return jsonify({'success': False, 'error': 'Alert rule not found'}), 404

        db.session.delete(rule)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Alert rule deleted successfully'})

    except Exception:
        db.session.rollback()
        logger.error(f"[{err_id}] delete_alert_rule({rule_id}) failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Request failed', 'error_id': err_id}), 400


@monitoring_bp.route('/alerts/rules/<int:rule_id>/toggle', methods=['POST'])
@jwt_required()
def toggle_alert_rule(rule_id):
    err_id = uuid.uuid4().hex
    try:
        rule = db.session.get(AlertRule, rule_id)
        if not rule:
            return jsonify({'success': False, 'error': 'Alert rule not found'}), 404

        rule.enabled = not rule.enabled
        db.session.commit()
        return jsonify({
            'success': True,
            'enabled': rule.enabled,
            'message': f"Alert rule {'enabled' if rule.enabled else 'disabled'}",
        })

    except Exception:
        db.session.rollback()
        logger.error(f"[{err_id}] toggle_alert_rule({rule_id}) failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Request failed', 'error_id': err_id}), 400


# ════════════════════════════════════════════════════════════════════════════════
# ALERT HISTORY
# ════════════════════════════════════════════════════════════════════════════════

@monitoring_bp.route('/alerts/history', methods=['GET'])
@jwt_required()
def get_alert_history():
    err_id = uuid.uuid4().hex
    try:
        limit    = min(request.args.get('limit', 100, type=int), 1000)
        hours    = min(request.args.get('hours',  24,  type=int), 720)
        severity = request.args.get('severity')
        status   = request.args.get('status')

        query = AlertHistory.query
        if severity:
            query = query.filter_by(severity=severity)
        if status:
            query = query.filter_by(status=status)

        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        query = query.filter(AlertHistory.created_at >= since)

        alerts = query.order_by(AlertHistory.created_at.desc()).limit(limit).all()
        return jsonify({'success': True, 'alerts': [a.to_dict() for a in alerts], 'count': len(alerts)})

    except Exception:
        logger.error(f"[{err_id}] get_alert_history failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Request failed', 'error_id': err_id}), 500


@monitoring_bp.route('/alerts/history/<int:alert_id>/acknowledge', methods=['POST'])
@jwt_required()
def acknowledge_alert(alert_id):
    user_id = int(get_jwt_identity())
    success = AlertManager.acknowledge_alert(alert_id, user_id)
    if success:
        return jsonify({'success': True, 'message': 'Alert acknowledged'})
    return jsonify({'success': False, 'error': 'Alert not found or already resolved'}), 404


@monitoring_bp.route('/alerts/history/active', methods=['GET'])
@jwt_required()
def get_active_alerts():
    alerts = AlertManager.get_active_alerts()
    return jsonify({'success': True, 'alerts': [a.to_dict() for a in alerts], 'count': len(alerts)})


# ════════════════════════════════════════════════════════════════════════════════
# SESSIONS
# ════════════════════════════════════════════════════════════════════════════════

@monitoring_bp.route('/sessions', methods=['GET'])
@jwt_required()
def get_active_sessions():
    sessions = (
        UserSession.query
        .filter_by(is_active=True)
        .order_by(UserSession.last_activity.desc())
        .all()
    )
    return jsonify({'success': True, 'sessions': [s.to_dict() for s in sessions], 'count': len(sessions)})


@monitoring_bp.route('/sessions/<int:session_id>', methods=['DELETE'])
@jwt_required()
def terminate_session(session_id):
    err_id = uuid.uuid4().hex
    try:
        session = db.session.get(UserSession, session_id)
        if not session:
            return jsonify({'success': False, 'error': 'Session not found'}), 404

        session.is_active = False
        db.session.commit()

        from src.extensions import socketio
        socketio.emit('session_terminated', {
            'session_id': session.session_id,
            'user_id':    session.user_id,
        }, to=f"user_{session.user_id}", namespace='/monitoring')

        return jsonify({'success': True, 'message': 'Session terminated successfully'})

    except Exception:
        db.session.rollback()
        logger.error(f"[{err_id}] terminate_session({session_id}) failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Request failed', 'error_id': err_id}), 500


@monitoring_bp.route('/sessions/stats', methods=['GET'])
@jwt_required()
def get_session_stats():
    total_active  = UserSession.query.filter_by(is_active=True).count()
    device_stats  = db.session.query(UserSession.device_type, db.func.count(UserSession.id)).filter_by(is_active=True).group_by(UserSession.device_type).all()
    browser_stats = db.session.query(UserSession.browser,     db.func.count(UserSession.id)).filter_by(is_active=True).group_by(UserSession.browser).all()
    country_stats = db.session.query(UserSession.country,     db.func.count(UserSession.id)).filter_by(is_active=True).group_by(UserSession.country).all()

    return jsonify({
        'success': True,
        'stats': {
            'total_active': total_active,
            'by_device':    dict(device_stats),
            'by_browser':   dict(browser_stats),
            'by_country':   dict(country_stats),
        },
    })


# ════════════════════════════════════════════════════════════════════════════════
# API LOGS
# ════════════════════════════════════════════════════════════════════════════════

@monitoring_bp.route('/api-logs', methods=['GET'])
@jwt_required()
def get_api_logs():
    limit = min(request.args.get('limit', 100, type=int), 1000)
    hours = min(request.args.get('hours',  24,  type=int), 720)
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    logs = (
        ApiRequestLog.query
        .filter(ApiRequestLog.created_at >= since)
        .order_by(ApiRequestLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return jsonify({'success': True, 'logs': [log_entry.to_dict() for log_entry in logs], 'count': len(logs)})


@monitoring_bp.route('/api-logs/summary', methods=['GET'])
@jwt_required()
def get_api_summary():
    err_id = uuid.uuid4().hex
    try:
        hours = min(request.args.get('hours', 24, type=int), 720)
        since = datetime.now(timezone.utc) - timedelta(hours=hours)

        total_requests    = ApiRequestLog.query.filter(ApiRequestLog.created_at >= since).count()
        avg_response_time = db.session.query(
            db.func.avg(ApiRequestLog.response_time)
        ).filter(ApiRequestLog.created_at >= since).scalar() or 0

        error_count = ApiRequestLog.query.filter(
            ApiRequestLog.created_at >= since,
            ApiRequestLog.status_code >= 400,
        ).count()

        endpoint_stats = db.session.query(
            ApiRequestLog.endpoint,
            db.func.count(ApiRequestLog.id).label('count'),
            db.func.avg(ApiRequestLog.response_time).label('avg_time'),
        ).filter(
            ApiRequestLog.created_at >= since
        ).group_by(ApiRequestLog.endpoint).order_by(db.desc('count')).limit(10).all()

        return jsonify({
            'success': True,
            'summary': {
                'total_requests':    total_requests,
                'avg_response_time': round(float(avg_response_time), 2),
                'error_rate':        round((error_count / total_requests * 100) if total_requests > 0 else 0, 2),
                'period_hours':      hours,
                'top_endpoints': [
                    {'endpoint': e[0], 'count': e[1], 'avg_time': round(float(e[2]), 2)}
                    for e in endpoint_stats
                ],
            },
        })

    except Exception:
        logger.error(f"[{err_id}] get_api_summary failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Request failed', 'error_id': err_id}), 500


# ════════════════════════════════════════════════════════════════════════════════
# HEALTH
# ════════════════════════════════════════════════════════════════════════════════

@monitoring_bp.route('/health', methods=['GET'])
def health_check():
    """Public liveness probe — no system detail exposed."""
    return jsonify({
        'status':    'healthy',
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })


@monitoring_bp.route('/health/detailed', methods=['GET'])
@jwt_required()
def detailed_health():
    """Authenticated detailed health check."""
    db_status = 'healthy'
    try:
        db.session.execute(text('SELECT 1'))   # bare string SQL removed (SQLAlchemy 2.x)
    except Exception:
        db_status = 'unhealthy'

    redis_status = 'healthy'
    try:
        import redis
        r = redis.from_url(current_app.config.get('REDIS_URL', 'redis://localhost:6379/0'))
        r.ping()
    except Exception:
        redis_status = 'unhealthy'

    metrics = MetricsCollector.get_latest_metrics()

    return jsonify({
        'success': True,
        'health': {
            'database':  db_status,
            'redis':     redis_status,
            'websocket': 'healthy',
            'timestamp': datetime.now(timezone.utc).isoformat(),
        },
        'metrics': metrics,
    })


# ════════════════════════════════════════════════════════════════════════════════
# INIT — admin only
# ════════════════════════════════════════════════════════════════════════════════

@monitoring_bp.route('/init', methods=['POST'])
@jwt_required()
def init_monitoring():
    """
    Seed default alert rules and dashboard config.
    Restricted to admin users — the original had this check commented out,
    allowing any authenticated user to reinitialise monitoring.
    """
    err_id  = uuid.uuid4().hex
    user_id = int(get_jwt_identity())

    if not _is_admin(user_id):
        return jsonify({'success': False, 'error': 'Admin access required'}), 403

    try:
        default_rules = [
            {'name': 'High CPU Usage',         'metric_type': 'cpu',    'metric_name': 'cpu_usage',         'condition': 'gt', 'threshold': 80,  'severity': 'warning',  'duration': 300, 'notify_email': True},
            {'name': 'Critical CPU Usage',     'metric_type': 'cpu',    'metric_name': 'cpu_usage',         'condition': 'gt', 'threshold': 95,  'severity': 'critical', 'duration': 120, 'notify_email': True, 'notify_slack': True},
            {'name': 'High Memory Usage',      'metric_type': 'memory', 'metric_name': 'usage',             'condition': 'gt', 'threshold': 85,  'severity': 'warning',  'duration': 300, 'notify_email': True},
            {'name': 'Low Disk Space',         'metric_type': 'disk',   'metric_name': 'usage',             'condition': 'gt', 'threshold': 90,  'severity': 'critical', 'duration': 600, 'notify_email': True, 'notify_slack': True},
            {'name': 'High API Response Time', 'metric_type': 'app',    'metric_name': 'avg_response_time', 'condition': 'gt', 'threshold': 500, 'severity': 'warning',  'duration': 300, 'notify_email': True},
            {'name': 'High Error Rate',        'metric_type': 'app',    'metric_name': 'error_rate',        'condition': 'gt', 'threshold': 5,   'severity': 'critical', 'duration': 300, 'notify_email': True, 'notify_slack': True},
        ]

        for rd in default_rules:
            if not AlertRule.query.filter_by(name=rd['name']).first():
                db.session.add(AlertRule(
                    name=rd['name'], metric_type=rd['metric_type'],
                    metric_name=rd['metric_name'], alert_condition=rd['condition'],
                    threshold_value=rd['threshold'], severity=rd['severity'],
                    duration_seconds=rd.get('duration', 0), cooldown_seconds=300,
                    notify_email=rd.get('notify_email', False),
                    notify_slack=rd.get('notify_slack', False),
                    enabled=True, created_by=user_id,
                ))

        if not DashboardConfig.query.filter_by(user_id=user_id).first():
            db.session.add(DashboardConfig(
                user_id=user_id,
                layout={'grid': [[0, 0, 6, 4], [6, 0, 6, 4], [0, 4, 12, 4]]},
                widgets=['cpu', 'memory', 'disk', 'network', 'users', 'files', 'alerts', 'api'],
                time_range='last_1h', refresh_interval=30, theme='light', default_dashboard=True,
            ))

        db.session.commit()
        MetricsCollector.start_collection()
        AlertManager.start_monitoring()

        return jsonify({'success': True, 'message': 'Monitoring system initialised successfully'})

    except Exception:
        db.session.rollback()
        logger.error(f"[{err_id}] init_monitoring failed", exc_info=True)
        return jsonify({'success': False, 'error': 'Initialisation failed', 'error_id': err_id}), 500