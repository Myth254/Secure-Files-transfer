import React from "react";
import { FiAlertCircle, FiCheck, FiClock } from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";

const AlertCard = ({ alert, onAcknowledge }) => {
  const getSeverityStyles = (severity) => {
    switch (severity) {
      case "critical":
      case "emergency":
        return {
          bg: "bg-red-50 dark:bg-red-900/20",
          border: "border-red-500",
          text: "text-red-800 dark:text-red-300",
          icon: "text-red-500",
        };
      case "warning":
        return {
          bg: "bg-yellow-50 dark:bg-yellow-900/20",
          border: "border-yellow-500",
          text: "text-yellow-800 dark:text-yellow-300",
          icon: "text-yellow-500",
        };
      case "info":
        return {
          bg: "bg-blue-50 dark:bg-blue-900/20",
          border: "border-blue-500",
          text: "text-blue-800 dark:text-blue-300",
          icon: "text-blue-500",
        };
      default:
        return {
          bg: "bg-gray-50 dark:bg-gray-800",
          border: "border-gray-500",
          text: "text-gray-800 dark:text-gray-300",
          icon: "text-gray-500",
        };
    }
  };

  const getTimeAgo = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "some time ago";
    }
  };

  const styles = getSeverityStyles(alert.severity);

  return (
    <div className={`${styles.bg} border-l-4 ${styles.border} rounded-lg p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <FiAlertCircle
            className={`h-5 w-5 ${styles.icon} flex-shrink-0 mt-0.5`}
          />
          <div>
            <p className={`text-sm font-medium ${styles.text}`}>
              {alert.message}
            </p>
            <div className="flex items-center mt-1 space-x-4">
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <FiClock className="mr-1 h-3 w-3" />
                {getTimeAgo(alert.created_at)}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Value: {alert.metric_value}
              </span>
            </div>
          </div>
        </div>

        {alert.status === "firing" && (
          <button
            onClick={() => onAcknowledge(alert.id)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Acknowledge"
          >
            <FiCheck className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
};

export default AlertCard;
