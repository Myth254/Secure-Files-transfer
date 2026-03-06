import requests
import json
import time

BASE_URL = "http://localhost:5000"

def test_otp_console():
    print("🔐 TESTING OTP - CHECK CONSOLE FOR CODE")
    print("=" * 60)
    
    # 1. Register
    print("\n1. Registering user...")
    register_data = {
        "username": "Sabaya",
        "email": "Sabaya@gmail.com",
        "password": "securepassword123!"
    }
    
    resp = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
    user_data = resp.json()
    print(f"✅ User registered: {user_data['user']['username']}")
    
    # 2. Login - OTP will appear in console
    print("\n2. Logging in - CHECK CONSOLE FOR OTP CODE...")
    login_data = {
        "username": register_data["username"],
        "password": register_data["password"]
    }
    
    resp = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    login_result = resp.json()
    
    if resp.status_code != 200:
        print(f"❌ Login failed: {login_result}")
        return
    
    otp_id = login_result['otp_id']
    user_id = login_result['user_id']
    print(f"✅ Password verified! OTP ID: {otp_id}")
    
    # 3. Ask for OTP from console
    print("\n3. LOOK AT THE CONSOLE WHERE YOUR FLASK SERVER IS RUNNING")
    otp_code = input("Enter the 6-digit OTP code from console: ")
    
    # 4. Verify OTP
    print("\n4. Verifying OTP...")
    verify_data = {
        "otp_id": otp_id,
        "otp_code": otp_code,
        "user_id": user_id
    }
    
    resp = requests.post(f"{BASE_URL}/api/auth/verify-login-otp", json=verify_data)
    
    if resp.status_code == 200:
        result = resp.json()
        print("✅ LOGIN SUCCESSFUL!")
        print(f"Token: {result['token'][:50]}...")
    else:
        print(f"❌ OTP verification failed: {resp.json()}")

if __name__ == "__main__":
    test_otp_console()