import { useContext } from "react";
import { ShareContext } from "../context/ShareContext";

export const useShare = () => {
  const context = useContext(ShareContext);
  if (!context) {
    throw new Error("useShare must be used within ShareProvider");
  }
  return context;
};
