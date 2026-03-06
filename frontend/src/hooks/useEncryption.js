import { useContext } from "react";
import { EncryptionContext } from "../context/EncryptionContext";

export const useEncryption = () => {
  const context = useContext(EncryptionContext);
  if (!context) {
    throw new Error("useEncryption must be used within EncryptionProvider");
  }
  return context;
};
