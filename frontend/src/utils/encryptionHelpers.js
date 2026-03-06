/**
 * Encryption Helpers
 * Utilities for client-side encryption/decryption operations
 */

import CryptoJS from "crypto-js";

// ============================================
// RSA Key Management
// ============================================

/**
 * Convert PEM formatted key to CryptoKey
 * @param {string} pemKey - PEM formatted key string
 * @param {string} type - 'public' or 'private'
 * @returns {Promise<CryptoKey>} CryptoKey object
 */
export const pemToCryptoKey = async (pemKey, type = "public") => {
  try {
    // Remove PEM headers and whitespace
    const pemContents = pemKey
      .replace(/-----BEGIN (PUBLIC|PRIVATE) KEY-----/g, "")
      .replace(/-----END (PUBLIC|PRIVATE) KEY-----/g, "")
      .replace(/\s/g, "");

    // Convert base64 to ArrayBuffer
    const binaryDer = Uint8Array.from(atob(pemContents), (c) =>
      c.charCodeAt(0),
    ).buffer;

    // Import key
    const keyFormat = type === "public" ? "spki" : "pkcs8";
    const keyUsage = type === "public" ? ["encrypt"] : ["decrypt"];

    return await crypto.subtle.importKey(
      keyFormat,
      binaryDer,
      {
        name: "RSA-OAEP",
        hash: { name: "SHA-256" },
      },
      true,
      keyUsage,
    );
  } catch (error) {
    console.error("Error converting PEM to CryptoKey:", error);
    throw new Error("Failed to import RSA key");
  }
};

/**
 * Generate a new RSA key pair
 * @returns {Promise<{publicKey: CryptoKey, privateKey: CryptoKey}>}
 */
export const generateRSAKeyPair = async () => {
  try {
    return await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: { name: "SHA-256" },
      },
      true,
      ["encrypt", "decrypt"],
    );
  } catch (error) {
    console.error("Error generating RSA key pair:", error);
    throw new Error("Failed to generate RSA key pair");
  }
};

/**
 * Export CryptoKey to PEM format
 * @param {CryptoKey} key - CryptoKey object
 * @param {string} type - 'public' or 'private'
 * @returns {Promise<string>} PEM formatted key
 */
export const cryptoKeyToPem = async (key, type = "public") => {
  try {
    const keyFormat = type === "public" ? "spki" : "pkcs8";
    const exported = await crypto.subtle.exportKey(keyFormat, key);
    const exportedAsString = String.fromCharCode.apply(
      null,
      new Uint8Array(exported),
    );
    const exportedAsBase64 = btoa(exportedAsString);

    const pemHeader =
      type === "public"
        ? "-----BEGIN PUBLIC KEY-----\n"
        : "-----BEGIN PRIVATE KEY-----\n";
    const pemFooter =
      type === "public"
        ? "\n-----END PUBLIC KEY-----"
        : "\n-----END PRIVATE KEY-----";

    return (
      pemHeader + exportedAsBase64.match(/.{1,64}/g).join("\n") + pemFooter
    );
  } catch (error) {
    console.error("Error exporting key to PEM:", error);
    throw new Error("Failed to export key");
  }
};

// ============================================
// AES Encryption/Decryption
// ============================================

/**
 * Generate a random AES key
 * @returns {string} Base64 encoded AES key
 */
export const generateAESKey = () => {
  return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Base64);
};

/**
 * Encrypt data with AES-GCM
 * @param {string|ArrayBuffer} data - Data to encrypt
 * @param {string} keyBase64 - Base64 encoded AES key
 * @returns {string} Encrypted data as hex string
 */
export const encryptAES = (data, keyBase64) => {
  try {
    const key = CryptoJS.enc.Base64.parse(keyBase64);
    const iv = CryptoJS.lib.WordArray.random(12);

    const encrypted = CryptoJS.AES.encrypt(data.toString(), key, {
      iv: iv,
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.NoPadding,
    });

    // Combine IV + ciphertext + tag
    const ivHex = iv.toString(CryptoJS.enc.Hex);
    const ciphertextHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
    const tagHex = encrypted.tag.toString(CryptoJS.enc.Hex);

    return ivHex + ciphertextHex + tagHex;
  } catch (error) {
    console.error("AES encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
};

/**
 * Decrypt AES-GCM encrypted data
 * @param {string} encryptedHex - Hex string of IV + ciphertext + tag
 * @param {string} keyBase64 - Base64 encoded AES key
 * @returns {string} Decrypted data
 */
export const decryptAES = (encryptedHex, keyBase64) => {
  try {
    const key = CryptoJS.enc.Base64.parse(keyBase64);

    // Extract IV (12 bytes = 24 hex chars), ciphertext, and tag (16 bytes = 32 hex chars)
    const ivHex = encryptedHex.substring(0, 24);
    const tagHex = encryptedHex.substring(encryptedHex.length - 32);
    const ciphertextHex = encryptedHex.substring(24, encryptedHex.length - 32);

    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const ciphertext = CryptoJS.enc.Hex.parse(ciphertextHex);
    const tag = CryptoJS.enc.Hex.parse(tagHex);

    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext, tag: tag },
      key,
      {
        iv: iv,
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.NoPadding,
      },
    );

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("AES decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
};

// ============================================
// File Encryption/Decryption
// ============================================

/**
 * Encrypt a file using AES-GCM
 * @param {File} file - File object to encrypt
 * @param {string} aesKeyBase64 - AES key for encryption
 * @returns {Promise<Blob>} Encrypted file as Blob
 */
export const encryptFile = async (file, aesKeyBase64) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);

        const key = CryptoJS.enc.Base64.parse(aesKeyBase64);
        const iv = CryptoJS.lib.WordArray.random(12);

        const encrypted = CryptoJS.AES.encrypt(wordArray, key, {
          iv: iv,
          mode: CryptoJS.mode.GCM,
          padding: CryptoJS.pad.NoPadding,
        });

        // Combine IV + ciphertext + tag
        const ivBytes = iv.toString(CryptoJS.enc.Latin1);
        const ciphertextBytes = encrypted.ciphertext.toString(
          CryptoJS.enc.Latin1,
        );
        const tagBytes = encrypted.tag.toString(CryptoJS.enc.Latin1);

        const encryptedBytes = ivBytes + ciphertextBytes + tagBytes;
        const encryptedBlob = new Blob([encryptedBytes], {
          type: "application/octet-stream",
        });

        resolve(encryptedBlob);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsBinaryString(file);
  });
};

/**
 * Decrypt a file using AES-GCM
 * @param {ArrayBuffer} encryptedData - Encrypted file data
 * @param {string} aesKeyBase64 - AES key for decryption
 * @returns {Promise<Blob>} Decrypted file as Blob
 */
export const decryptFile = async (encryptedData, aesKeyBase64) => {
  try {
    const data = new Uint8Array(encryptedData);

    // Extract IV (12 bytes), ciphertext, and tag (16 bytes)
    const iv = data.slice(0, 12);
    const tag = data.slice(data.length - 16);
    const ciphertext = data.slice(12, data.length - 16);

    const key = CryptoJS.enc.Base64.parse(aesKeyBase64);
    const ivWordArray = CryptoJS.lib.WordArray.create(iv);
    const ciphertextWordArray = CryptoJS.lib.WordArray.create(ciphertext);
    const tagWordArray = CryptoJS.lib.WordArray.create(tag);

    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertextWordArray, tag: tagWordArray },
      key,
      {
        iv: ivWordArray,
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.NoPadding,
      },
    );

    const decryptedBytes = decrypted.toString(CryptoJS.enc.Latin1);
    return new Blob([decryptedBytes], { type: "application/octet-stream" });
  } catch (error) {
    console.error("File decryption error:", error);
    throw new Error("Failed to decrypt file");
  }
};

// ============================================
// Key Storage (IndexedDB)
// ============================================

const DB_NAME = "SecureFileTransfer";
const STORE_NAME = "keys";
const DB_VERSION = 1;

let dbInstance = null;

/**
 * Open IndexedDB connection
 * @returns {Promise<IDBDatabase>}
 */
const openDB = async () => {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
};

/**
 * Save private key to IndexedDB
 * @param {string} keyId - Key identifier
 * @param {string} privateKeyPem - PEM formatted private key
 * @param {string} password - Password for encryption
 */
export const savePrivateKey = async (keyId, privateKeyPem, password) => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // Encrypt the private key with password
    const encryptedKey = CryptoJS.AES.encrypt(
      privateKeyPem,
      password,
    ).toString();

    return new Promise((resolve, reject) => {
      const request = store.put({
        id: keyId,
        key: encryptedKey,
        createdAt: new Date().toISOString(),
      });

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error saving private key:", error);
    throw new Error("Failed to save private key");
  }
};

/**
 * Get private key from IndexedDB
 * @param {string} keyId - Key identifier
 * @param {string} password - Password for decryption
 * @returns {Promise<string>} PEM formatted private key
 */
export const getPrivateKey = async (keyId, password) => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(keyId);

      request.onsuccess = () => {
        if (request.result) {
          try {
            const decrypted = CryptoJS.AES.decrypt(
              request.result.key,
              password,
            ).toString(CryptoJS.enc.Utf8);
            resolve(decrypted);
          } catch {
            reject(new Error("Invalid password"));
          }
        } else {
          reject(new Error("Key not found"));
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error getting private key:", error);
    throw new Error("Failed to retrieve private key");
  }
};

/**
 * Delete private key from IndexedDB
 * @param {string} keyId - Key identifier
 */
export const deletePrivateKey = async (keyId) => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(keyId);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error deleting private key:", error);
    throw new Error("Failed to delete private key");
  }
};

// ============================================
// Export all encryption helpers
// ============================================

export default {
  pemToCryptoKey,
  generateRSAKeyPair,
  cryptoKeyToPem,
  generateAESKey,
  encryptAES,
  decryptAES,
  encryptFile,
  decryptFile,
  savePrivateKey,
  getPrivateKey,
  deletePrivateKey,
};
