"""
Alert Management Service
"""
import threading
import time
from datetime import datetime, timedelta
from src.extensions import db
from src.models.monitoring import AlertRule, AlertHistory, SystemMetric
import logging

logger = logging.getLogger(__name__)

class AlertManager:
    """Evaluate alert rules and send notifications"""
    
    _monitoring_thread = None
    _is_monitoring = False
    _interval = 60
    _app = None  # Store app reference for context
    
    @classmethod
    def init_app(cls, app):
        """Initialize with app context"""
        cls._app = app
        logger.info("🚨 AlertManager initialized with app")
    
    @classmethod
    def start_monitoring(cls, interval=None, app=None):
        """Start background alert monitoring"""
        if interval:
            cls._interval = interval
        if app:
            cls._app = app
        cls._is_monitoring = True
        cls._monitoring_thread = threading.Thread(target=cls._monitor_loop, daemon=True)
        cls._monitoring_thread.start()
        logger.info(f"🚨 Alert monitoring started (interval: {cls._interval}s)")
    
    @classmethod
    def stop_monitoring(cls):
        """Stop alert monitoring"""
        cls._is_monitoring = False
        logger.info("🚨 Alert monitoring stopped")
    
    @classmethod
    def _monitor_loop(cls):
        """Background monitoring loop"""
        while cls._is_monitoring:
            try:
                if cls._app:
                    with cls._app.app_context():
                        cls._check_all_rules()
                        cls._resolve_stale_alerts()
                else:
                    logger.error("No app context available for alert monitoring")
            except Exception as e:
                logger.error(f"Error checking alerts: {e}")
            time.sleep(cls._interval)
    
    @classmethod
    def _check_all_rules(cls):
        """Check all enabled alert rules"""
        rules = AlertRule.query.filter_by(enabled=True).all()
        
        for rule in rules:
            try:
                cls._evaluate_rule(rule)
            except Exception as e:
                logger.error(f"Error evaluating rule {rule.id}: {e}")
    
    @classmethod
    def _evaluate_rule(cls, rule):
        """Evaluate a single alert rule"""
        # Get recent metrics
        since = datetime.utcnow() - timedelta(seconds=rule.duration_seconds or 60)
        
        metrics = SystemMetric.query.filter_by(
            metric_type=rule.metric_type,
            metric_name=rule.metric_name
        ).filter(
            SystemMetric.timestamp >= since
        ).order_by(
            SystemMetric.timestamp.desc()
        ).all()
        
        if not metrics:
            return
        
        # Check condition over the duration
        condition_met = False
        if rule.alert_condition == 'gt':
            condition_met = all(m.metric_value > rule.threshold_value for m in metrics)
        elif rule.alert_condition == 'lt':
            condition_met = all(m.metric_value < rule.threshold_value for m in metrics)
        elif rule.alert_condition == 'gte':
            condition_met = all(m.metric_value >= rule.threshold_value for m in metrics)
        elif rule.alert_condition == 'lte':
            condition_met = all(m.metric_value <= rule.threshold_value for m in metrics)
        elif rule.alert_condition == 'eq':
            condition_met = all(m.metric_value == rule.threshold_value for m in metrics)
        elif rule.alert_condition == 'ne':
            condition_met = any(m.metric_value != rule.threshold_value for m in metrics)
        elif rule.alert_condition == 'between':
            condition_met = all(
                rule.threshold_value <= m.metric_value <= rule.threshold_max 
                for m in metrics
            )
        
        # Get current value
        current_value = metrics[0].metric_value if metrics else 0
        
        # Check for existing active alert
        active_alert = AlertHistory.query.filter_by(
            rule_id=rule.id,
            status='firing'
        ).first()
        
        if condition_met and not active_alert:
            # Trigger new alert
            cls._trigger_alert(rule, current_value, metrics)
        elif not condition_met and active_alert:
            # Resolve alert
            cls._resolve_alert(active_alert)
    
    @classmethod
    def _trigger_alert(cls, rule, current_value, metrics):
        """Trigger a new alert"""
        try:
            # Create alert history
            alert = AlertHistory(
                rule_id=rule.id,
                metric_value=current_value,
                message=f"{rule.name}: {current_value} {metrics[0].metric_unit} "
                       f"({rule.alert_condition} {rule.threshold_value})",
                severity=rule.severity,
                status='firing'
            )
            
            db.session.add(alert)
            db.session.commit()
            
            # Send notifications (implement based on your notification channels)
            cls._send_notifications(rule, alert)
            
            # Emit real-time alert with null check
            cls._emit_alert_triggered(alert)
            
            logger.warning(f"🚨 Alert triggered: {alert.message}")
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error triggering alert: {e}")
    
    @classmethod
    def _resolve_alert(cls, alert):
        """Resolve an active alert"""
        try:
            alert.status = 'resolved'
            alert.resolved_at = datetime.utcnow()
            db.session.commit()
            
            # Emit resolution with null check
            cls._emit_alert_resolved(alert)
            
            logger.info(f"✅ Alert resolved: {alert.rule.name if alert.rule else 'Unknown'}")
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error resolving alert: {e}")
    
    @classmethod
    def _resolve_stale_alerts(cls):
        """Resolve alerts that have been firing for too long without updates"""
        try:
            from flask import current_app
            timeout = current_app.config.get('ALERT_STALE_TIMEOUT', 3600)  # 1 hour
            cutoff = datetime.utcnow() - timedelta(seconds=timeout)
            
            stale_alerts = AlertHistory.query.filter_by(
                status='firing'
            ).filter(
                AlertHistory.created_at < cutoff
            ).all()
            
            for alert in stale_alerts:
                alert.status = 'resolved'
                alert.resolved_at = datetime.utcnow()
                alert.message += " (automatically resolved - stale)"
            
            if stale_alerts:
                db.session.commit()
                logger.info(f"🔄 Resolved {len(stale_alerts)} stale alerts")
                
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error resolving stale alerts: {e}")
    
    @classmethod
    def _emit_alert_triggered(cls, alert):
        """Emit alert triggered event via WebSocket with null check"""
        try:
            # Import socketio locally to avoid import issues
            from src.extensions import socketio
            
            # Check if socketio is properly initialized
            if socketio is None:
                logger.debug("SocketIO not available - skipping alert triggered emit")
                return
            
            # Check if socketio has the emit method
            if not hasattr(socketio, 'emit'):
                logger.debug("SocketIO missing emit method - skipping alert triggered emit")
                return
            
            # Emit the event
            socketio.emit('alert_triggered', alert.to_dict(), namespace='/monitoring')
            logger.debug("Alert triggered event emitted successfully")
            
        except ImportError as e:
            logger.debug(f"SocketIO not available for import: {e}")
        except AttributeError as e:
            logger.debug(f"SocketIO attribute error: {e}")
        except Exception as e:
            logger.error(f"Error emitting alert triggered: {e}")
    
    @classmethod
    def _emit_alert_resolved(cls, alert):
        """Emit alert resolved event via WebSocket with null check"""
        try:
            # Import socketio locally to avoid import issues
            from src.extensions import socketio
            
            # Check if socketio is properly initialized
            if socketio is None:
                logger.debug("SocketIO not available - skipping alert resolved emit")
                return
            
            # Check if socketio has the emit method
            if not hasattr(socketio, 'emit'):
                logger.debug("SocketIO missing emit method - skipping alert resolved emit")
                return
            
            # Emit the event
            socketio.emit('alert_resolved', {
                'alert_id': alert.id,
                'resolved_at': alert.resolved_at.isoformat() if alert.resolved_at else None
            }, namespace='/monitoring')
            logger.debug("Alert resolved event emitted successfully")
            
        except ImportError as e:
            logger.debug(f"SocketIO not available for import: {e}")
        except AttributeError as e:
            logger.debug(f"SocketIO attribute error: {e}")
        except Exception as e:
            logger.error(f"Error emitting alert resolved: {e}")
    
    @classmethod
    def _send_notifications(cls, rule, alert):
        """Send alert notifications through configured channels"""
        # This is a placeholder - implement based on your notification channels
        # You can add email, Slack, Discord, SMS notifications here
        try:
            from flask import current_app
            
            # Example: Send email if enabled
            if rule.notify_email and current_app.config.get('ALERT_EMAIL_ENABLED'):
                # Implement email sending logic
                pass
            
            # Example: Send Slack if enabled
            if rule.notify_slack and current_app.config.get('ALERT_SLACK_ENABLED'):
                # Implement Slack webhook logic
                pass
            
            # Update notification flags
            if rule.notify_email or rule.notify_slack or rule.notify_discord:
                alert.email_sent = True  # You'd track per channel
                db.session.commit()
                
        except Exception as e:
            logger.error(f"Error sending notifications: {e}")
    
    @classmethod
    def get_active_alerts(cls):
        """Get all active alerts"""
        return AlertHistory.query.filter_by(status='firing')\
            .order_by(AlertHistory.created_at.desc())\
            .all()
    
    @classmethod
    def get_alert_history(cls, limit=100, severity=None, status=None):
        """Get alert history with filters"""
        query = AlertHistory.query
        
        if severity:
            query = query.filter_by(severity=severity)
        
        if status:
            query = query.filter_by(status=status)
        
        return query.order_by(AlertHistory.created_at.desc()).limit(limit).all()
    
    @classmethod
    def acknowledge_alert(cls, alert_id, user_id):
        """Acknowledge an alert"""
        alert = AlertHistory.query.get(alert_id)
        if alert and alert.status == 'firing':
            alert.status = 'acknowledged'
            alert.acknowledged_by = user_id
            alert.acknowledged_at = datetime.utcnow()
            db.session.commit()
            
            # Emit acknowledgment with null check
            cls._emit_alert_acknowledged(alert, user_id)
            
            return True
        return False
    
    @classmethod
    def _emit_alert_acknowledged(cls, alert, user_id):
        """Emit alert acknowledged event via WebSocket with null check"""
        try:
            # Import socketio locally to avoid import issues
            from src.extensions import socketio
            
            # Check if socketio is properly initialized
            if socketio is None:
                logger.debug("SocketIO not available - skipping alert acknowledged emit")
                return
            
            # Check if socketio has the emit method
            if not hasattr(socketio, 'emit'):
                logger.debug("SocketIO missing emit method - skipping alert acknowledged emit")
                return
            
            # Emit the event
            socketio.emit('alert_acknowledged', {
                'alert_id': alert.id,
                'acknowledged_by': user_id,
                'acknowledged_at': alert.acknowledged_at.isoformat() if alert.acknowledged_at else None
            }, namespace='/monitoring')
            logger.debug("Alert acknowledged event emitted successfully")
            
        except ImportError as e:
            logger.debug(f"SocketIO not available for import: {e}")
        except AttributeError as e:
            logger.debug(f"SocketIO attribute error: {e}")
        except Exception as e:
            logger.error(f"Error emitting alert acknowledged: {e}")