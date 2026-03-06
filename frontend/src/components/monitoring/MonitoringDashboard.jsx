import React, { useState, useEffect } from "react";
import { useMonitoring } from "../../hooks/useMonitoring";
import { useWebSocket } from "../../hooks/useWebSocket";
import {
  CPUMetric,
  MemoryMetric,
  DiskMetric,
  NetworkMetric,
  ProcessMetric,
} from "./Metrics";
import { LineChart, BarChart, PieChart, GaugeChart } from "./Charts";
import { AlertList, AlertRules, AlertHistory } from "./Alerts";
import { ActiveSessions } from "../sessions/ActiveSessions";
import { ApiLogs } from "../logs/ApiLogs";
import LoadingSpinner from "../common/LoadingSpinner";
import {
  FiActivity,
  FiAlertCircle,
  FiServer,
  FiRefreshCw,
  FiClock,
  FiFilter,
} from "react-icons/fi";

const MonitoringDashboard = () => {
  const {
    systemMetrics,
    loading,
    refreshData,
    timeRange,
    updateTimeRange,
    autoRefresh,
    toggleAutoRefresh,
  } = useMonitoring();
  const { isConnected } = useWebSocket();
  const [selectedMetric, setSelectedMetric] = useState("all");

  const timeRanges = [
    { value: "1h", label: "Last Hour" },
    { value: "6h", label: "Last 6 Hours" },
    { value: "24h", label: "Last 24 Hours" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
  ];

  useEffect(() => {
    refreshData();
  }, [timeRange]);

  if (loading.metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center space-x-4">
            <FiActivity className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                System Monitoring
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Real-time system metrics and alerts
              </p>
            </div>
          </div>

          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            {/* Connection status */}
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

            {/* Auto-refresh toggle */}
            <button
              onClick={toggleAutoRefresh}
              className={`p-2 rounded-lg transition-colors ${
                autoRefresh
                  ? "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              }`}
              title={autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
            >
              <FiRefreshCw
                className={`h-5 w-5 ${autoRefresh ? "animate-spin" : ""}`}
              />
            </button>

            {/* Time range selector */}
            <select
              value={timeRange}
              onChange={(e) => updateTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {timeRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>

            {/* Metric filter */}
            <div className="relative">
              <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Metrics</option>
                <option value="cpu">CPU Only</option>
                <option value="memory">Memory Only</option>
                <option value="disk">Disk Only</option>
                <option value="network">Network Only</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* System Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <CPUMetric data={systemMetrics.cpu} />
        <MemoryMetric data={systemMetrics.memory} />
        <DiskMetric data={systemMetrics.disk} />
        <NetworkMetric data={systemMetrics.network} />
        <ProcessMetric data={systemMetrics.process} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            CPU Usage Over Time
          </h2>
          <LineChart
            data={systemMetrics.cpu}
            dataKey="value"
            xAxisKey="timestamp"
            color="#4f46e5"
            unit="%"
          />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Memory Usage
          </h2>
          <GaugeChart
            value={systemMetrics.memory?.[0]?.value || 0}
            max={100}
            thresholds={{ warning: 80, critical: 95 }}
            unit="%"
          />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Disk Usage by Type
          </h2>
          <PieChart data={systemMetrics.disk} dataKey="value" nameKey="name" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Network Traffic
          </h2>
          <BarChart
            data={systemMetrics.network}
            dataKey="value"
            xAxisKey="timestamp"
            color="#10b981"
            unit="MB/s"
          />
        </div>
      </div>

      {/* Alerts and Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Active Alerts
            </h2>
            <FiAlertCircle className="h-5 w-5 text-yellow-500" />
          </div>
          <AlertList />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Active Sessions
          </h2>
          <ActiveSessions />
        </div>
      </div>

      {/* Alert Rules and History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Alert Rules
          </h2>
          <AlertRules />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Alert History
          </h2>
          <AlertHistory />
        </div>
      </div>

      {/* API Logs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent API Requests
        </h2>
        <ApiLogs />
      </div>
    </div>
  );
};

export default MonitoringDashboard;
