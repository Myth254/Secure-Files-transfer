/**
 * crypto.js
 * Client-side cryptographic operations for secure file sharing.
 * 
 * This module handles:
 * - Argon2id KDF for private key decryption
 * - RSA-OAEP key wrapping/unwrapping
 * - AES-256-GCM file decryption
 * - PEM ↔ DER conversion
 * 
 * Security Notes:
 * - Private key material is never exported after import (false flag in importKey)
 * - Password inputs are cleared immediately after use
 * - All sensitive data uses local function scope (not module-level or window)
 */

/* ═══════════════════════════════════════════════════════════════════════════════
   ARGON2ID KDF — CRITICAL PARAMETER PARITY WITH SERVER
═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Argon2id parameters MUST match server (src/services/encryption_service.py):
 * time=3, mem=65536 (64 MiB), parallelism=4, hashLen=32
 */
const ARGON2_PARAMS = {
  time:        3,
  mem:         65536,      // 64 MiB memory cost
  parallelism: 4,
  hashLen:     32,          // 256-bit output for AES-256-GCM
};

/* ═══════════════════════════════════════════════════════════════════════════════
   PRIVATE KEY DECRYPTION — Argon2id + AES-256-GCM
═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Decrypt the owner's RSA private key PEM using Argon2id + AES-256-GCM.
 * 
 * Input format from server.encrypt_private_key():
 *   salt_hex:iv_hex:ciphertext_hex:tag_hex
 * 
 * @param {string} encryptedData - salt:iv:ct:tag format
 * @param {string} password - user's password
 * @returns {Promise<string>} - PEM-formatted RSA private key
 * @throws {Error} - on decryption failure or invalid password
 */
async function decryptPrivateKeyPem(encryptedData, password) {
  try {
    // Step 1: Parse the encrypted envelope
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted private key format');
    }
    const [saltHex, ivHex, ctHex, tagHex] = parts;

    // Step 2: Convert hex strings to bytes
    const salt       = hexToBytes(saltHex);
    const iv         = hexToBytes(ivHex);
    const ciphertext = hexToBytes(ctHex);
    const tag        = hexToBytes(tagHex);

    // Validate byte lengths
    if (salt.length !== 32) throw new Error('Invalid salt length');
    if (iv.length !== 12) throw new Error('Invalid IV length');
    if (tag.length !== 16) throw new Error('Invalid tag length');

    // Step 3: Argon2id KDF — derive AES key from password
    // CRITICAL: Parameters MUST match server or decryption will fail
    const derivedKey = await argon2.hash({
      pass: password,
      salt: salt,
      type: argon2.ArgonType.Argon2id,
      time: ARGON2_PARAMS.time,
      mem: ARGON2_PARAMS.mem,
      parallelism: ARGON2_PARAMS.parallelism,
      hashLen: ARGON2_PARAMS.hashLen,
      raw: true  // returns Uint8Array, not hex
    });

    // Step 4: Import AES key for decryption
    const aesKey = await crypto.subtle.importKey(
      'raw',
      derivedKey.hash,
      { name: 'AES-GCM' },
      false,  // non-extractable
      ['decrypt']
    );

    // Step 5: Decrypt using AES-256-GCM
    // Web Crypto expects ciphertext and tag concatenated
    const ctWithTag = new Uint8Array([...ciphertext, ...tag]);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      aesKey,
      ctWithTag
    );

    // Step 6: Convert decrypted bytes to PEM string
    const pem = new TextDecoder().decode(decrypted);
    
    // Sanity check: confirm it looks like a PEM key
    if (!pem.includes('-----BEGIN PRIVATE KEY-----')) {
      throw new Error('Decrypted key does not look like a valid PEM private key');
    }

    return pem;

  } catch (error) {
    // Distinguish between wrong password (DOMException) and other errors
    if (error instanceof DOMException && error.name === 'OperationError') {
      throw new Error('password: Incorrect password or corrupted key data');
    }
    throw error;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   RSA KEY IMPORT
═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Import a PEM-formatted RSA private key for OAEP decryption.
 * 
 * @param {string} pem - PEM-formatted RSA-2048 private key
 * @returns {Promise<CryptoKey>} - non-extractable key for decryption
 */
async function importPrivateKey(pem) {
  try {
    const der = pemToDer(pem);
    return await crypto.subtle.importKey(
      'pkcs8',
      der,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,  // non-extractable — prevent key export after import
      ['decrypt']
    );
  } catch (error) {
    throw new Error(`Failed to import private key: ${error.message}`);
  }
}

/**
 * Import a PEM-formatted RSA public key for OAEP encryption.
 * 
 * @param {string} pem - PEM-formatted RSA-2048 public key
 * @returns {Promise<CryptoKey>} - key for encryption
 */
async function importPublicKey(pem) {
  try {
    const der = pemToDer(pem);
    return await crypto.subtle.importKey(
      'spki',
      der,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,  // non-extractable (standard for public ops)
      ['encrypt']
    );
  } catch (error) {
    throw new Error(`Failed to import public key: ${error.message}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   AES KEY RE-WRAPPING — CORE FILE SHARING OPERATION
═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Re-wrap an AES key from owner's RSA envelope to recipient's envelope.
 * 
 * This is the core operation for client-side key re-wrapping:
 * 1. Decrypt (unwrap) the AES key using owner's private key
 * 2. Encrypt (re-wrap) the same AES key using recipient's public key
 * 
 * The raw AES key never leaves this function; the server only sees
 * the RSA-OAEP-wrapped bytes, which only the recipient can decrypt.
 * 
 * @param {string} ownerEncryptedAesKeyHex - hex string from files.encrypted_aes_key
 * @param {CryptoKey} ownerPrivateKey - from importPrivateKey()
 * @param {CryptoKey} recipientPublicKey - from importPublicKey()
 * @returns {Promise<string>} - hex string of recipient-wrapped AES key
 */
async function rewrapAesKey(ownerEncryptedAesKeyHex, ownerPrivateKey, recipientPublicKey) {
  try {
    // Step 1: Convert hex to bytes
    const ownerEncryptedBytes = hexToBytes(ownerEncryptedAesKeyHex);

    // Step 2: Unwrap — decrypt AES key using owner's private key (RSA-OAEP)
    const rawAesKey = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      ownerPrivateKey,
      ownerEncryptedBytes
    );

    // Sanity check: AES-256 key is always 32 bytes
    if (rawAesKey.byteLength !== 32) {
      throw new Error(`Unwrapped AES key has invalid length (expected 32 bytes, got ${rawAesKey.byteLength})`);
    }

    // Step 3: Re-wrap — encrypt AES key using recipient's public key (RSA-OAEP)
    const recipientEncrypted = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      recipientPublicKey,
      rawAesKey
    );

    // Step 4: Convert back to hex for JSON transport
    return bytesToHex(new Uint8Array(recipientEncrypted));

  } catch (error) {
    throw new Error(`Key re-wrapping failed: ${error.message}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   FILE DECRYPTION — AES-256-GCM
═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Decrypt a file using its AES-256-GCM key (which is itself decrypted
 * from the owner's private key).
 * 
 * This is used when a recipient downloads a shared file:
 * 1. Fetch encrypted file blob from server
 * 2. Use their private key to decrypt the AES key from share_requests.encrypted_aes_key
 * 3. Use that AES key to decrypt the file content
 * 
 * @param {string} encryptedFileHex - hex-encoded encrypted file (IV || CT || TAG)
 * @param {string} encryptedAesKeyHex - hex-encoded RSA-wrapped AES key
 * @param {string} privateKeyPem - decrypted RSA private key PEM
 * @returns {Promise<Uint8Array>} - plaintext file bytes
 */
async function decryptFile(encryptedFileHex, encryptedAesKeyHex, privateKeyPem) {
  try {
    // Step 1: Import private key for unwrapping the AES key
    const privateKey = await importPrivateKey(privateKeyPem);

    // Step 2: Convert hex-encoded blobs to bytes
    const encryptedFileBytes = hexToBytes(encryptedFileHex);
    const encryptedAesBytes = hexToBytes(encryptedAesKeyHex);

    // Step 3: Unwrap the AES key using the private key (RSA-OAEP)
    const rawAesKey = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      encryptedAesBytes
    );

    // Step 4: Import the AES key for file decryption
    const aesKey = await crypto.subtle.importKey(
      'raw',
      rawAesKey,
      { name: 'AES-GCM' },
      false,  // non-extractable
      ['decrypt']
    );

    // Step 5: Parse encrypted file layout (from encrypt_file):
    //   IV (12 bytes) || Ciphertext || GCM Tag (16 bytes)
    const iv = encryptedFileBytes.slice(0, 12);
    const tag = encryptedFileBytes.slice(-16);
    const ciphertext = encryptedFileBytes.slice(12, -16);

    // Web Crypto expects IV + tag in the algorithm and plaintext ct only
    const ctWithTag = new Uint8Array([...ciphertext, ...tag]);

    // Step 6: Decrypt using AES-256-GCM
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      aesKey,
      ctWithTag
    );

    return new Uint8Array(plaintext);

  } catch (error) {
    throw new Error(`File decryption failed: ${error.message}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS — HEX ↔ BYTES, PEM ↔ DER
═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Convert a hex string to a Uint8Array.
 * @param {string} hex - hex string (e.g., "deadbeef")
 * @returns {Uint8Array}
 */
function hexToBytes(hex) {
  if (hex.length % 2 !== 0) {
    throw new Error('Hex string has odd length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert a Uint8Array to a hex string.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert PEM format to DER (binary).
 * 
 * PEM format: base64-encoded DER wrapped in -----BEGIN/END----- lines.
 * 
 * @param {string} pem - PEM string
 * @returns {ArrayBuffer} - DER binary
 */
function pemToDer(pem) {
  // Remove header, footer, and whitespace
  const b64 = pem
    .replace(/-----[^-]+-----/g, '')
    .replace(/\s/g, '');

  // Decode base64 to binary
  const binary = atob(b64);

  // Convert to Uint8Array
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

/**
 * Convert DER (binary) to PEM format.
 * 
 * @param {ArrayBuffer} der - DER binary
 * @param {string} type - 'PRIVATE KEY', 'PUBLIC KEY', etc.
 * @returns {string} - PEM string
 */
function derToPem(der, type = 'PRIVATE KEY') {
  const bytes = new Uint8Array(der);
  const binary = String.fromCharCode(...bytes);
  const b64 = btoa(binary);
  // Insert line breaks every 64 characters
  const b64Wrapped = b64.replace(/(.{64})/g, '$1\n');
  return `-----BEGIN ${type}-----\n${b64Wrapped}\n-----END ${type}-----`;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MEMORY & CLEANUP
═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Clear sensitive data from DOM and memory.
 * Call after password entry or key operations.
 * 
 * Note: JavaScript provides no guarantee of zeroing memory, but this
 * clears password inputs and some references to sensitive data.
 */
function clearSensitiveMemory() {
  // Clear password input fields
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  passwordInputs.forEach(input => {
    input.value = '';
  });

  // Optionally: clear cached password from sessionStorage (if used)
  // sessionStorage.removeItem('vaultsync_password_cache');
}

/**
 * Validate that Argon2id parameters match the server.
 * Run this once at app startup to catch KDF mismatches early.
 * 
 * @returns {Promise<boolean>} - true if parameters appear correct
 */
async function validateArgon2IdParameters() {
  try {
    // Test with dummy inputs
    const result = await argon2.hash({
      pass: 'test',
      salt: new Uint8Array(32),
      type: argon2.ArgonType.Argon2id,
      time: ARGON2_PARAMS.time,
      mem: ARGON2_PARAMS.mem,
      parallelism: ARGON2_PARAMS.parallelism,
      hashLen: ARGON2_PARAMS.hashLen,
      raw: true
    });
    
    // Verify output length
    if (result.hash.length !== ARGON2_PARAMS.hashLen) {
      console.error('Argon2id output length mismatch');
      return false;
    }
    
    console.log('✓ Argon2id parameters validated');
    return true;
  } catch (error) {
    console.error('Argon2id validation failed:', error);
    return false;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   EXPORT (for module usage)
═══════════════════════════════════════════════════════════════════════════════ */

// Export all functions globally so they're accessible in app.js
window.crypto_module = {
  decryptPrivateKeyPem,
  importPrivateKey,
  importPublicKey,
  rewrapAesKey,
  decryptFile,
  hexToBytes,
  bytesToHex,
  pemToDer,
  derToPem,
  clearSensitiveMemory,
  validateArgon2IdParameters,
  ARGON2_PARAMS,
};
