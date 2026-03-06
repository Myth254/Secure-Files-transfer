import React, { useState } from "react";
import { useMonitoring } from "../../../hooks/useMonitoring";
import { FiUsers, FiClock, FiMapPin, FiMonitor } from "react-icons/fi";
import LoadingSpinner from "../../common/LoadingSpinner";
import SessionTable from "./SessionTable";
import SessionMap from "./SessionMap";

const ActiveSessions = () => {
  const { sessions, loading, terminateSession } = useMonitoring();
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'map'

  if (loading.sessions) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  const stats = {
    total: sessions?.length || 0,
    mobile: sessions?.filter((s) => s.client?.device === "mobile").length || 0,
    desktop:
      sessions?.filter((s) => s.client?.device === "desktop").length || 0,
    uniqueCountries: new Set(sessions?.map((s) => s.client?.country)).size || 0,
  };

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Active Sessions
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Unique Countries
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {stats.uniqueCountries}
          </p>
        </div>
      </div>

      {/* Device stats */}
      <div className="flex items-center space-x-4 text-sm">
        <div className="flex items-center">
          <FiMonitor className="mr-1 h-4 w-4 text-blue-500" />
          <span className="text-gray-600 dark:text-gray-400">
            Desktop: {stats.desktop}
          </span>
        </div>
        <div className="flex items-center">
          <FiMonitor className="mr-1 h-4 w-4 text-green-500 transform rotate-90" />
          <span className="text-gray-600 dark:text-gray-400">
            Mobile: {stats.mobile}
          </span>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Active Sessions
        </h3>
        <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === "table"
                ? "bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
            title="Table View"
          >
            <FiUsers className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === "map"
                ? "bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
            title="Map View"
          >
            <FiMapPin className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Sessions display */}
      {viewMode === "table" ? (
        <SessionTable sessions={sessions} onTerminate={terminateSession} />
      ) : (
        <SessionMap sessions={sessions} />
      )}
    </div>
  );
};

export default ActiveSessions;
