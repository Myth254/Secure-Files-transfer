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
from datetime import datetime, timedelta, timezone
import uuid

logger = logging.getLogger(__name__)

# SECURITY NOTE: The JWT token is passed via the WebSocket query string
# (request.args.get('token')).  Query strings can appear in server access logs
# and browser history.  This is a known limitation of the WebSocket handshake
# protocol.  Mitigate by issuing very short-lived tokens (≤5 min) dedicated to
# WebSocket connections and rotating them frequently.  Changing this without a
# client-protocol update is not possible here.

@socketio.on('connect', namespace='/monitoring')
def handle_connect():
    """Handle client connection"""
    logger.info(f"📡 Monitoring client connected: {request.sid}")  # type: ignore
    
    token = request.args.get('token')
    
    if token:
        try:
            decoded = decode_token(token)
            user_id = int(decoded['sub'])
            user = db.session.get(User, user_id)
            
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
                        socket_id=request.sid,  # type: ignore
                        ip_address=request.remote_addr,
                        user_agent=request.user_agent.string if request.user_agent else None,
                        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
                        auth_method='token'
                    )
                    db.session.add(session)
                else:
                    session.socket_id = request.sid  # type: ignore
                    session.last_activity = datetime.now(timezone.utc)
                
                db.session.commit()
                
                emit('connected', {
                    'status': 'connected',
                    'user': user.username,
                    'sid': request.sid,  # type: ignore
                    'timestamp': datetime.now(timezone.utc).isoformat()
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
                
                join_room(f"user_{user.id}")
                
        except Exception as e:
            logger.error(f"Error authenticating socket connection: {e}")
            emit('error', {'message': 'Authentication failed'})
    else:
        # Public monitoring (read-only)
        emit('connected', {
            'status': 'connected',
            'sid': request.sid,  # type: ignore
            'mode': 'read-only'
        })

@socketio.on('disconnect', namespace='/monitoring')
def handle_disconnect():
    """Handle client disconnection"""
    logger.info(f"📡 Monitoring client disconnected: {request.sid}")  # type: ignore
    
    session = UserSession.query.filter_by(socket_id=request.sid).first()  # type: ignore
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
        emit('subscribed', {'room': room, 'sid': request.sid})  # type: ignore

@socketio.on('unsubscribe', namespace='/monitoring')
def handle_unsubscribe(data):
    """Unsubscribe from specific metric updates"""
    room = data.get('room')
    if room:
        leave_room(room)
        emit('unsubscribed', {'room': room, 'sid': request.sid})  # type: ignore

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
                    'acknowledged_at': datetime.now(timezone.utc).isoformat()
                }, broadcast=True)  # type: ignore
            else:
                emit('error', {'message': 'Failed to acknowledge alert'})
                
        except Exception as e:
            logger.error(f"Error acknowledging alert: {e}")
            # Do not emit str(e) to the client — generic message only
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
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'sid': request.sid  # type: ignore
    })

@socketio.on_error(namespace='/monitoring')
def handle_error(e):
    """Handle socket errors — log server-side, emit generic message to client"""
    logger.error(f"Socket error: {e}")
    # str(e) must NOT be forwarded to the client as it may contain internal details
    emit('error', {'message': 'An internal error occurred'})