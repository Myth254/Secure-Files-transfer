import React, { createContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  savePrivateKey,
  getPrivateKey,
  deletePrivateKey,
  generateRSAKeyPair,
  cryptoKeyToPem,
  pemToCryptoKey,
  encryptFile,
  decryptFile,
  generateAESKey,
} from "../utils/encryptionHelpers";
import toast from "react-hot-toast";

// Create context
const EncryptionContext = createContext(null);

// Provider component
export const EncryptionProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [privateKey, setPrivateKey] = useState(null);
  const [publicKey, setPublicKey] = useState(null);
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check for stored private key on mount
  useEffect(() => {
    const checkStoredKey = async () => {
      try {
        const stored = localStorage.getItem("rsa_private_key");
        setHasStoredKey(!!stored);
      } catch (err) {
        console.error("Failed to check stored key:", err);
      }
    };

    if (isAuthenticated && user) {
      checkStoredKey();
    }
  }, [isAuthenticated, user]);

  const loadPrivateKey = useCallback(
    async (password) => {
      setLoading(true);
      setError(null);

      try {
        // Try to get from localStorage first (from registration)
        const storedKey = localStorage.getItem("rsa_private_key");

        if (storedKey) {
          // Convert PEM to CryptoKey
          const key = await pemToCryptoKey(storedKey, "private");
          setPrivateKey(key);

          // Store the PEM version
          localStorage.setItem("rsa_private_key_pem", storedKey);

          toast.success("Private key loaded successfully");
          return { success: true };
        }

        // If not in localStorage, try IndexedDB with password
        if (user) {
          const keyPem = await getPrivateKey(`user_${user.id}`, password);
          const key = await pemToCryptoKey(keyPem, "private");
          setPrivateKey(key);
          localStorage.setItem("rsa_private_key_pem", keyPem);
          toast.success("Private key loaded successfully");
          return { success: true };
        }

        setError("No private key found");
        return { success: false, error: "No private key found" };
      } catch (err) {
        const errorMessage =
          err.message === "Invalid password"
            ? "Invalid password"
            : "Failed to load private key";
        setError(errorMessage);
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  const storePrivateKey = useCallback(
    async (password) => {
      setLoading(true);
      setError(null);

      try {
        // Generate new RSA key pair
        const { privateKey: newPrivateKey, publicKey: newPublicKey } =
          await generateRSAKeyPair();

        // Convert to PEM for storage
        const privateKeyPem = await cryptoKeyToPem(newPrivateKey, "private");
        const publicKeyPem = await cryptoKeyToPem(newPublicKey, "public");

        // Store in IndexedDB with password
        if (user) {
          await savePrivateKey(`user_${user.id}`, privateKeyPem, password);
        }

        // Store PEM in state
        localStorage.setItem("rsa_private_key_pem", privateKeyPem);
        setPrivateKey(newPrivateKey);
        setPublicKey(newPublicKey);
        setHasStoredKey(true);

        toast.success("Private key generated and stored successfully");
        return {
          success: true,
          privateKey: privateKeyPem,
          publicKey: publicKeyPem,
        };
      } catch (err) {
        // Log the error for debugging
        console.error("Failed to generate private key:", err);

        const errorMessage = "Failed to generate private key";
        setError(errorMessage);
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  const clearPrivateKey = useCallback(async () => {
    setLoading(true);

    try {
      if (user) {
        await deletePrivateKey(`user_${user.id}`);
      }
      localStorage.removeItem("rsa_private_key");
      localStorage.removeItem("rsa_private_key_pem");
      setPrivateKey(null);
      setPublicKey(null);
      setHasStoredKey(false);
      toast.success("Private key cleared");
    } catch (err) {
      console.error("Failed to clear private key:", err);
      toast.error("Failed to clear private key");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const encryptFileWithKey = useCallback(async (file, aesKey) => {
    try {
      const encryptedBlob = await encryptFile(file, aesKey);
      return encryptedBlob;
    } catch (err) {
      console.error("Encryption failed:", err);
      throw new Error("Failed to encrypt file");
    }
  }, []);

  const decryptFileWithKey = useCallback(async (encryptedData, aesKey) => {
    try {
      const decryptedBlob = await decryptFile(encryptedData, aesKey);
      return decryptedBlob;
    } catch (err) {
      console.error("Decryption failed:", err);
      throw new Error("Failed to decrypt file");
    }
  }, []);

  const generateNewAESKey = useCallback(() => {
    return generateAESKey();
  }, []);

  const getPrivateKeyPem = useCallback(() => {
    return localStorage.getItem("rsa_private_key_pem");
  }, []);

  const value = {
    privateKey,
    publicKey,
    hasStoredKey,
    loading,
    error,
    loadPrivateKey,
    storePrivateKey,
    clearPrivateKey,
    encryptFileWithKey,
    decryptFileWithKey,
    generateNewAESKey,
    getPrivateKeyPem,
  };

  return (
    <EncryptionContext.Provider value={value}>
      {children}
    </EncryptionContext.Provider>
  );
};

// Export context for custom hook
export { EncryptionContext };
