import React from "react";
import { useMonitoring } from "../../../hooks/useMonitoring";
import AlertCard from "./AlertCard";
import LoadingSpinner from "../../common/LoadingSpinner";
import { FiAlertCircle } from "react-icons/fi";

const AlertList = () => {
  const { alerts, loading, acknowledgeAlert } = useMonitoring();

  if (loading.alerts) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <FiAlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-gray-600 dark:text-gray-400">No active alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onAcknowledge={acknowledgeAlert}
        />
      ))}
    </div>
  );
};

export default AlertList;
