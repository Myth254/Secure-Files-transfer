import React, { createContext, useState, useEffect, useCallback } from "react";
import { monitoringAPI } from "../services/api/monitoringAPI";
import { useAuth } from "../hooks/useAuth";
import { useWebSocket } from "../hooks/useWebSocket";
import toast from "react-hot-toast";

// Create context
const MonitoringContext = createContext(null);

// Provider component
export const MonitoringProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const {
    isConnected,
    metrics: wsMetrics,
    alerts: wsAlerts,
  } = useWebSocket() || {};

  const [systemMetrics, setSystemMetrics] = useState({
    cpu: [],
    memory: [],
    disk: [],
    network: [],
    process: [],
  });
  const [appMetrics, setAppMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [alertRules, setAlertRules] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [apiLogs, setApiLogs] = useState([]);
  const [apiSummary, setApiSummary] = useState(null);
  const [dashboardConfig, setDashboardConfig] = useState(null);
  const [loading, setLoading] = useState({
    metrics: false,
    alerts: false,
    sessions: false,
    logs: false,
  });
  const [timeRange, setTimeRange] = useState("1h");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await monitoringAPI.getCurrentMetrics();

      // Organize metrics by type
      const metrics = response.data.metrics;
      setSystemMetrics({
        cpu: metrics.cpu || [],
        memory: metrics.memory || [],
        disk: metrics.disk || [],
        network: metrics.network || [],
        process: metrics.process || [],
      });
      setAppMetrics(metrics.app || []);

      return metrics;
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
      throw err;
    }
  }, []);

  const fetchMetricHistory = useCallback(
    async (metricType, metricName) => {
      try {
        const hours = parseInt(timeRange.replace(/[^0-9]/g, "")) || 1;
        const response = await monitoringAPI.getMetricHistory(
          metricType,
          metricName,
          hours,
        );
        return response.data.history;
      } catch (err) {
        console.error("Failed to fetch metric history:", err);
        throw err;
      }
    },
    [timeRange],
  );

  const fetchAlertRules = useCallback(async () => {
    try {
      const response = await monitoringAPI.getAlertRules();
      setAlertRules(response.data.rules || []);
    } catch (err) {
      console.error("Failed to fetch alert rules:", err);
    }
  }, []);

  const fetchActiveAlerts = useCallback(async () => {
    try {
      const response = await monitoringAPI.getActiveAlerts();
      setAlerts(response.data.alerts || []);
    } catch (err) {
      console.error("Failed to fetch active alerts:", err);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await monitoringAPI.getActiveSessions();
      setSessions(response.data.sessions || []);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  }, []);

  const fetchApiLogs = useCallback(async () => {
    try {
      const response = await monitoringAPI.getApiLogs(50);
      setApiLogs(response.data.logs || []);
    } catch (err) {
      console.error("Failed to fetch API logs:", err);
    }
  }, []);

  const fetchApiSummary = useCallback(async () => {
    try {
      const hours = parseInt(timeRange.replace(/[^0-9]/g, "")) || 24;
      const response = await monitoringAPI.getApiSummary(hours);
      setApiSummary(response.data.summary);
    } catch (err) {
      console.error("Failed to fetch API summary:", err);
    }
  }, [timeRange]);

  const fetchDashboardConfig = useCallback(async () => {
    try {
      const response = await monitoringAPI.getDashboardConfig();
      setDashboardConfig(response.data.config);
    } catch (err) {
      console.error("Failed to fetch dashboard config:", err);
      // Set default config
      setDashboardConfig({
        layout: "default",
        widgets: [
          "cpu",
          "memory",
          "disk",
          "network",
          "alerts",
          "api-logs",
          "sessions",
        ],
        timeRange: "1h",
        refreshInterval: 30,
        theme: "light",
      });
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading((prev) => ({
      ...prev,
      metrics: true,
      alerts: true,
      sessions: true,
      logs: true,
    }));

    try {
      await Promise.all([
        fetchMetrics(),
        fetchAlertRules(),
        fetchActiveAlerts(),
        fetchSessions(),
        fetchApiLogs(),
        fetchApiSummary(),
        fetchDashboardConfig(),
      ]);
    } catch (err) {
      console.error("Failed to load monitoring data:", err);
      toast.error("Failed to load monitoring data");
    } finally {
      setLoading({
        metrics: false,
        alerts: false,
        sessions: false,
        logs: false,
      });
    }
  }, [
    fetchMetrics,
    fetchAlertRules,
    fetchActiveAlerts,
    fetchSessions,
    fetchApiLogs,
    fetchApiSummary,
    fetchDashboardConfig,
  ]);

  const refreshData = useCallback(async () => {
    try {
      await Promise.all([
        fetchMetrics(),
        fetchActiveAlerts(),
        fetchSessions(),
        fetchApiLogs(),
        fetchApiSummary(),
      ]);
    } catch (err) {
      console.error("Failed to refresh monitoring data:", err);
    }
  }, [
    fetchMetrics,
    fetchActiveAlerts,
    fetchSessions,
    fetchApiLogs,
    fetchApiSummary,
  ]);

  const updateMetricsFromWebSocket = useCallback((newMetrics) => {
    if (newMetrics.cpu) {
      setSystemMetrics((prev) => ({
        ...prev,
        cpu: [...(newMetrics.cpu || []), ...prev.cpu].slice(0, 60),
      }));
    }
    if (newMetrics.memory) {
      setSystemMetrics((prev) => ({
        ...prev,
        memory: [...(newMetrics.memory || []), ...prev.memory].slice(0, 60),
      }));
    }
    if (newMetrics.disk) {
      setSystemMetrics((prev) => ({
        ...prev,
        disk: [...(newMetrics.disk || []), ...prev.disk].slice(0, 60),
      }));
    }
    if (newMetrics.network) {
      setSystemMetrics((prev) => ({
        ...prev,
        network: [...(newMetrics.network || []), ...prev.network].slice(0, 60),
      }));
    }
  }, []);

  // Update metrics from WebSocket
  useEffect(() => {
    if (wsMetrics) {
      updateMetricsFromWebSocket(wsMetrics);
    }
  }, [wsMetrics, updateMetricsFromWebSocket]);

  // Update alerts from WebSocket
  useEffect(() => {
    if (wsAlerts && wsAlerts.length > 0) {
      setAlerts((prev) => [...wsAlerts, ...prev].slice(0, 50));
    }
  }, [wsAlerts]);

  // Auto-refresh data
  useEffect(() => {
    if (!isAuthenticated || !autoRefresh) return;

    const interval = setInterval(() => {
      refreshData();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, autoRefresh, refreshInterval, refreshData]);

  // Initial data load
  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated, loadAllData]);

  const updateDashboardConfig = useCallback(async (newConfig) => {
    try {
      const response = await monitoringAPI.updateDashboardConfig(newConfig);
      setDashboardConfig(response.data.config);
      toast.success("Dashboard configuration updated");
      return { success: true };
    } catch (err) {
      console.error("Failed to update dashboard config:", err);
      toast.error("Failed to update dashboard configuration");
      return { success: false, error: err.message };
    }
  }, []);

  const createAlertRule = useCallback(async (ruleData) => {
    try {
      const response = await monitoringAPI.createAlertRule(ruleData);
      setAlertRules((prev) => [...prev, response.data.rule]);
      toast.success("Alert rule created successfully");
      return { success: true, rule: response.data.rule };
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || "Failed to create alert rule";
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const updateAlertRule = useCallback(async (ruleId, ruleData) => {
    try {
      const response = await monitoringAPI.updateAlertRule(ruleId, ruleData);
      setAlertRules((prev) =>
        prev.map((rule) => (rule.id === ruleId ? response.data.rule : rule)),
      );
      toast.success("Alert rule updated successfully");
      return { success: true };
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || "Failed to update alert rule";
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const deleteAlertRule = useCallback(async (ruleId) => {
    try {
      await monitoringAPI.deleteAlertRule(ruleId);
      setAlertRules((prev) => prev.filter((rule) => rule.id !== ruleId));
      toast.success("Alert rule deleted successfully");
      return { success: true };
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || "Failed to delete alert rule";
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const acknowledgeAlert = useCallback(async (alertId) => {
    try {
      await monitoringAPI.acknowledgeAlert(alertId);
      setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
      toast.success("Alert acknowledged");
      return { success: true };
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || "Failed to acknowledge alert";
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const terminateSession = useCallback(async (sessionId) => {
    try {
      await monitoringAPI.terminateSession(sessionId);
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
      toast.success("Session terminated");
      return { success: true };
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || "Failed to terminate session";
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const updateTimeRange = useCallback((newRange) => {
    setTimeRange(newRange);
  }, []);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh((prev) => !prev);
  }, []);

  const updateRefreshInterval = useCallback((interval) => {
    setRefreshInterval(interval);
  }, []);

  const value = {
    systemMetrics,
    appMetrics,
    alerts,
    alertRules,
    sessions,
    apiLogs,
    apiSummary,
    dashboardConfig,
    loading,
    timeRange,
    autoRefresh,
    refreshInterval,
    isConnected,
    fetchMetrics,
    fetchMetricHistory,
    fetchAlertRules,
    fetchActiveAlerts,
    fetchSessions,
    fetchApiLogs,
    fetchApiSummary,
    fetchDashboardConfig,
    updateDashboardConfig,
    createAlertRule,
    updateAlertRule,
    deleteAlertRule,
    acknowledgeAlert,
    terminateSession,
    updateTimeRange,
    toggleAutoRefresh,
    updateRefreshInterval,
    refreshData,
  };

  return (
    <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>
  );
};

// Export context for custom hook
export { MonitoringContext };
