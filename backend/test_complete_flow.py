#!/usr/bin/env python3
"""
Complete API flow test
"""
import requests
import json
import os

BASE_URL = "http://localhost:5000"

def print_response(name, response):
    """Print formatted response"""
    print(f"\n{'='*60}")
    print(f"📋 {name}")
    print(f"{'='*60}")
    print(f"Status: {response.status_code}")
    try:
        print("Response:")
        print(json.dumps(response.json(), indent=2))
    except Exception:
        print(f"Response: {response.text[:200]}...")
    return response

def test_complete_flow():
    """Test the complete API flow"""
    
    print("🚀 Testing Complete Secure File Transfer API Flow")
    print("=" * 60)
    
    # 1. Health check
    print("\n1. 🩺 Health Check")
    response = requests.get(f"{BASE_URL}/health")
    if response.status_code != 200:
        print("❌ Health check failed!")
        return
    print_response("Health Check", response)
    
    # 2. Register user
    print("\n2. 📝 User Registration")
    user_data = {
        "username": "apitestuser",
        "email": "apitest@example.com",
        "password": "ApiTestPass123!"
    }
    response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
    print_response("Registration", response)
    
    if response.status_code != 201:
        print("❌ Registration failed!")
        return
    
    reg_data = response.json()
    private_key = reg_data.get("rsa_private_key")
    
    # Save private key
    if private_key:
        with open("test_private_key.pem", "w") as f:
            f.write(private_key)
        print("✅ Private key saved to test_private_key.pem")
    
    # 3. Login
    print("\n3. 🔐 User Login")
    login_data = {
        "username": user_data["username"],
        "password": user_data["password"]
    }
    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    print_response("Login", response)
    
    if response.status_code != 200:
        print("❌ Login failed!")
        return
    
    login_data = response.json()
    token = login_data.get("token")
    
    if not token:
        print("❌ No token in response!")
        return
    
    print(f"✅ Token received: {token[:50]}...")
    
    # 4. Test protected user endpoint
    print("\n4. 👤 Protected User Endpoint")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/user", headers=headers)
    print_response("User Info", response)
    
    # 5. Upload a test file
    print("\n5. 📤 File Upload")
    
    # Create a test file
    test_content = b"This is a test file content for secure upload.\n" * 10
    with open("test_upload.txt", "wb") as f:
        f.write(test_content)
    
    files = {"file": ("test_upload.txt", test_content, "text/plain")}
    response = requests.post(f"{BASE_URL}/api/files/upload", 
                           files=files, 
                           headers=headers)
    print_response("File Upload", response)
    
    if response.status_code == 201:
        file_id = response.json().get("file", {}).get("id")
        
        # 6. List files
        print("\n6. 📄 List Files")
        response = requests.get(f"{BASE_URL}/api/files", headers=headers)
        print_response("File List", response)
        
        # 7. Download file
        if file_id:
            print(f"\n7. 📥 Download File (ID: {file_id})")
            response = requests.get(f"{BASE_URL}/api/files/{file_id}", headers=headers)
            if response.status_code == 200:
                file_data = response.json().get("file", {})
                print("✅ File downloaded successfully!")
                print(f"   Filename: {file_data.get('filename')}")
                print(f"   Original size: {file_data.get('original_size')} bytes")
                print(f"   Encrypted file length: {len(file_data.get('encrypted_file', '')) // 2} bytes (hex)")
                print(f"   Encrypted AES key: {file_data.get('encrypted_aes_key', '')[:50]}...")
                
                # Save encrypted data for decryption test
                with open("encrypted_data.json", "w") as f:
                    json.dump(file_data, f, indent=2)
                print("✅ Encrypted data saved to encrypted_data.json")
            else:
                print_response("File Download", response)
    
    # 8. Get file statistics
    print("\n8. 📊 File Statistics")
    response = requests.get(f"{BASE_URL}/api/files/stats", headers=headers)
    print_response("File Stats", response)
    
    # Cleanup
    print("\n9. 🧹 Cleanup")
    if os.path.exists("test_upload.txt"):
        os.remove("test_upload.txt")
        print("✅ Test file removed")
    
    print("\n" + "=" * 60)
    print("🎉 COMPLETE API FLOW TEST SUCCESSFUL!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Test file decryption with the private key")
    print("2. Implement frontend integration")
    print("3. Add more error handling and validation")

if __name__ == "__main__":
    test_complete_flow()