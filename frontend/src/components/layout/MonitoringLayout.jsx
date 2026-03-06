import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Navbar, Sidebar } from "../common";
import { useTheme } from "../../hooks/useTheme";
import { useMonitoring } from "../../hooks/useMonitoring";
import { useWebSocket } from "../../hooks/useWebSocket";
import {
  FiCpu,
  FiHardDrive,
  FiWifi,
  FiActivity,
  FiAlertCircle,
  FiClock,
  FiRefreshCw,
  FiPause,
  FiPlay,
} from "react-icons/fi";

const MonitoringLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState("1h");
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  const { isDark } = useTheme();
  const {
    systemMetrics,
    alerts,
    loading,
    refreshData,
    updateTimeRange,
    isConnected,
  } = useMonitoring();
  const { connectionError } = useWebSocket();

  // Handle time range change
  const handleTimeRangeChange = (range) => {
    setSelectedTimeRange(range);
    updateTimeRange(range);
  };

  // Handle auto-refresh toggle
  const handleAutoRefreshToggle = () => {
    setIsAutoRefresh((prev) => !prev);
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(() => {
      refreshData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isAutoRefresh, refreshData]);

  const timeRanges = [
    { value: "1h", label: "Last Hour" },
    { value: "6h", label: "Last 6 Hours" },
    { value: "24h", label: "Last 24 Hours" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
  ];

  const criticalAlerts =
    alerts?.filter(
      (a) => a.severity === "critical" || a.severity === "emergency",
    ) || [];
  const warningAlerts = alerts?.filter((a) => a.severity === "warning") || [];

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? "dark" : ""}`}>
      {/* Navbar */}
      <Navbar onMenuClick={() => setIsSidebarOpen(true)} />

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main content */}
        <main className="flex-1 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  System Monitoring
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Real-time system metrics and alerts
                </p>
              </div>

              {/* Connection status */}
              <div className="mt-4 sm:mt-0 flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                    }`}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {isConnected ? "Live" : "Disconnected"}
                  </span>
                </div>

                {connectionError && (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    {connectionError}
                  </div>
                )}
              </div>
            </div>

            {/* Time range selector */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <FiClock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Time Range:
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {timeRanges.map((range) => (
                    <button
                      key={range.value}
                      onClick={() => handleTimeRangeChange(range.value)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        selectedTimeRange === range.value
                          ? "bg-primary-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleAutoRefreshToggle}
                    className={`p-2 rounded-md transition-colors ${
                      isAutoRefresh
                        ? "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }`}
                    title={
                      isAutoRefresh ? "Auto-refresh on" : "Auto-refresh off"
                    }
                  >
                    {isAutoRefresh ? (
                      <FiPlay className="h-4 w-4" />
                    ) : (
                      <FiPause className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => refreshData()}
                    disabled={loading?.metrics}
                    className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                    title="Refresh now"
                  >
                    <FiRefreshCw
                      className={`h-4 w-4 ${loading?.metrics ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Alert summary */}
            {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
              <div className="mb-6 space-y-2">
                {criticalAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg"
                  >
                    <div className="flex items-start">
                      <FiAlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">
                          {alert.message}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {warningAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded-r-lg"
                  >
                    <div className="flex items-start">
                      <FiAlertCircle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                          {alert.message}
                        </p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick metrics summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      CPU Usage
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {systemMetrics?.cpu?.[0]?.value || 0}%
                    </p>
                  </div>
                  <FiCpu className="h-8 w-8 text-primary-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Memory Usage
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {systemMetrics?.memory?.[0]?.value || 0}%
                    </p>
                  </div>
                  <FiHardDrive className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Disk Usage
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {systemMetrics?.disk?.[0]?.value || 0}%
                    </p>
                  </div>
                  <FiHardDrive className="h-8 w-8 text-yellow-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Network
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {systemMetrics?.network?.[0]?.value || 0} MB/s
                    </p>
                  </div>
                  <FiWifi className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Main monitoring content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MonitoringLayout;
