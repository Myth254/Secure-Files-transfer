import React from "react";
import { FiCpu, FiHardDrive, FiWifi, FiActivity } from "react-icons/fi";
import { LineChart } from "../Charts";

const MetricsWidget = ({ data, type, title, onExpand }) => {
  const getIcon = () => {
    switch (type) {
      case "cpu":
        return (
          <FiCpu className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        );
      case "memory":
        return (
          <FiHardDrive className="h-5 w-5 text-green-600 dark:text-green-400" />
        );
      case "disk":
        return (
          <FiHardDrive className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        );
      case "network":
        return <FiWifi className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      default:
        return (
          <FiActivity className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        );
    }
  };

  const getCurrentValue = () => {
    if (!data || data.length === 0) return "0";
    const value = data[0]?.value || 0;
    return type === "network" ? `${value.toFixed(2)} MB/s` : `${value}%`;
  };

  const getColor = () => {
    switch (type) {
      case "cpu":
        return "#4f46e5";
      case "memory":
        return "#10b981";
      case "disk":
        return "#f59e0b";
      case "network":
        return "#3b82f6";
      default:
        return "#6b7280";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getIcon()}
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
        <button
          onClick={onExpand}
          className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
        >
          Expand
        </button>
      </div>

      <div className="flex items-end justify-between mb-3">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {getCurrentValue()}
        </span>
        {data && data.length > 1 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {data.length} data points
          </span>
        )}
      </div>

      {/* Mini chart */}
      <div className="h-16">
        <LineChart
          data={data?.slice(-20) || []}
          dataKey="value"
          xAxisKey="timestamp"
          color={getColor()}
          showAxis={false}
          showTooltip={false}
          showLegend={false}
        />
      </div>
    </div>
  );
};

export default MetricsWidget;
