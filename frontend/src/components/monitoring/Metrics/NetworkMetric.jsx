import React from "react";
import { FiWifi } from "react-icons/fi";
import { LineChart } from "../Charts";

const NetworkMetric = ({ data }) => {
  const upload = data?.filter((d) => d.name === "bytes_sent")?.[0]?.value || 0;
  const download =
    data?.filter((d) => d.name === "bytes_recv")?.[0]?.value || 0;
  const connections =
    data?.filter((d) => d.name === "connections")?.[0]?.value || 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <FiWifi className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Network
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Upload</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
            {upload.toFixed(2)} MB/s
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Download</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">
            {download.toFixed(2)} MB/s
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Active Connections
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {connections}
        </p>
      </div>

      {/* Mini chart */}
      <div className="h-16 mt-4">
        <LineChart
          data={data?.slice(0, 10) || []}
          dataKey="value"
          xAxisKey="timestamp"
          color="#3b82f6"
          showAxis={false}
          showTooltip={false}
          showLegend={false}
        />
      </div>
    </div>
  );
};

export default NetworkMetric;
