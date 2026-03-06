import React from "react";
import { FiCpu } from "react-icons/fi";

const ProcessMetric = ({ data }) => {
  const processes =
    data?.filter((d) => d.name === "processes")?.[0]?.value || 0;
  const threads = data?.filter((d) => d.name === "threads")?.[0]?.value || 0;
  const openFiles =
    data?.filter((d) => d.name === "open_files")?.[0]?.value || 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <FiCpu className="h-6 w-6 text-primary-600 dark:text-primary-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Process Info
        </h3>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Running Processes
          </span>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            {processes}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Threads
          </span>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            {threads}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Open Files
          </span>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            {openFiles}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProcessMetric;
