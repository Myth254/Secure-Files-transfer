import json
import binascii
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

# 1. Load downloaded file
with open('downloaded_encrypted.json', 'r') as f:
    data = json.load(f)
    file_data = data['file']

# 2. Your RSA private key (from registration)
PRIVATE_KEY_PEM = """-----BEGIN PRIVATE KEY-----

MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC+TcwjNGg0hGCV
zUyogPDk88XH0SgWZCoVcujCTR6dKg1pshTRQwjDj2LqPHMwDuI1TNOY+1K3ZZfs
AX+KN/TZD68XS9cgjey4f5KyjhiCeR1XQi4AwIybD4OnSRg+rl9xK8qd187YzwJx
F1bpyZWHRxFdBhnHjx6pliOUsYmMvxYWiMWwCy71F6kxbsZcdN5DBSGYdD8epbgY
jAmxomRBhL7lKon2GhrtxMOVhJ3geLzqbyf6rZRDNC2MqPKPM7rIWL+BAieR+1o1
b7Kl1FWwaZP9k34QEsD4avplMVAeVZFf3IiRpRwv9tDIORktGTJzhuFtM3qjETsX
UaCDlidtAgMBAAECggEABdsLi0d8ZoFJ+dIMg4UdUi4wW8Y3zP0m4uxbYtqZNNcZ
Rfx1X4Z1qW7Pe8tc9JGcGf/Bd552Za9nu5rExMAC45HPZ7U/axK8Cxy4qtlH5qUC
Qq/zxLWVwpH5WoT2+pbGai/qxLZP1DZPBX9Ao6s+iqA25/1K7KLDUsWxDN9ixdcC
Tb+kIZorxJCsZesS0STkK/fD9bsgH/QROO0i2uRpRKImO6xYDgZv3v6Af1qyN8DP
/cR0MjYr40eo337D1nf76a1ovV7YnFwfp/pJDJhc//iJEYR8v6pUN2GnzLA77cH6
15oI6f7jgNEMomahoKGxX/2ychrnMeKalpyBM8v/EQKBgQD1P04qRj1zaA11Jkfv
f8F+BXQXWlzvpGOsb6Bi357F/atysMuV6Rdia0AET5bDo0T83Vz81ZLG+lqn8n1C
4W9tXtg26ZTBvTiINMJl5cL0Rz6bmzGLDs08GaflQ5eJCX6b4DYI+wi/El+uA1B/
O9p3hPcqSQ7CgOED8SmNmxhsawKBgQDGpcx3tcC4AwJkPrk1Nhv1kUmrBdeZzgT2
D7P3oNn1eQX7c6m0thRTRwXvo/kdUcg0Ag+Gf9gWS4TGDdklVH2P3ftB8hWpLZqh
UHGvZ3XLImPIm9sYtRMeFDSRwCw71qWN7QEuxdxM51TdtOXEw1b+ngNBW8HAl+m3
nIPKU/2xhwKBgQC5VgEFM5XG/FCHQsnENeENEqP77f8j3zCwJJ+peOMtLxn9D5yb
Cs7wQqrbVyZRbLZ6/fMC44gLtTEDkN6Wx3UEy1NMlFMl4pCxZmWuyeb94kVvJOZY
93OkQqM+QElpd3Jl7BgJy2R9uS3zfG+954afIi4Dl7h+xxTFfN/xMs9PRwKBgFfi
1MKFzBzdX/p/8asEJHyR6fjbXdbzWiiPK/070hKTl7z3IDcOc5Ggk5TBhB6fpyaz
XrEP8Md0Y+rIB7FHX0H+YQJ9G248+fOyxolnCat0rJb9tYKJ4kplgBiX4DodLiPL
nsFV0rDHjDmGpj1Wey+tMx2Afgk6bLHKclharpwTAoGBAPEAxlmOnFsxD4Fh7YCt
uDRXzqQR/HRvLoCa4EU1dWWGIABZ6tO4M9vkNQwgUvCy4ws23V6gcUBFIPjvLgO7
9cVBGk0atccHYhHWxDiD76eigRTV/2+TbljJ5gZCcTEwQg/K6fXhuNinlam8h2qX
1pmr5Xm487HFYT2GV4OeE123


-----END PRIVATE KEY-----"""

# 3. Convert hex strings back to bytes
encrypted_file = binascii.unhexlify(file_data['encrypted_file'])
encrypted_aes_key = binascii.unhexlify(file_data['encrypted_aes_key'])

# 4. Load RSA private key
private_key = serialization.load_pem_private_key(
    PRIVATE_KEY_PEM.encode(),
    password=None,
    backend=default_backend()
)

# 5. Decrypt AES key with RSA
aes_key = private_key.decrypt(
    encrypted_aes_key,
    padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()),
        algorithm=hashes.SHA256(),
        label=None
    )
)

# 6. Extract IV, ciphertext, and tag
# Format: IV (12 bytes) + ciphertext + tag (16 bytes)
iv = encrypted_file[:12]
tag = encrypted_file[-16:]
ciphertext = encrypted_file[12:-16]

# 7. Decrypt file with AES-GCM
cipher = Cipher(
    algorithms.AES(aes_key),
    modes.GCM(iv, tag),
    backend=default_backend()
)
decryptor = cipher.decryptor()
decrypted_data = decryptor.update(ciphertext) + decryptor.finalize()

# 8. Save decrypted file
with open('decrypted_file.txt', 'wb') as f:
    f.write(decrypted_data)

print(f"✅ File decrypted successfully!")
print(f"Original filename: {file_data['filename']}")
print(f"Decrypted size: {len(decrypted_data)} bytes")
print(f"Decrypted content: {decrypted_data.decode()}")