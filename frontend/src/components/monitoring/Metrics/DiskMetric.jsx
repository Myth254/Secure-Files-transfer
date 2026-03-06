import React from "react";
import { FiDatabase } from "react-icons/fi";
import {
  getThresholdColor,
  getThresholdStatus,
} from "../../../utils/chartHelpers";

const DiskMetric = ({ data }) => {
  const currentValue = data?.[0]?.value || 0;
  const used = data?.[1]?.value || 0;
  const free = data?.[2]?.value || 0;
  const total = data?.[3]?.value || 0;

  const thresholdColor = getThresholdColor(currentValue, {
    warning: 85,
    critical: 95,
  });
  const status = getThresholdStatus(currentValue, {
    warning: 85,
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
          <FiDatabase className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Disk Usage
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
          <p className="text-xs text-gray-500 dark:text-gray-400">Used</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {used.toFixed(2)} GB
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Free</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {free.toFixed(2)} GB
          </p>
        </div>
      </div>
    </div>
  );
};

export default DiskMetric;
