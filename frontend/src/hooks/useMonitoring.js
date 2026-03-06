import { useContext } from "react";
import { MonitoringContext } from "../context/MonitoringContext";

export const useMonitoring = () => {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error("useMonitoring must be used within MonitoringProvider");
  }
  return context;
};
