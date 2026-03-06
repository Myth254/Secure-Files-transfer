# Secure File Transfer Platform - Backend

A secure file transfer platform with end-to-end encryption using AES + RSA.

## Features
- User authentication with JWT
- RSA key pair generation on registration
- File encryption with AES-256-GCM
- AES key encryption with RSA-2048-OAEP
- Secure file upload/download
- Server cannot decrypt user files

## Tech Stack
- **Backend**: Python Flask
- **Database**: MySQL
- **Authentication**: JWT
- **Encryption**: cryptography (RSA, AES-GCM)
- **Password Hashing**: bcrypt

## Setup

### 1. Prerequisites
- Python 3.8+
- MySQL 8.0+
- pip

### 2. Installation

```bash
# Clone the repository
git clone <repository-url>
cd secure-file-transfer/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt