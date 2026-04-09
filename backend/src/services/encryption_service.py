"""
Encryption service — AES-256-GCM file encryption, RSA-2048-OAEP key wrapping,
Argon2id-based private-key KDF, and bcrypt password hashing.

Design notes
────────────
• File encryption is server-side as a transport layer. True E2EE requires the
  client to encrypt before upload; this service is the server-side fallback.
• Private keys are encrypted at rest using a key derived from the user's
  password via Argon2id (time_cost=3, memory_cost=65536, parallelism=4).
  The old bcrypt.kdf(rounds=100) has been replaced — it offered negligible
  brute-force resistance.
• generate_file_hash() returns an HMAC-SHA256 hex digest of the plaintext for
  server-side deduplication without exposing a plaintext existence oracle.
"""
import os
import hmac
import hashlib
import bcrypt
from flask import current_app, has_app_context
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey, RSAPrivateKey
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidTag
from argon2.low_level import hash_secret_raw, Type as Argon2Type
import logging
from typing import Tuple, cast

logger = logging.getLogger(__name__)

# ── Argon2id KDF parameters ───────────────────────────────────────────────────
# These values comply with OWASP recommendations for password-based KDFs.
# Increase time_cost or memory_cost on hardware that can afford it.
_ARGON2_TIME_COST    = 3
_ARGON2_MEMORY_COST  = 65_536   # 64 MiB
_ARGON2_PARALLELISM  = 4
_ARGON2_HASH_LEN     = 32       # 256-bit AES key
_ARGON2_SALT_LEN     = 32       # 256-bit salt


class EncryptionService:
    """Handles all server-side cryptographic operations."""

    # ── RSA key generation ────────────────────────────────────────────────

    @staticmethod
    def generate_rsa_keypair() -> Tuple[str, str]:
        """
        Generate an RSA-2048 key pair.

        Returns:
            (private_key_pem, public_key_pem) as UTF-8 strings.
        """
        try:
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
                backend=default_backend()
            )
            public_key = private_key.public_key()

            private_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ).decode('utf-8')

            public_pem = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            ).decode('utf-8')

            logger.info("Generated RSA-2048 key pair")
            return private_pem, public_pem

        except Exception as e:
            logger.error(f"RSA key generation failed: {e}")
            raise

    # ── Private-key envelope encryption ──────────────────────────────────

    @staticmethod
    def encrypt_private_key(private_key_pem: str, password: str) -> str:
        """
        Encrypt a PEM private key using a password-derived AES-256-GCM key.

        KDF: Argon2id (time_cost=3, mem=64MiB, parallelism=4, salt=32 B).
        Output format: ``<salt_hex>:<iv_hex>:<ciphertext_hex>:<tag_hex>``

        Args:
            private_key_pem: RSA private key in PEM format.
            password:        User's plaintext password.

        Returns:
            Colon-delimited hex string suitable for DB storage.
        """
        try:
            salt = os.urandom(_ARGON2_SALT_LEN)

            aes_key = hash_secret_raw(
                secret=password.encode('utf-8'),
                salt=salt,
                time_cost=_ARGON2_TIME_COST,
                memory_cost=_ARGON2_MEMORY_COST,
                parallelism=_ARGON2_PARALLELISM,
                hash_len=_ARGON2_HASH_LEN,
                type=Argon2Type.ID
            )

            iv = os.urandom(12)

            cipher = Cipher(
                algorithms.AES(aes_key),
                modes.GCM(iv),
                backend=default_backend()
            )
            encryptor = cipher.encryptor()
            ciphertext = encryptor.update(private_key_pem.encode('utf-8')) + encryptor.finalize()
            tag = encryptor.tag

            encrypted_data = (
                f"{salt.hex()}:{iv.hex()}:{ciphertext.hex()}:{tag.hex()}"
            )
            logger.debug("Encrypted private key with Argon2id + AES-256-GCM")
            return encrypted_data

        except Exception as e:
            logger.error(f"Private key encryption failed: {e}")
            raise

    @staticmethod
    def decrypt_private_key(encrypted_data: str, password: str) -> str:
        """
        Decrypt a private key previously encrypted by encrypt_private_key().

        Args:
            encrypted_data: ``<salt_hex>:<iv_hex>:<ciphertext_hex>:<tag_hex>``
            password:       User's plaintext password.

        Returns:
            PEM-encoded private key string.

        Raises:
            ValueError: Wrong password or corrupted data (InvalidTag).
        """
        try:
            parts = encrypted_data.split(':')
            if len(parts) != 4:
                raise ValueError("Invalid encrypted data format")

            salt_hex, iv_hex, ciphertext_hex, tag_hex = parts

            salt       = bytes.fromhex(salt_hex)
            iv         = bytes.fromhex(iv_hex)
            ciphertext = bytes.fromhex(ciphertext_hex)
            tag        = bytes.fromhex(tag_hex)

            aes_key = hash_secret_raw(
                secret=password.encode('utf-8'),
                salt=salt,
                time_cost=_ARGON2_TIME_COST,
                memory_cost=_ARGON2_MEMORY_COST,
                parallelism=_ARGON2_PARALLELISM,
                hash_len=_ARGON2_HASH_LEN,
                type=Argon2Type.ID
            )

            cipher = Cipher(
                algorithms.AES(aes_key),
                modes.GCM(iv, tag),
                backend=default_backend()
            )
            decryptor = cipher.decryptor()
            private_key_pem = decryptor.update(ciphertext) + decryptor.finalize()

            logger.debug("Decrypted private key successfully")
            return private_key_pem.decode('utf-8')

        except InvalidTag:
            logger.warning("AES-GCM tag mismatch — wrong password or corrupted data")
            raise ValueError("Invalid password or corrupted data")
        except Exception as e:
            logger.error(f"Private key decryption failed: {e}")
            raise

    # ── File encryption / decryption ─────────────────────────────────────

    @staticmethod
    def encrypt_file(file_data: bytes, public_key_pem: str) -> Tuple[bytes, bytes]:
        """
        Encrypt *file_data* with AES-256-GCM and wrap the AES key with
        RSA-2048-OAEP(SHA-256).

        NOTE: This is server-side encryption. True E2EE requires the client to
        call this logic locally before transmitting data to the server.

        Returns:
            (encrypted_file_bytes, encrypted_aes_key_bytes)
            encrypted_file layout: IV (12 B) ‖ ciphertext ‖ GCM tag (16 B)
        """
        try:
            aes_key = os.urandom(32)
            iv      = os.urandom(12)

            cipher = Cipher(
                algorithms.AES(aes_key),
                modes.GCM(iv),
                backend=default_backend()
            )
            encryptor  = cipher.encryptor()
            ciphertext = encryptor.update(file_data) + encryptor.finalize()
            tag        = encryptor.tag

            # IV ‖ ciphertext ‖ tag
            encrypted_file = iv + ciphertext + tag

            public_key = cast(RSAPublicKey, serialization.load_pem_public_key(
                public_key_pem.encode('utf-8'),
                backend=default_backend()
            ))
            encrypted_aes_key = public_key.encrypt(
                aes_key,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )

            logger.info(f"File encrypted ({len(file_data)} → {len(encrypted_file)} bytes)")
            return encrypted_file, encrypted_aes_key

        except Exception as e:
            logger.error(f"File encryption failed: {e}")
            raise

    @staticmethod
    def decrypt_file(
        encrypted_file: bytes,
        encrypted_aes_key: bytes,
        private_key_pem: str
    ) -> bytes:
        """
        Decrypt a file previously encrypted by encrypt_file().

        Args:
            encrypted_file:     IV (12 B) ‖ ciphertext ‖ GCM tag (16 B)
            encrypted_aes_key:  RSA-OAEP-wrapped AES key (bytes).
            private_key_pem:    User's RSA private key in PEM format.

        Returns:
            Plaintext file bytes.

        Raises:
            ValueError: GCM authentication tag is invalid (file tampered).
        """
        try:
            private_key = cast(RSAPrivateKey, serialization.load_pem_private_key(
                private_key_pem.encode('utf-8'),
                password=None,
                backend=default_backend()
            ))

            aes_key = private_key.decrypt(
                encrypted_aes_key,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )

            if len(encrypted_file) < 28:
                raise ValueError(
                    f"Encrypted file too short ({len(encrypted_file)} bytes) to contain IV + tag"
                )

            iv         = encrypted_file[:12]
            tag        = encrypted_file[-16:]
            ciphertext = encrypted_file[12:-16]

            cipher = Cipher(
                algorithms.AES(aes_key),
                modes.GCM(iv, tag),
                backend=default_backend()
            )
            decryptor      = cipher.decryptor()
            decrypted_data = decryptor.update(ciphertext) + decryptor.finalize()

            logger.info(f"File decrypted ({len(decrypted_data)} bytes)")
            return decrypted_data

        except InvalidTag:
            logger.error("GCM authentication tag invalid — file may be corrupted or tampered")
            raise ValueError("File integrity check failed")
        except Exception as e:
            logger.error(f"File decryption failed: {e}")
            raise

    # ── File hashing ──────────────────────────────────────────────────────

    @staticmethod
    def generate_file_hash(file_data: bytes) -> str:
        """
        Compute a keyed SHA-256 digest of *file_data* for server-side deduplication.

        Args:
            file_data: Raw (plaintext) file bytes.

        Returns:
            Lowercase hex string (64 characters).
        """
        if has_app_context():
            secret = (
                current_app.config.get('FILE_HASH_SECRET')
                or current_app.config.get('SECRET_KEY')
            )
        else:
            secret = os.environ.get('FILE_HASH_SECRET') or os.environ.get('SECRET_KEY')

        if not secret:
            logger.warning("FILE_HASH_SECRET/SECRET_KEY unavailable; falling back to unkeyed SHA-256")
            return hashlib.sha256(file_data).hexdigest()

        return hmac.HMAC(
            str(secret).encode('utf-8'),
            file_data,
            hashlib.sha256,
        ).hexdigest()

    # ── Password hashing (bcrypt) ─────────────────────────────────────────

    @staticmethod
    def hash_password(password: str, rounds: int = 12) -> str:
        """
        Hash a password with bcrypt.

        Args:
            password: Plaintext password.
            rounds:   bcrypt cost factor (default 12; use 13 in production).

        Returns:
            bcrypt hash string.
        """
        salt = bcrypt.gensalt(rounds=rounds)
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """
        Constant-time bcrypt password verification.

        Args:
            password:      Plaintext candidate.
            password_hash: Stored bcrypt hash.

        Returns:
            True if password matches, False otherwise.
        """
        try:
            return bcrypt.checkpw(
                password.encode('utf-8'),
                password_hash.encode('utf-8')
            )
        except Exception:
            return False

    # ── Key validation helpers ────────────────────────────────────────────

    @staticmethod
    def validate_public_key(public_key_pem: str) -> bool:
        """Return True if *public_key_pem* is a valid PEM RSA public key."""
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
        """Return True if *private_key_pem* is a valid unencrypted PEM RSA private key."""
        try:
            serialization.load_pem_private_key(
                private_key_pem.encode('utf-8'),
                password=None,
                backend=default_backend()
            )
            return True
        except Exception:
            return False

    # ── Key re-wrapping for file sharing ─────────────────────────────────

    @staticmethod
    def rewrap_aes_key(
        encrypted_aes_key: bytes,
        owner_private_key_pem: str,
        recipient_public_key_pem: str
    ) -> bytes:
        """
        Re-wrap an AES key from the owner's RSA envelope to the recipient's.

        This is the server-side fallback for share key re-wrapping. In a
        true E2EE model the client performs this operation so the server
        never sees the raw AES key. This method exists for architectures
        where the owner explicitly delegates re-wrapping to the server
        (e.g., after OTP-authenticated share acceptance).

        Args:
            encrypted_aes_key:       Owner's RSA-OAEP-wrapped AES key (bytes).
            owner_private_key_pem:   Owner's decrypted PEM private key.
            recipient_public_key_pem: Recipient's PEM public key.

        Returns:
            Recipient's RSA-OAEP-wrapped AES key (bytes).
        """
        try:
            owner_private = cast(RSAPrivateKey, serialization.load_pem_private_key(
                owner_private_key_pem.encode('utf-8'),
                password=None,
                backend=default_backend()
            ))
            oaep = padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
            raw_aes_key = owner_private.decrypt(encrypted_aes_key, oaep)

            recipient_public = cast(RSAPublicKey, serialization.load_pem_public_key(
                recipient_public_key_pem.encode('utf-8'),
                backend=default_backend()
            ))
            recipient_wrapped = recipient_public.encrypt(raw_aes_key, oaep)

            logger.info("AES key re-wrapped for recipient")
            return recipient_wrapped

        except Exception as e:
            logger.error(f"Key re-wrapping failed: {e}")
            raise
