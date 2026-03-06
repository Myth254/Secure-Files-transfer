"""
WebSocket Event Handlers for Real-time Updates
"""
from flask import request
from flask_socketio import emit, join_room, leave_room
from flask_jwt_extended import decode_token
from src.extensions import socketio, db
from src.models.monitoring import UserSession, AlertHistory
from src.models.user import User
from src.monitoring.metrics import MetricsCollector
import logging
from datetime import datetime, timedelta
import uuid

logger = logging.getLogger(__name__)

@socketio.on('connect', namespace='/monitoring')
def handle_connect():
    """Handle client connection"""
    logger.info(f"📡 Monitoring client connected: {request.sid}")
    
    # Get token from query string
    token = request.args.get('token')
    
    if token:
        try:
            decoded = decode_token(token)
            user_id = int(decoded['sub'])
            user = User.query.get(user_id)
            
            if user:
                # Create or update session
                session_id = str(uuid.uuid4())
                session = UserSession.query.filter_by(
                    user_id=user.id,
                    is_active=True
                ).first()
                
                if not session:
                    session = UserSession(
                        user_id=user.id,
                        session_id=session_id,
                        socket_id=request.sid,
                        ip_address=request.remote_addr,
                        user_agent=request.user_agent.string if request.user_agent else None,
                        expires_at=datetime.utcnow() + timedelta(hours=24),
                        auth_method='token'
                    )
                    db.session.add(session)
                else:
                    session.socket_id = request.sid
                    session.last_activity = datetime.utcnow()
                
                db.session.commit()
                
                emit('connected', {
                    'status': 'connected',
                    'user': user.username,
                    'sid': request.sid,
                    'timestamp': datetime.utcnow().isoformat()
                })
                
                # Send initial data
                metrics = MetricsCollector.get_latest_metrics(60)
                active_alerts = AlertHistory.query.filter_by(
                    status='firing'
                ).order_by(
                    AlertHistory.created_at.desc()
                ).all()
                
                emit('metrics_initial', metrics)
                emit('alerts_initial', [a.to_dict() for a in active_alerts])
                
                # Join user's personal room
                join_room(f"user_{user.id}")
                
        except Exception as e:
            logger.error(f"Error authenticating socket connection: {e}")
            emit('error', {'message': 'Authentication failed'})
    else:
        # Public monitoring (read-only)
        emit('connected', {
            'status': 'connected',
            'sid': request.sid,
            'mode': 'read-only'
        })

@socketio.on('disconnect', namespace='/monitoring')
def handle_disconnect():
    """Handle client disconnection"""
    logger.info(f"📡 Monitoring client disconnected: {request.sid}")
    
    # Update session
    session = UserSession.query.filter_by(socket_id=request.sid).first()
    if session:
        session.is_active = False
        session.socket_id = None
        db.session.commit()

@socketio.on('subscribe', namespace='/monitoring')
def handle_subscribe(data):
    """Subscribe to specific metric updates"""
    room = data.get('room')
    if room:
        join_room(room)
        emit('subscribed', {'room': room, 'sid': request.sid})

@socketio.on('unsubscribe', namespace='/monitoring')
def handle_unsubscribe(data):
    """Unsubscribe from specific metric updates"""
    room = data.get('room')
    if room:
        leave_room(room)
        emit('unsubscribed', {'room': room, 'sid': request.sid})

@socketio.on('acknowledge_alert', namespace='/monitoring')
def handle_acknowledge_alert(data):
    """Acknowledge an alert"""
    alert_id = data.get('alert_id')
    token = request.args.get('token')
    
    if token and alert_id:
        try:
            decoded = decode_token(token)
            user_id = int(decoded['sub'])
            
            from src.monitoring.alerts import AlertManager
            success = AlertManager.acknowledge_alert(alert_id, user_id)
            
            if success:
                emit('alert_acknowledged', {
                    'alert_id': alert_id,
                    'acknowledged_by': user_id,
                    'acknowledged_at': datetime.utcnow().isoformat()
                }, broadcast=True)
            else:
                emit('error', {'message': 'Failed to acknowledge alert'})
                
        except Exception as e:
            logger.error(f"Error acknowledging alert: {e}")
            emit('error', {'message': 'Failed to acknowledge alert'})

@socketio.on('get_metric_history', namespace='/monitoring')
def handle_get_metric_history(data):
    """Get historical data for a metric"""
    metric_type = data.get('metric_type')
    metric_name = data.get('metric_name')
    hours = data.get('hours', 24)
    
    history = MetricsCollector.get_metrics_history(metric_type, metric_name, hours)
    emit('metric_history', {
        'metric_type': metric_type,
        'metric_name': metric_name,
        'data': history
    })

@socketio.on('get_aggregated_metrics', namespace='/monitoring')
def handle_get_aggregated_metrics(data):
    """Get aggregated metrics over time intervals"""
    metric_type = data.get('metric_type')
    metric_name = data.get('metric_name')
    interval = data.get('interval', '1h')
    hours = data.get('hours', 24)
    
    aggregated = MetricsCollector.get_aggregated_metrics(
        metric_type, metric_name, interval, hours
    )
    emit('aggregated_metrics', {
        'metric_type': metric_type,
        'metric_name': metric_name,
        'data': aggregated
    })

@socketio.on('ping', namespace='/monitoring')
def handle_ping():
    """Heartbeat ping"""
    emit('pong', {
        'timestamp': datetime.utcnow().isoformat(),
        'sid': request.sid
    })

@socketio.on_error(namespace='/monitoring')
def handle_error(e):
    """Handle socket errors"""
    logger.error(f"Socket error: {e}")
    emit('error', {'message': str(e)})