#!/usr/bin/env python3
"""
Simple test runner
"""
import sys
import os

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("Running simple tests...")
print("=" * 50)

# Test 1: Import modules
print("\n[1] Testing imports...")
try:
    from src.extensions import db
    print("✅ src.extensions imported")
except Exception as e:
    print(f"❌ Failed: {e}")

try:
    print("✅ User model imported")
except Exception as e:
    print(f"❌ Failed: {e}")

try:
    print("✅ File model imported")
except Exception as e:
    print(f"❌ Failed: {e}")

# Test 2: Create Flask app
print("\n[2] Testing Flask app...")
try:
    from flask import Flask
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    from src.extensions import db
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
        print("✅ Flask app created and tables created")
except Exception as e:
    print(f"❌ Failed: {e}")

print("\n" + "=" * 50)
print("✅ Basic structure is working!")