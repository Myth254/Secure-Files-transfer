import React, { useState } from "react";
import { useMonitoring } from "../../../hooks/useMonitoring";
import { FiActivity, FiRefreshCw } from "react-icons/fi";
import LoadingSpinner from "../../common/LoadingSpinner";
import LogTable from "./LogTable";
import LogFilters from "./LogFilters";

const ApiLogs = () => {
  const { apiLogs, loading, refreshData } = useMonitoring();
  const [filters, setFilters] = useState({
    method: "all",
    status: "all",
    search: "",
  });

  const filteredLogs =
    apiLogs?.filter((log) => {
      if (filters.method !== "all" && log.method !== filters.method)
        return false;
      if (filters.status !== "all") {
        if (filters.status === "success" && log.status_code >= 400)
          return false;
        if (filters.status === "error" && log.status_code < 400) return false;
      }
      if (
        filters.search &&
        !log.endpoint.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      return true;
    }) || [];

  if (loading.logs) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FiActivity className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            API Request Logs
          </h3>
        </div>
        <button
          onClick={refreshData}
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Refresh"
        >
          <FiRefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Filters */}
      <LogFilters filters={filters} onFilterChange={setFilters} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Total Requests
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {filteredLogs.length}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Avg Response Time
          </p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">
            {(
              filteredLogs.reduce(
                (acc, log) => acc + (log.response_time || 0),
                0,
              ) / filteredLogs.length || 0
            ).toFixed(2)}
            ms
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Error Rate</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">
            {(
              (filteredLogs.filter((l) => l.status_code >= 400).length /
                filteredLogs.length) *
                100 || 0
            ).toFixed(1)}
            %
          </p>
        </div>
      </div>

      {/* Logs table */}
      <LogTable logs={filteredLogs} />
    </div>
  );
};

export default ApiLogs;
