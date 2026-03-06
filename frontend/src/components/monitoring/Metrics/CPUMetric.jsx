import React from "react";
import { FiCpu } from "react-icons/fi";
import {
  getThresholdColor,
  getThresholdStatus,
} from "../../../utils/chartHelpers";

const CPUMetric = ({ data }) => {
  const currentValue = data?.[0]?.value || 0;
  const thresholdColor = getThresholdColor(currentValue, {
    warning: 80,
    critical: 95,
  });
  const status = getThresholdStatus(currentValue, {
    warning: 80,
    critical: 95,
  });

  const getStatusColor = () => {
    switch (status) {
      case "critical":
        return "text-red-600 dark:text-red-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-green-600 dark:text-green-400";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <FiCpu className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            CPU Usage
          </h3>
        </div>
        <span className={`text-2xl font-bold ${getStatusColor()}`}>
          {currentValue}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative pt-1">
        <div className="flex mb-2 items-center justify-between">
          <div>
            <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary-600 bg-primary-200 dark:text-primary-300 dark:bg-primary-900/30">
              Used
            </span>
          </div>
          <div className="text-right">
            <span
              className="text-xs font-semibold inline-block"
              style={{ color: thresholdColor }}
            >
              {currentValue}%
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
          <div
            style={{
              width: `${currentValue}%`,
              backgroundColor: thresholdColor,
            }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500"
          />
        </div>
      </div>

      {/* Additional info */}
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Cores</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {data?.[0]?.tags?.cores || "N/A"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Load Average
          </p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {data?.[1]?.value?.toFixed(2) || "0.00"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CPUMetric;
