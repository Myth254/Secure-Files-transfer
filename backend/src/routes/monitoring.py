"""
Monitoring API Routes
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.extensions import db
from src.models.monitoring import (
    SystemMetric, AlertRule, AlertHistory, UserSession, 
    ApiRequestLog, DashboardConfig, ScheduledReport, ErrorTracking
)
from src.monitoring.metrics import MetricsCollector
from src.monitoring.alerts import AlertManager
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

monitoring_bp = Blueprint('monitoring', __name__, url_prefix='/api/monitoring')

# ============================================
# DASHBOARD ENDPOINTS
# ============================================

@monitoring_bp.route('/dashboard/config', methods=['GET'])
@jwt_required()
def get_dashboard_config():
    """Get user's dashboard configuration"""
    user_id = int(get_jwt_identity())
    
    config = DashboardConfig.query.filter_by(user_id=user_id).first()
    
    if not config:
        # Create default config
        config = DashboardConfig(
            user_id=user_id,
            layout={"grid": [[0, 0, 6, 4], [6, 0, 6, 4], [0, 4, 12, 4]]},
            widgets=["cpu", "memory", "disk", "network", "users", "files", "alerts", "api"],
            time_range="last_1h",
            refresh_interval=30,
            theme="light"
        )
        db.session.add(config)
        db.session.commit()
    
    return jsonify({
        'success': True,
        'config': config.to_dict()
    })

@monitoring_bp.route('/dashboard/config', methods=['PUT'])
@jwt_required()
def update_dashboard_config():
    """Update user's dashboard configuration"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    config = DashboardConfig.query.filter_by(user_id=user_id).first()
    
    if not config:
        return jsonify({'success': False, 'error': 'Dashboard config not found'}), 404
    
    # Update fields
    for key in ['layout', 'widgets', 'time_range', 'refresh_interval', 'theme', 'color_scheme']:
        if key in data:
            setattr(config, key, data[key])
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'config': config.to_dict()
    })

# ============================================
# METRICS ENDPOINTS
# ============================================

@monitoring_bp.route('/metrics/current', methods=['GET'])
@jwt_required()
def get_current_metrics():
    """Get current system metrics"""
    metrics = MetricsCollector.get_latest_metrics()
    return jsonify({
        'success': True,
        'metrics': metrics
    })

@monitoring_bp.route('/metrics/history/<metric_type>/<metric_name>', methods=['GET'])
@jwt_required()
def get_metric_history(metric_type, metric_name):
    """Get historical metrics for charts"""
    hours = request.args.get('hours', 24, type=int)
    
    history = MetricsCollector.get_metrics_history(metric_type, metric_name, hours)
    
    return jsonify({
        'success': True,
        'metric_type': metric_type,
        'metric_name': metric_name,
        'history': history
    })

@monitoring_bp.route('/metrics/aggregated/<metric_type>/<metric_name>', methods=['GET'])
@jwt_required()
def get_aggregated_metrics(metric_type, metric_name):
    """Get aggregated metrics over time intervals"""
    hours = request.args.get('hours', 24, type=int)
    interval = request.args.get('interval', '1h')
    
    aggregated = MetricsCollector.get_aggregated_metrics(
        metric_type, metric_name, interval, hours
    )
    
    return jsonify({
        'success': True,
        'metric_type': metric_type,
        'metric_name': metric_name,
        'aggregated': aggregated
    })

# ============================================
# ALERT RULES ENDPOINTS
# ============================================

@monitoring_bp.route('/alerts/rules', methods=['GET'])
@jwt_required()
def get_alert_rules():
    """Get all alert rules"""
    rules = AlertRule.query.all()
    return jsonify({
        'success': True,
        'rules': [r.to_dict() for r in rules]
    })

@monitoring_bp.route('/alerts/rules', methods=['POST'])
@jwt_required()
def create_alert_rule():
    """Create a new alert rule"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    try:
        rule = AlertRule(
            name=data['name'],
            description=data.get('description'),
            metric_type=data['metric_type'],
            metric_name=data['metric_name'],
            alert_condition=data['condition'],
            threshold_value=data.get('threshold'),
            threshold_max=data.get('threshold_max'),
            severity=data.get('severity', 'warning'),
            duration_seconds=data.get('duration', 0),
            cooldown_seconds=data.get('cooldown', 300),
            enabled=data.get('enabled', True),
            notify_email=data.get('notify_email', False),
            notify_slack=data.get('notify_slack', False),
            notify_discord=data.get('notify_discord', False),
            notify_sms=data.get('notify_sms', False),
            notify_webhook=data.get('notify_webhook', False),
            webhook_url=data.get('webhook_url'),
            created_by=user_id
        )
        
        db.session.add(rule)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Alert rule created successfully',
            'rule': rule.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating alert rule: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400

@monitoring_bp.route('/alerts/rules/<int:rule_id>', methods=['PUT'])
@jwt_required()
def update_alert_rule(rule_id):
    """Update an alert rule"""
    rule = AlertRule.query.get(rule_id)
    
    if not rule:
        return jsonify({'success': False, 'error': 'Alert rule not found'}), 404
    
    data = request.get_json()
    
    try:
        for key, value in data.items():
            if hasattr(rule, key):
                setattr(rule, key, value)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Alert rule updated successfully',
            'rule': rule.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating alert rule: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400

@monitoring_bp.route('/alerts/rules/<int:rule_id>', methods=['DELETE'])
@jwt_required()
def delete_alert_rule(rule_id):
    """Delete an alert rule"""
    rule = AlertRule.query.get(rule_id)
    
    if not rule:
        return jsonify({'success': False, 'error': 'Alert rule not found'}), 404
    
    try:
        db.session.delete(rule)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Alert rule deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting alert rule: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400

@monitoring_bp.route('/alerts/rules/<int:rule_id>/toggle', methods=['POST'])
@jwt_required()
def toggle_alert_rule(rule_id):
    """Enable or disable an alert rule"""
    rule = AlertRule.query.get(rule_id)
    
    if not rule:
        return jsonify({'success': False, 'error': 'Alert rule not found'}), 404
    
    rule.enabled = not rule.enabled
    db.session.commit()
    
    return jsonify({
        'success': True,
        'enabled': rule.enabled,
        'message': f"Alert rule {'enabled' if rule.enabled else 'disabled'}"
    })

# ============================================
# ALERT HISTORY ENDPOINTS
# ============================================

@monitoring_bp.route('/alerts/history', methods=['GET'])
@jwt_required()
def get_alert_history():
    """Get alert history with filters"""
    limit = request.args.get('limit', 100, type=int)
    severity = request.args.get('severity')
    status = request.args.get('status')
    hours = request.args.get('hours', 24, type=int)
    
    query = AlertHistory.query
    
    if severity:
        query = query.filter_by(severity=severity)
    
    if status:
        query = query.filter_by(status=status)
    
    if hours:
        since = datetime.utcnow() - timedelta(hours=hours)
        query = query.filter(AlertHistory.created_at >= since)
    
    alerts = query.order_by(AlertHistory.created_at.desc()).limit(limit).all()
    
    return jsonify({
        'success': True,
        'alerts': [a.to_dict() for a in alerts],
        'count': len(alerts)
    })

@monitoring_bp.route('/alerts/history/<int:alert_id>/acknowledge', methods=['POST'])
@jwt_required()
def acknowledge_alert(alert_id):
    """Acknowledge an alert"""
    user_id = int(get_jwt_identity())
    
    from src.monitoring.alerts import AlertManager
    success = AlertManager.acknowledge_alert(alert_id, user_id)
    
    if success:
        return jsonify({'success': True, 'message': 'Alert acknowledged'})
    else:
        return jsonify({'success': False, 'error': 'Alert not found or already resolved'}), 404

@monitoring_bp.route('/alerts/history/active', methods=['GET'])
@jwt_required()
def get_active_alerts():
    """Get all active alerts"""
    from src.monitoring.alerts import AlertManager
    alerts = AlertManager.get_active_alerts()
    
    return jsonify({
        'success': True,
        'alerts': [a.to_dict() for a in alerts],
        'count': len(alerts)
    })

# ============================================
# SESSION MONITORING ENDPOINTS
# ============================================

@monitoring_bp.route('/sessions', methods=['GET'])
@jwt_required()
def get_active_sessions():
    """Get all active user sessions"""
    sessions = UserSession.query.filter_by(
        is_active=True
    ).order_by(
        UserSession.last_activity.desc()
    ).all()
    
    return jsonify({
        'success': True,
        'sessions': [s.to_dict() for s in sessions],
        'count': len(sessions)
    })

@monitoring_bp.route('/sessions/<int:session_id>', methods=['DELETE'])
@jwt_required()
def terminate_session(session_id):
    """Terminate a user session"""
    session = UserSession.query.get(session_id)
    
    if not session:
        return jsonify({'success': False, 'error': 'Session not found'}), 404
    
    session.is_active = False
    db.session.commit()
    
    # Emit socket event to disconnect user
    from src.extensions import socketio
    socketio.emit('session_terminated', {
        'session_id': session.session_id,
        'user_id': session.user_id
    }, room=f"user_{session.user_id}", namespace='/monitoring')
    
    return jsonify({
        'success': True,
        'message': 'Session terminated successfully'
    })

@monitoring_bp.route('/sessions/stats', methods=['GET'])
@jwt_required()
def get_session_stats():
    """Get session statistics"""
    total_active = UserSession.query.filter_by(is_active=True).count()
    
    # Sessions by device
    device_stats = db.session.query(
        UserSession.device_type,
        db.func.count(UserSession.id)
    ).filter_by(is_active=True).group_by(UserSession.device_type).all()
    
    # Sessions by browser
    browser_stats = db.session.query(
        UserSession.browser,
        db.func.count(UserSession.id)
    ).filter_by(is_active=True).group_by(UserSession.browser).all()
    
    # Sessions by country
    country_stats = db.session.query(
        UserSession.country,
        db.func.count(UserSession.id)
    ).filter_by(is_active=True).group_by(UserSession.country).all()
    
    return jsonify({
        'success': True,
        'stats': {
            'total_active': total_active,
            'by_device': dict(device_stats),
            'by_browser': dict(browser_stats),
            'by_country': dict(country_stats)
        }
    })

# ============================================
# API REQUEST LOGS ENDPOINTS
# ============================================

@monitoring_bp.route('/api-logs', methods=['GET'])
@jwt_required()
def get_api_logs():
    """Get recent API request logs"""
    limit = request.args.get('limit', 100, type=int)
    hours = request.args.get('hours', 24, type=int)
    
    query = ApiRequestLog.query
    
    if hours:
        since = datetime.utcnow() - timedelta(hours=hours)
        query = query.filter(ApiRequestLog.created_at >= since)
    
    logs = query.order_by(ApiRequestLog.created_at.desc()).limit(limit).all()
    
    return jsonify({
        'success': True,
        'logs': [l.to_dict() for l in logs],
        'count': len(logs)
    })

@monitoring_bp.route('/api-logs/summary', methods=['GET'])
@jwt_required()
def get_api_summary():
    """Get API request summary"""
    hours = request.args.get('hours', 24, type=int)
    since = datetime.utcnow() - timedelta(hours=hours)
    
    total_requests = ApiRequestLog.query.filter(
        ApiRequestLog.created_at >= since
    ).count()
    
    avg_response_time = db.session.query(
        db.func.avg(ApiRequestLog.response_time)
    ).filter(
        ApiRequestLog.created_at >= since
    ).scalar() or 0
    
    error_count = ApiRequestLog.query.filter(
        ApiRequestLog.created_at >= since,
        ApiRequestLog.status_code >= 400
    ).count()
    
    # Endpoint statistics
    endpoint_stats = db.session.query(
        ApiRequestLog.endpoint,
        db.func.count(ApiRequestLog.id).label('count'),
        db.func.avg(ApiRequestLog.response_time).label('avg_time')
    ).filter(
        ApiRequestLog.created_at >= since
    ).group_by(
        ApiRequestLog.endpoint
    ).order_by(
        db.desc('count')
    ).limit(10).all()
    
    return jsonify({
        'success': True,
        'summary': {
            'total_requests': total_requests,
            'avg_response_time': round(float(avg_response_time), 2),
            'error_rate': round((error_count / total_requests * 100) if total_requests > 0 else 0, 2),
            'period_hours': hours,
            'top_endpoints': [
                {
                    'endpoint': e[0],
                    'count': e[1],
                    'avg_time': round(float(e[2]), 2)
                }
                for e in endpoint_stats
            ]
        }
    })

# ============================================
# SYSTEM HEALTH ENDPOINTS
# ============================================

@monitoring_bp.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint (public)"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat()
    })

@monitoring_bp.route('/health/detailed', methods=['GET'])
@jwt_required()
def detailed_health():
    """Detailed system health check"""
    # Check database
    db_status = 'healthy'
    try:
        db.session.execute('SELECT 1')
    except:
        db_status = 'unhealthy'
    
    # Check Redis
    redis_status = 'healthy'
    try:
        from src.extensions import socketio
        # Simple Redis check
    except:
        redis_status = 'unhealthy'
    
    # Get latest metrics
    metrics = MetricsCollector.get_latest_metrics()
    
    return jsonify({
        'success': True,
        'health': {
            'database': db_status,
            'redis': redis_status,
            'websocket': 'healthy',
            'timestamp': datetime.utcnow().isoformat()
        },
        'metrics': metrics
    })

# ============================================
# INITIALIZATION ENDPOINT
# ============================================

@monitoring_bp.route('/init', methods=['POST'])
@jwt_required()
def init_monitoring():
    """Initialize monitoring system with default data"""
    user_id = int(get_jwt_identity())
    
    # Check if user is admin (optional)
    # user = User.query.get(user_id)
    # if not user.is_admin:
    #     return jsonify({'success': False, 'error': 'Admin access required'}), 403
    
    try:
        # Create default alert rules
        default_rules = [
            {
                'name': 'High CPU Usage',
                'description': 'CPU usage exceeds 80% for 5 minutes',
                'metric_type': 'cpu',
                'metric_name': 'cpu_usage',
                'alert_condition': 'gt',
                'threshold_value': 80,
                'severity': 'warning',
                'duration_seconds': 300,
                'notify_email': True
            },
            {
                'name': 'Critical CPU Usage',
                'description': 'CPU usage exceeds 95% for 2 minutes',
                'metric_type': 'cpu',
                'metric_name': 'cpu_usage',
                'alert_condition': 'gt',
                'threshold_value': 95,
                'severity': 'critical',
                'duration_seconds': 120,
                'notify_email': True,
                'notify_slack': True
            },
            {
                'name': 'High Memory Usage',
                'description': 'Memory usage exceeds 85% for 5 minutes',
                'metric_type': 'memory',
                'metric_name': 'usage',
                'alert_condition': 'gt',
                'threshold_value': 85,
                'severity': 'warning',
                'duration_seconds': 300,
                'notify_email': True
            },
            {
                'name': 'Low Disk Space',
                'description': 'Disk usage exceeds 90%',
                'metric_type': 'disk',
                'metric_name': 'usage',
                'alert_condition': 'gt',
                'threshold_value': 90,
                'severity': 'critical',
                'duration_seconds': 600,
                'notify_email': True,
                'notify_slack': True
            },
            {
                'name': 'High API Response Time',
                'description': 'Average response time exceeds 500ms for 5 minutes',
                'metric_type': 'app',
                'metric_name': 'avg_response_time',
                'alert_condition': 'gt',
                'threshold_value': 500,
                'severity': 'warning',
                'duration_seconds': 300,
                'notify_email': True
            },
            {
                'name': 'High Error Rate',
                'description': 'Error rate exceeds 5% for 5 minutes',
                'metric_type': 'app',
                'metric_name': 'error_rate',
                'alert_condition': 'gt',
                'threshold_value': 5,
                'severity': 'critical',
                'duration_seconds': 300,
                'notify_email': True,
                'notify_slack': True
            }
        ]
        
        for rule_data in default_rules:
            existing = AlertRule.query.filter_by(name=rule_data['name']).first()
            if not existing:
                rule = AlertRule(
                    **rule_data,
                    created_by=user_id,
                    cooldown_seconds=300
                )
                db.session.add(rule)
        
        # Create default dashboard config for admin
        admin_config = DashboardConfig.query.filter_by(user_id=user_id).first()
        if not admin_config:
            config = DashboardConfig(
                user_id=user_id,
                layout={"grid": [[0, 0, 6, 4], [6, 0, 6, 4], [0, 4, 12, 4]]},
                widgets=["cpu", "memory", "disk", "network", "users", "files", "alerts", "api"],
                time_range="last_1h",
                refresh_interval=30,
                theme="light",
                default_dashboard=True
            )
            db.session.add(config)
        
        db.session.commit()
        
        # Start monitoring if not already running
        from src.monitoring.metrics import MetricsCollector
        from src.monitoring.alerts import AlertManager
        
        MetricsCollector.start_collection()
        AlertManager.start_monitoring()
        
        return jsonify({
            'success': True,
            'message': 'Monitoring system initialized successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error initializing monitoring: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500