import React from "react";
import { FiAlertCircle, FiChevronRight } from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";

const AlertsWidget = ({ alerts, onViewAll, onAcknowledge }) => {
  const getTimeAgo = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "some time ago";
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
      case "emergency":
        return "bg-red-500";
      case "warning":
        return "bg-yellow-500";
      case "info":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const activeAlerts = alerts?.filter((a) => a.status === "firing") || [];
  const recentAlerts = activeAlerts.slice(0, 3);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FiAlertCircle className="h-5 w-5 text-red-500" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Active Alerts
          </h3>
          {activeAlerts.length > 0 && (
            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs">
              {activeAlerts.length}
            </span>
          )}
        </div>
        <button
          onClick={onViewAll}
          className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center"
        >
          View All
          <FiChevronRight className="h-4 w-4 ml-1" />
        </button>
      </div>

      {recentAlerts.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No active alerts
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentAlerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
            >
              <div className="flex items-start space-x-3">
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 ${getSeverityColor(alert.severity)}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {alert.alert_name}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {alert.message}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {getTimeAgo(alert.created_at)}
                    </span>
                    {alert.status === "firing" && (
                      <button
                        onClick={() => onAcknowledge(alert.id)}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsWidget;
