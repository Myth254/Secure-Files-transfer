#!/usr/bin/env python3
"""
Simple Database Connection Test
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_connection():
    """Test database connection"""
    print("=" * 50)
    print("DATABASE CONNECTION TEST")
    print("=" * 50)
    
    # Get database URI
    db_uri = os.environ.get('SQLALCHEMY_DATABASE_URI')
    
    if not db_uri:
        print("❌ ERROR: SQLALCHEMY_DATABASE_URI not found in .env")
        print("\nCreate a .env file with:")
        print('SQLALCHEMY_DATABASE_URI="mysql+mysqlconnector://username:password@localhost/secure_files"')
        return False
    
    print(f"Database URI: {db_uri}")
    
    # Method 1: Try mysql.connector
    print("\n[1] Testing with mysql.connector...")
    try:
        import mysql.connector
        
        # Parse the URI
        # Format: mysql+mysqlconnector://user:pass@host/db
        uri = db_uri.replace('mysql+mysqlconnector://', '')
        user_pass, host_db = uri.split('@')
        
        if ':' in user_pass:
            username, password = user_pass.split(':')
        else:
            username = user_pass
            password = ''
        
        host, database = host_db.split('/')
        
        # Connect
        conn = mysql.connector.connect(
            host=host,
            user=username,
            password=password if password else None,
            database=database
        )
        
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        
        print(f"✅ Connected! Test query result: {result}")
        
        # Show database info
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()[0]
        print(f"✅ MySQL Version: {version}")
        
        cursor.close()
        conn.close()
        return True
        
    except mysql.connector.Error as e:
        print(f"❌ MySQL Error: {e}")
        
        # Helpful error messages
        if e.errno == 1045:
            print("   → Access denied. Check username/password")
        elif e.errno == 1049:
            print("   → Database doesn't exist. Create it with:")
            print("     mysql -u root -p -e \"CREATE DATABASE secure_files;\"")
        elif e.errno == 2003:
            print("   → Can't connect to MySQL server")
            print("   → Is MySQL running? Try: sudo systemctl status mysql")
        return False
    
    except ImportError:
        print("❌ mysql-connector-python not installed")
        print("   Install with: pip install mysql-connector-python")
        return False
    
    except Exception as e:
        print(f"❌ General Error: {e}")
        return False

def test_sqlalchemy():
    """Test SQLAlchemy connection"""
    print("\n[2] Testing SQLAlchemy connection...")
    
    try:
        from sqlalchemy import create_engine, text
        
        db_uri = os.environ.get('SQLALCHEMY_DATABASE_URI')
        if not db_uri:
            return False
        
        engine = create_engine(db_uri)
        
        with engine.connect() as conn:
            # Simple test query
            result = conn.execute(text("SELECT 1"))
            print(f"✅ SQLAlchemy connected! Result: {result.fetchone()}")
            
            # List tables
            result = conn.execute(text("SHOW TABLES"))
            tables = [row[0] for row in result]
            
            if tables:
                print(f"✅ Tables found: {', '.join(tables)}")
            else:
                print("ℹ️  No tables in database")
            
            return True
            
    except Exception as e:
        print(f"❌ SQLAlchemy Error: {e}")
        return False

def create_test_database():
    """Create test database if needed"""
    print("\n[3] Creating test database...")
    
    try:
        import mysql.connector
        
        # Default connection (root)
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password=""  # Add your root password here
        )
        
        cursor = conn.cursor()
        
        # Create database
        cursor.execute("CREATE DATABASE IF NOT EXISTS secure_files")
        print("✅ Database 'secure_files' created/verified")
        
        # Create user (adjust as needed)
        cursor.execute("CREATE USER IF NOT EXISTS 'appuser'@'localhost' IDENTIFIED BY 'password123'")
        cursor.execute("GRANT ALL PRIVILEGES ON secure_files.* TO 'appuser'@'localhost'")
        cursor.execute("FLUSH PRIVILEGES")
        print("✅ User 'appuser' created")
        
        cursor.close()
        conn.close()
        
        # Update .env file
        with open('.env', 'w') as f:
            f.write('SQLALCHEMY_DATABASE_URI="mysql+mysqlconnector://appuser:password123@localhost/secure_files"')
        
        print("✅ .env file updated")
        return True
        
    except mysql.connector.Error as e:
        print(f"❌ Could not create database: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def quick_check():
    """Quick system check"""
    print("\n" + "=" * 50)
    print("QUICK SYSTEM CHECK")
    print("=" * 50)
    
    import subprocess
    
    # Check MySQL service
    print("Checking MySQL service...")
    try:
        result = subprocess.run(['mysql', '--version'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ MySQL installed: {result.stdout.strip()}")
        else:
            print("❌ MySQL not found in PATH")
    except:
        print("❌ Could not check MySQL")
    
    # Check Python packages
    print("\nChecking Python packages...")
    packages = ['mysql-connector-python', 'sqlalchemy', 'flask']
    
    for package in packages:
        try:
            if package == 'mysql-connector-python':
                import mysql.connector
                print(f"✅ {package} installed")
            elif package == 'sqlalchemy':
                import sqlalchemy
                print(f"✅ {package} installed")
            elif package == 'flask':
                import flask
                print(f"✅ {package} installed")
        except ImportError:
            print(f"❌ {package} NOT installed")

def main():
    """Main function"""
    
    # Check if .env exists
    if not os.path.exists('.env'):
        print("No .env file found. Creating one...")
        create = input("Create default database? (y/n): ")
        if create.lower() == 'y':
            create_test_database()
        else:
            print("\nCreate a .env file with:")
            print('SQLALCHEMY_DATABASE_URI="mysql+mysqlconnector://username:password@localhost/secure_files"')
            return
    
    # Run tests
    success1 = test_connection()
    success2 = test_sqlalchemy() if success1 else False
    
    print("\n" + "=" * 50)
    print("TEST SUMMARY")
    print("=" * 50)
    
    if success1 and success2:
        print("✅✅✅ ALL TESTS PASSED! ✅✅✅")
        print("\nYour database is ready. Start your app with:")
        print("python app.py")
    else:
        print("❌❌❌ TESTS FAILED ❌❌❌")
        
        # Run quick check
        run_check = input("\nRun system check? (y/n): ")
        if run_check.lower() == 'y':
            quick_check()
        
        print("\nTroubleshooting steps:")
        print("1. Make sure MySQL is running: sudo systemctl start mysql")
        print("2. Create database: mysql -u root -p -e \"CREATE DATABASE secure_files;\"")
        print("3. Update .env file with correct credentials")
        print("4. Install packages: pip install mysql-connector-python sqlalchemy flask-sqlalchemy")

if __name__ == "__main__":
    main()