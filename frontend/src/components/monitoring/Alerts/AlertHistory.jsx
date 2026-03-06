import React, { useState } from "react";
import { useMonitoring } from "../../../hooks/useMonitoring";
import { FiClock, FiCheck, FiX, FiFilter } from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import LoadingSpinner from "../../common/LoadingSpinner";

const AlertHistory = () => {
  const { alertHistory, loading } = useMonitoring();
  const [filter, setFilter] = useState("all"); // all, firing, resolved, acknowledged

  const getTimeAgo = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "some time ago";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "firing":
        return <FiClock className="h-4 w-4 text-yellow-500" />;
      case "resolved":
        return <FiCheck className="h-4 w-4 text-green-500" />;
      case "acknowledged":
        return <FiCheck className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      warning:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[severity] || colors.info;
  };

  const filteredHistory =
    alertHistory?.filter((h) => filter === "all" || h.status === filter) || [];

  if (loading.alerts) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center space-x-2">
        <FiFilter className="h-4 w-4 text-gray-500" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">All Alerts</option>
          <option value="firing">Firing</option>
          <option value="resolved">Resolved</option>
          <option value="acknowledged">Acknowledged</option>
        </select>
      </div>

      {/* History list */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">
            No alert history found
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredHistory.map((alert) => (
            <div
              key={alert.id}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(alert.status)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {alert.rule_name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${getSeverityBadge(alert.severity)}`}
                    >
                      {alert.severity}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {alert.message}
                  </p>

                  <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-500">
                    <span>{getTimeAgo(alert.created_at)}</span>
                    <span>Value: {alert.metric_value}</span>
                    {alert.acknowledged_by && (
                      <span>Acknowledged by: {alert.acknowledged_by}</span>
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

export default AlertHistory;
