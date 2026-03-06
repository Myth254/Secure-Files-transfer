import React from "react";
import { useMonitoring } from "../hooks/useMonitoring";
import {
  LineChart,
  BarChart,
  PieChart,
  GaugeChart,
} from "../components/monitoring/Charts";
import {
  CPUMetric,
  MemoryMetric,
  DiskMetric,
  NetworkMetric,
} from "../components/monitoring/Metrics";
import {
  AlertList,
  AlertRules,
  AlertHistory,
} from "../components/monitoring/Alerts";
import { ActiveSessions } from "../components/monitoring/Sessions";
import { ApiLogs } from "../components/monitoring/Logs";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { FiActivity, FiAlertCircle, FiServer } from "react-icons/fi";

const MonitoringPage = () => {
  const { loading, systemMetrics } = useMonitoring();

  if (loading.metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          System Monitoring
        </h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <FiActivity className="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <CPUMetric data={systemMetrics.cpu} />
        <MemoryMetric data={systemMetrics.memory} />
        <DiskMetric data={systemMetrics.disk} />
        <NetworkMetric data={systemMetrics.network} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            CPU Usage Over Time
          </h2>
          <LineChart data={systemMetrics.cpu} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Memory Usage
          </h2>
          <GaugeChart value={systemMetrics.memory?.[0]?.value || 0} max={100} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Disk Usage by Type
          </h2>
          <PieChart data={systemMetrics.disk} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Network Traffic
          </h2>
          <BarChart data={systemMetrics.network} />
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

      {/* API Logs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent API Requests
        </h2>
        <ApiLogs />
      </div>

      {/* Alert Rules */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Alert Rules
        </h2>
        <AlertRules />
      </div>

      {/* Alert History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Alert History
        </h2>
        <AlertHistory />
      </div>
    </div>
  );
};

export default MonitoringPage;
