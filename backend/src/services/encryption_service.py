"""
Real encryption service using cryptography library
"""
import os
import bcrypt
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidTag
import logging
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

class EncryptionService:
    """Service for handling all encryption operations"""
    
    @staticmethod
    def generate_rsa_keypair() -> Tuple[str, str]:
        """
        Generate RSA 2048-bit key pair
        
        Returns:
            Tuple[str, str]: (private_key_pem, public_key_pem)
        """
        try:
            # Generate private key
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
                backend=default_backend()
            )
            
            # Get public key
            public_key = private_key.public_key()
            
            # Serialize private key (unencrypted)
            private_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ).decode('utf-8')
            
            # Serialize public key
            public_pem = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            ).decode('utf-8')
            
            logger.info("Generated RSA 2048-bit key pair")
            return private_pem, public_pem
            
        except Exception as e:
            logger.error(f"Failed to generate RSA keys: {e}")
            raise
    
    @staticmethod
    def encrypt_private_key(private_key_pem: str, password: str) -> str:
        """
        Encrypt private key with password using AES-GCM
        
        Args:
            private_key_pem: RSA private key in PEM format
            password: User's password
            
        Returns:
            str: Salt:IV:encrypted_data:tag (hex strings)
        """
        try:
            # Generate random salt
            salt = os.urandom(16)
            
            # Derive AES key from password using bcrypt KDF
            aes_key = bcrypt.kdf(
                password=password.encode('utf-8'),
                salt=salt,
                desired_key_bytes=32,  # AES-256
                rounds=100
            )
            
            # Generate random IV for AES-GCM
            iv = os.urandom(12)
            
            # Encrypt private key with AES-GCM
            cipher = Cipher(
                algorithms.AES(aes_key),
                modes.GCM(iv),
                backend=default_backend()
            )
            encryptor = cipher.encryptor()
            
            ciphertext = encryptor.update(private_key_pem.encode('utf-8')) + encryptor.finalize()
            tag = encryptor.tag
            
            # Format: salt:iv:ciphertext:tag (all hex)
            encrypted_data = f"{salt.hex()}:{iv.hex()}:{ciphertext.hex()}:{tag.hex()}"
            
            logger.debug("Encrypted private key with password")
            return encrypted_data
            
        except Exception as e:
            logger.error(f"Failed to encrypt private key: {e}")
            raise
    
    @staticmethod
    def decrypt_private_key(encrypted_data: str, password: str) -> str:
        """
        Decrypt private key with password
        
        Args:
            encrypted_data: Salt:IV:ciphertext:tag (hex strings)
            password: User's password
            
        Returns:
            str: Decrypted private key in PEM format
            
        Raises:
            ValueError: If password is incorrect or data is corrupted
        """
        try:
            # Parse encrypted data
            parts = encrypted_data.split(':')
            if len(parts) != 4:
                raise ValueError("Invalid encrypted data format")
            
            salt_hex, iv_hex, ciphertext_hex, tag_hex = parts
            
            # Convert hex to bytes
            salt = bytes.fromhex(salt_hex)
            iv = bytes.fromhex(iv_hex)
            ciphertext = bytes.fromhex(ciphertext_hex)
            tag = bytes.fromhex(tag_hex)
            
            # Derive AES key
            aes_key = bcrypt.kdf(
                password=password.encode('utf-8'),
                salt=salt,
                desired_key_bytes=32,
                rounds=100
            )
            
            # Decrypt with AES-GCM
            cipher = Cipher(
                algorithms.AES(aes_key),
                modes.GCM(iv, tag),
                backend=default_backend()
            )
            decryptor = cipher.decryptor()
            
            private_key_pem = decryptor.update(ciphertext) + decryptor.finalize()
            
            logger.debug("Decrypted private key")
            return private_key_pem.decode('utf-8')
            
        except InvalidTag:
            logger.error("Invalid tag when decrypting private key - wrong password or corrupted data")
            raise ValueError("Invalid password or corrupted data")
        except Exception as e:
            logger.error(f"Failed to decrypt private key: {e}")
            raise
    
    @staticmethod
    def encrypt_file(file_data: bytes, public_key_pem: str) -> Tuple[bytes, bytes]:
        """
        Encrypt file with AES-GCM and encrypt AES key with RSA-OAEP
        
        Args:
            file_data: Original file bytes
            public_key_pem: Recipient's RSA public key in PEM format
            
        Returns:
            Tuple[bytes, bytes]: (encrypted_file_bytes, encrypted_aes_key_bytes)
        """
        try:
            # 1. Generate random AES key (32 bytes = 256 bits)
            aes_key = os.urandom(32)
            
            # 2. Generate random IV for AES-GCM
            iv = os.urandom(12)
            
            # 3. Encrypt file with AES-GCM
            cipher = Cipher(
                algorithms.AES(aes_key),
                modes.GCM(iv),
                backend=default_backend()
            )
            encryptor = cipher.encryptor()
            
            ciphertext = encryptor.update(file_data) + encryptor.finalize()
            tag = encryptor.tag
            
            # Combine IV + ciphertext + tag
            encrypted_file = iv + ciphertext + tag
            
            # 4. Load RSA public key
            public_key = serialization.load_pem_public_key(
                public_key_pem.encode('utf-8'),
                backend=default_backend()
            )
            
            # 5. Encrypt AES key with RSA-OAEP
            encrypted_aes_key = public_key.encrypt(
                aes_key,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )
            
            logger.info(f"Encrypted file ({len(file_data)} bytes)")
            return encrypted_file, encrypted_aes_key
            
        except Exception as e:
            logger.error(f"Failed to encrypt file: {e}")
            raise
    
    @staticmethod
    def decrypt_file(encrypted_file: bytes, encrypted_aes_key: bytes, private_key_pem: str) -> bytes:
        """
        Decrypt file (for client-side use)
        
        Args:
            encrypted_file: IV + ciphertext + tag
            encrypted_aes_key: RSA-encrypted AES key
            private_key_pem: User's RSA private key in PEM format
            
        Returns:
            bytes: Decrypted file bytes
            
        Raises:
            ValueError: If authentication tag is invalid
        """
        try:
            # 1. Load RSA private key
            private_key = serialization.load_pem_private_key(
                private_key_pem.encode('utf-8'),
                password=None,
                backend=default_backend()
            )
            
            # 2. Decrypt AES key with RSA-OAEP
            aes_key = private_key.decrypt(
                encrypted_aes_key,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )
            
            # 3. Extract IV, ciphertext, and tag from encrypted file
            # Format: IV (12 bytes) + ciphertext + tag (16 bytes)
            iv = encrypted_file[:12]
            tag = encrypted_file[-16:]
            ciphertext = encrypted_file[12:-16]
            
            # 4. Decrypt file with AES-GCM
            cipher = Cipher(
                algorithms.AES(aes_key),
                modes.GCM(iv, tag),
                backend=default_backend()
            )
            decryptor = cipher.decryptor()
            
            decrypted_data = decryptor.update(ciphertext) + decryptor.finalize()
            
            logger.info(f"Decrypted file ({len(decrypted_data)} bytes)")
            return decrypted_data
            
        except InvalidTag:
            logger.error("Invalid authentication tag - file may be corrupted")
            raise ValueError("File integrity check failed")
        except Exception as e:
            logger.error(f"Failed to decrypt file: {e}")
            raise
    
    @staticmethod
    def validate_public_key(public_key_pem: str) -> bool:
        """
        Validate RSA public key format
        
        Args:
            public_key_pem: Public key in PEM format
            
        Returns:
            bool: True if key is valid
        """
        try:
            serialization.load_pem_public_key(
                public_key_pem.encode('utf-8'),
                backend=default_backend()
            )
            return True
        except Exception:
            return False
    
    @staticmethod
    def validate_private_key(private_key_pem: str) -> bool:
        """
        Validate RSA private key format
        
        Args:
            private_key_pem: Private key in PEM format
            
        Returns:
            bool: True if key is valid
        """
        try:
            serialization.load_pem_private_key(
                private_key_pem.encode('utf-8'),
                password=None,
                backend=default_backend()
            )
            return True
        except Exception:
            return False