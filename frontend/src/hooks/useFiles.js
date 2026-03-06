import { useContext } from "react";
import { FileContext } from "../context/FileContext";

export const useFiles = () => {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error("useFiles must be used within FileProvider");
  }
  return context;
};
