"""
System Metrics Collection Service
"""
import psutil
import os
import socket
import threading
import time
from datetime import datetime, timedelta
from src.extensions import db
from src.models.monitoring import SystemMetric, UserSession, ApiRequestLog
import logging

logger = logging.getLogger(__name__)

class MetricsCollector:
    """Collect and emit system metrics"""
    
    _collection_thread = None
    _is_collecting = False
    _interval = 30
    _app = None  # Store app reference for context
    
    @classmethod
    def init_app(cls, app):
        """Initialize with app context"""
        cls._app = app
        logger.info("📊 MetricsCollector initialized with app")
    
    @classmethod
    def start_collection(cls, interval=None, app=None):
        """Start background metric collection"""
        if interval:
            cls._interval = interval
        if app:
            cls._app = app
        cls._is_collecting = True
        cls._collection_thread = threading.Thread(target=cls._collect_loop, daemon=True)
        cls._collection_thread.start()
        logger.info(f"📊 Metrics collection started (interval: {cls._interval}s)")
    
    @classmethod
    def stop_collection(cls):
        """Stop metric collection"""
        cls._is_collecting = False
        logger.info("📊 Metrics collection stopped")
    
    @classmethod
    def _collect_loop(cls):
        """Background collection loop"""
        while cls._is_collecting:
            try:
                if cls._app:
                    with cls._app.app_context():
                        cls._collect_metrics()
                else:
                    logger.error("No app context available for metrics collection")
            except Exception as e:
                logger.error(f"Error in collection loop: {e}")
            time.sleep(cls._interval)
    
    @classmethod
    def _collect_metrics(cls):
        """Collect all metrics within app context"""
        try:
            hostname = socket.gethostname()
            environment = 'production'  # Default fallback
            
            # Try to get environment from app config if available
            try:
                from flask import current_app
                environment = current_app.config.get('FLASK_ENV', 'development')
            except:
                pass
            
            # Collect system metrics
            cls._collect_system_metrics(hostname, environment)
            
            # Collect application metrics
            cls._collect_app_metrics(hostname, environment)
            
            # Emit real-time updates
            cls._emit_metrics_update()
            
            # Cleanup old metrics
            cls._cleanup_old_metrics()
            
        except Exception as e:
            logger.error(f"Error collecting metrics: {e}")
    
    @classmethod
    def _collect_system_metrics(cls, hostname, environment):
        """Collect system performance metrics"""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            cpu_freq = psutil.cpu_freq()
            
            cls._save_metric('cpu', 'cpu_usage', cpu_percent, '%', 
                           {'cores': cpu_count}, hostname, environment)
            
            if cpu_freq:
                cls._save_metric('cpu', 'cpu_frequency', cpu_freq.current, 'MHz',
                               {}, hostname, environment)
            
            # Per-core CPU usage
            per_cpu = psutil.cpu_percent(interval=1, percpu=True)
            for i, usage in enumerate(per_cpu):
                cls._save_metric('cpu', f'core_{i}', usage, '%', 
                               {'core': i}, hostname, environment)
            
            # Memory metrics
            memory = psutil.virtual_memory()
            cls._save_metric('memory', 'usage', memory.percent, '%',
                           {}, hostname, environment)
            cls._save_metric('memory', 'used', memory.used / (1024**3), 'GB',
                           {}, hostname, environment)
            cls._save_metric('memory', 'available', memory.available / (1024**3), 'GB',
                           {}, hostname, environment)
            cls._save_metric('memory', 'total', memory.total / (1024**3), 'GB',
                           {}, hostname, environment)
            
            # Swap memory
            swap = psutil.swap_memory()
            cls._save_metric('memory', 'swap_used', swap.used / (1024**3), 'GB',
                           {}, hostname, environment)
            cls._save_metric('memory', 'swap_percent', swap.percent, '%',
                           {}, hostname, environment)
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            cls._save_metric('disk', 'usage', disk.percent, '%',
                           {'mount': '/'}, hostname, environment)
            cls._save_metric('disk', 'free', disk.free / (1024**3), 'GB',
                           {'mount': '/'}, hostname, environment)
            cls._save_metric('disk', 'used', disk.used / (1024**3), 'GB',
                           {'mount': '/'}, hostname, environment)
            cls._save_metric('disk', 'total', disk.total / (1024**3), 'GB',
                           {'mount': '/'}, hostname, environment)
            
            # Disk I/O
            disk_io = psutil.disk_io_counters()
            if disk_io:
                cls._save_metric('disk', 'read_mb', disk_io.read_bytes / (1024**2), 'MB',
                               {}, hostname, environment)
                cls._save_metric('disk', 'write_mb', disk_io.write_bytes / (1024**2), 'MB',
                               {}, hostname, environment)
            
            # Network metrics
            net = psutil.net_io_counters()
            cls._save_metric('network', 'bytes_sent', net.bytes_sent / (1024**2), 'MB',
                           {}, hostname, environment)
            cls._save_metric('network', 'bytes_recv', net.bytes_recv / (1024**2), 'MB',
                           {}, hostname, environment)
            cls._save_metric('network', 'packets_sent', net.packets_sent, 'packets',
                           {}, hostname, environment)
            cls._save_metric('network', 'packets_recv', net.packets_recv, 'packets',
                           {}, hostname, environment)
            
            # Network connections
            connections = len(psutil.net_connections())
            cls._save_metric('network', 'connections', connections, 'count',
                           {}, hostname, environment)
            
            # Process metrics
            process = psutil.Process()
            cls._save_metric('process', 'memory_rss', process.memory_info().rss / (1024**2), 'MB',
                           {}, hostname, environment)
            cls._save_metric('process', 'memory_vms', process.memory_info().vms / (1024**2), 'MB',
                           {}, hostname, environment)
            cls._save_metric('process', 'cpu_percent', process.cpu_percent(), '%',
                           {}, hostname, environment)
            cls._save_metric('process', 'threads', process.num_threads(), 'count',
                           {}, hostname, environment)
            cls._save_metric('process', 'open_files', len(process.open_files()), 'count',
                           {}, hostname, environment)
            
            # System load
            if hasattr(os, 'getloadavg'):
                load_avg = os.getloadavg()
                cls._save_metric('system', 'load_1min', load_avg[0], 'load',
                               {}, hostname, environment)
                cls._save_metric('system', 'load_5min', load_avg[1], 'load',
                               {}, hostname, environment)
                cls._save_metric('system', 'load_15min', load_avg[2], 'load',
                               {}, hostname, environment)
            
            # Uptime
            boot_time = datetime.fromtimestamp(psutil.boot_time())
            uptime = (datetime.now() - boot_time).total_seconds()
            cls._save_metric('system', 'uptime', uptime / 3600, 'hours',
                           {}, hostname, environment)
            
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
    
    @classmethod
    def _collect_app_metrics(cls, hostname, environment):
        """Collect application-specific metrics"""
        try:
            from src.models.user import User
            from src.models.file import File
            from src.models.share import ShareRequest, SharedAccess
            from src.models.otp import OTPCode
            
            # User metrics
            total_users = User.query.count()
            active_sessions = UserSession.query.filter_by(is_active=True).count()
            new_users_24h = User.query.filter(
                User.created_at >= datetime.utcnow() - timedelta(hours=24)
            ).count()
            
            cls._save_metric('app', 'total_users', total_users, 'count',
                           {'type': 'total'}, hostname, environment)
            cls._save_metric('app', 'active_sessions', active_sessions, 'count',
                           {'type': 'active'}, hostname, environment)
            cls._save_metric('app', 'new_users_24h', new_users_24h, 'count',
                           {'period': '24h'}, hostname, environment)
            
            # File metrics
            total_files = File.query.count()
            total_storage = db.session.query(db.func.sum(File.original_size)).scalar() or 0
            files_24h = File.query.filter(
                File.upload_date >= datetime.utcnow() - timedelta(hours=24)
            ).count()
            
            cls._save_metric('app', 'total_files', total_files, 'count',
                           {'type': 'total'}, hostname, environment)
            cls._save_metric('app', 'total_storage_gb', total_storage / (1024**3), 'GB',
                           {'type': 'total'}, hostname, environment)
            cls._save_metric('app', 'files_24h', files_24h, 'count',
                           {'period': '24h'}, hostname, environment)
            
            # Share metrics
            pending_shares = ShareRequest.query.filter_by(status='pending').count()
            active_shares = ShareRequest.query.filter_by(status='accepted').count()
            
            cls._save_metric('app', 'pending_shares', pending_shares, 'count',
                           {'status': 'pending'}, hostname, environment)
            cls._save_metric('app', 'active_shares', active_shares, 'count',
                           {'status': 'active'}, hostname, environment)
            
            # OTP metrics
            active_otps = OTPCode.query.filter_by(is_used=False).filter(
                OTPCode.expires_at > datetime.utcnow()
            ).count()
            otps_24h = OTPCode.query.filter(
                OTPCode.created_at >= datetime.utcnow() - timedelta(hours=24)
            ).count()
            
            cls._save_metric('app', 'active_otps', active_otps, 'count',
                           {'type': 'active'}, hostname, environment)
            cls._save_metric('app', 'otps_24h', otps_24h, 'count',
                           {'period': '24h'}, hostname, environment)
            
            # API metrics
            api_requests_1h = ApiRequestLog.query.filter(
                ApiRequestLog.created_at >= datetime.utcnow() - timedelta(hours=1)
            ).count()
            
            avg_response_time = db.session.query(
                db.func.avg(ApiRequestLog.response_time)
            ).filter(
                ApiRequestLog.created_at >= datetime.utcnow() - timedelta(hours=1)
            ).scalar() or 0
            
            error_rate = db.session.query(
                db.func.count(ApiRequestLog.id)
            ).filter(
                ApiRequestLog.created_at >= datetime.utcnow() - timedelta(hours=1),
                ApiRequestLog.status_code >= 400
            ).scalar() or 0
            
            error_rate = (error_rate / api_requests_1h * 100) if api_requests_1h > 0 else 0
            
            cls._save_metric('app', 'api_requests_1h', api_requests_1h, 'count',
                           {'period': '1h'}, hostname, environment)
            cls._save_metric('app', 'avg_response_time', avg_response_time, 'ms',
                           {'period': '1h'}, hostname, environment)
            cls._save_metric('app', 'error_rate', error_rate, '%',
                           {'period': '1h'}, hostname, environment)
            
        except Exception as e:
            logger.error(f"Error collecting app metrics: {e}")
    
    @classmethod
    def _save_metric(cls, metric_type, metric_name, value, unit, tags, hostname, environment):
        """Save metric to database"""
        try:
            metric = SystemMetric(
                metric_type=metric_type,
                metric_name=metric_name,
                metric_value=float(value),
                metric_unit=unit,
                tags=tags,
                hostname=hostname,
                environment=environment
            )
            db.session.add(metric)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error saving metric: {e}")
    
    @classmethod
    def _emit_metrics_update(cls):
        """Emit real-time metrics update via WebSocket"""
        try:
            # Import socketio locally to avoid import issues
            from src.extensions import socketio
            
            # Check if socketio is properly initialized
            if socketio is None:
                logger.debug("SocketIO not available - skipping metrics emit")
                return
            
            # Check if socketio has the emit method
            if not hasattr(socketio, 'emit'):
                logger.debug("SocketIO missing emit method - skipping metrics emit")
                return
            
            # Get latest metrics
            metrics = cls.get_latest_metrics()
            
            # Only emit if there are metrics
            if metrics:
                socketio.emit('metrics_update', metrics, namespace='/monitoring')
                logger.debug("Metrics update emitted successfully")
            else:
                logger.debug("No metrics to emit")
                
        except ImportError as e:
            logger.debug(f"SocketIO not available for import: {e}")
        except AttributeError as e:
            logger.debug(f"SocketIO attribute error: {e}")
        except Exception as e:
            logger.error(f"Error emitting metrics update: {e}")
    
    @classmethod
    def _cleanup_old_metrics(cls):
        """Delete metrics older than retention period"""
        try:
            from flask import current_app
            retention_days = current_app.config.get('METRICS_RETENTION_DAYS', 30)
            cutoff = datetime.utcnow() - timedelta(days=retention_days)
            
            deleted = SystemMetric.query.filter(
                SystemMetric.timestamp < cutoff
            ).delete()
            
            if deleted > 0:
                db.session.commit()
                logger.info(f"🧹 Cleaned up {deleted} old metrics")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error cleaning up metrics: {e}")
    
    @classmethod
    def get_latest_metrics(cls, limit=1):
        """Get latest metrics for all types"""
        result = {}
        metric_types = ['cpu', 'memory', 'disk', 'network', 'app', 'system', 'process']
        
        for metric_type in metric_types:
            metrics = SystemMetric.query.filter_by(metric_type=metric_type)\
                .order_by(SystemMetric.timestamp.desc())\
                .limit(limit)\
                .all()
            
            result[metric_type] = [m.to_dict() for m in metrics]
        
        return result
    
    @classmethod
    def get_metrics_history(cls, metric_type, metric_name, hours=24):
        """Get historical metrics for charts"""
        since = datetime.utcnow() - timedelta(hours=hours)
        
        metrics = SystemMetric.query.filter_by(
            metric_type=metric_type,
            metric_name=metric_name
        ).filter(
            SystemMetric.timestamp >= since
        ).order_by(
            SystemMetric.timestamp.asc()
        ).all()
        
        return [m.to_dict() for m in metrics]
    
    @classmethod
    def get_aggregated_metrics(cls, metric_type, metric_name, interval='1h', hours=24):
        """Get aggregated metrics (avg, min, max) over time intervals"""
        from sqlalchemy import func
        
        since = datetime.utcnow() - timedelta(hours=hours)
        
        # Group by time interval
        results = db.session.query(
            func.date_format(SystemMetric.timestamp, '%Y-%m-%d %H:00:00').label('time_interval'),
            func.avg(SystemMetric.metric_value).label('avg_value'),
            func.min(SystemMetric.metric_value).label('min_value'),
            func.max(SystemMetric.metric_value).label('max_value')
        ).filter(
            SystemMetric.metric_type == metric_type,
            SystemMetric.metric_name == metric_name,
            SystemMetric.timestamp >= since
        ).group_by('time_interval').order_by('time_interval').all()
        
        return [
            {
                'interval': r.time_interval,
                'avg': float(r.avg_value) if r.avg_value else 0,
                'min': float(r.min_value) if r.min_value else 0,
                'max': float(r.max_value) if r.max_value else 0
            }
            for r in results
        ]