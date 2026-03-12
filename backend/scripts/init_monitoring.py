#!/usr/bin/env python3
"""
Initialize Monitoring System
Run this script to set up monitoring tables and default data
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app import app
from src.extensions import db
from src.models.monitoring import AlertRule, DashboardConfig
from src.models.user import User

def init_monitoring():
    """Initialize monitoring system"""
    with app.app_context():
        print("🔧 Initializing Monitoring System...")
        
        # Create tables if they don't exist
        db.create_all()
        print("✅ Database tables verified")
        
        # Check if admin user exists
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            print("⚠️  Admin user not found. Please create admin user first.")
            return
        
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
            },
            {
                'name': 'Failed Login Attempts',
                'description': 'Multiple failed login attempts detected',
                'metric_type': 'security',
                'metric_name': 'failed_logins',
                'alert_condition': 'gt',
                'threshold_value': 10,
                'severity': 'warning',
                'duration_seconds': 300,
                'notify_email': True
            },
            {
                'name': 'No Active Users',
                'description': 'No active user sessions for 1 hour',
                'metric_type': 'app',
                'metric_name': 'active_sessions',
                'alert_condition': 'eq',
                'threshold_value': 0,
                'severity': 'warning',
                'duration_seconds': 3600,
                'notify_email': True
            }
        ]
        
        rules_created = 0
        for rule_data in default_rules:
            existing = AlertRule.query.filter_by(name=rule_data['name']).first()
            if not existing:
                rule = AlertRule(
                    **rule_data,
                    created_by=admin.id,
                    cooldown_seconds=300,
                    enabled=True
                )
                db.session.add(rule)
                rules_created += 1
        
        # Create default dashboard config for admin
        admin_config = DashboardConfig.query.filter_by(user_id=admin.id).first()
        if not admin_config:
            config = DashboardConfig(
                user_id=admin.id,
                layout={
                    "grid": [
                        {"i": "cpu", "x": 0, "y": 0, "w": 6, "h": 4},
                        {"i": "memory", "x": 6, "y": 0, "w": 6, "h": 4},
                        {"i": "disk", "x": 0, "y": 4, "w": 6, "h": 4},
                        {"i": "network", "x": 6, "y": 4, "w": 6, "h": 4},
                        {"i": "app", "x": 0, "y": 8, "w": 12, "h": 4},
                        {"i": "alerts", "x": 0, "y": 12, "w": 12, "h": 4},
                        {"i": "api", "x": 0, "y": 16, "w": 12, "h": 4}
                    ]
                },
                widgets=["cpu", "memory", "disk", "network", "app", "alerts", "api"],
                time_range="last_1h",
                refresh_interval=30,
                theme="light",
                default_dashboard=True
            )
            db.session.add(config)
        
        db.session.commit()
        
        print(f"✅ Created {rules_created} default alert rules")
        print("✅ Created default dashboard configuration")
        print("\n🎉 Monitoring system initialized successfully!")
        print("\n📊 Access the monitoring dashboard at: http://localhost:5000/monitoring")
        print("🔑 Login with your admin credentials to view")

if __name__ == '__main__':
    init_monitoring()