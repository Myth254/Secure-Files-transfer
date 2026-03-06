/**
 * Monitoring Dashboard Configuration
 * Centralized configuration for the real-time monitoring dashboard
 */

// ============================================
// Dashboard Layout Configuration
// ============================================

export const DASHBOARD_LAYOUTS = {
  default: {
    lg: [
      { i: "cpu", x: 0, y: 0, w: 6, h: 4, minW: 4, minH: 3 },
      { i: "memory", x: 6, y: 0, w: 6, h: 4, minW: 4, minH: 3 },
      { i: "disk", x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3 },
      { i: "network", x: 6, y: 4, w: 6, h: 4, minW: 4, minH: 3 },
      { i: "app-stats", x: 0, y: 8, w: 12, h: 4, minW: 6, minH: 3 },
      { i: "alerts", x: 0, y: 12, w: 12, h: 4, minW: 6, minH: 3 },
      { i: "api-logs", x: 0, y: 16, w: 12, h: 4, minW: 6, minH: 3 },
      { i: "sessions", x: 0, y: 20, w: 12, h: 4, minW: 6, minH: 3 },
    ],
    md: [
      { i: "cpu", x: 0, y: 0, w: 6, h: 4 },
      { i: "memory", x: 6, y: 0, w: 6, h: 4 },
      { i: "disk", x: 0, y: 4, w: 6, h: 4 },
      { i: "network", x: 6, y: 4, w: 6, h: 4 },
      { i: "app-stats", x: 0, y: 8, w: 12, h: 4 },
      { i: "alerts", x: 0, y: 12, w: 12, h: 4 },
      { i: "api-logs", x: 0, y: 16, w: 12, h: 4 },
      { i: "sessions", x: 0, y: 20, w: 12, h: 4 },
    ],
    sm: [
      { i: "cpu", x: 0, y: 0, w: 12, h: 4 },
      { i: "memory", x: 0, y: 4, w: 12, h: 4 },
      { i: "disk", x: 0, y: 8, w: 12, h: 4 },
      { i: "network", x: 0, y: 12, w: 12, h: 4 },
      { i: "app-stats", x: 0, y: 16, w: 12, h: 4 },
      { i: "alerts", x: 0, y: 20, w: 12, h: 4 },
      { i: "api-logs", x: 0, y: 24, w: 12, h: 4 },
      { i: "sessions", x: 0, y: 28, w: 12, h: 4 },
    ],
  },
  compact: {
    lg: [
      { i: "cpu", x: 0, y: 0, w: 4, h: 3 },
      { i: "memory", x: 4, y: 0, w: 4, h: 3 },
      { i: "disk", x: 8, y: 0, w: 4, h: 3 },
      { i: "network", x: 0, y: 3, w: 6, h: 3 },
      { i: "app-stats", x: 6, y: 3, w: 6, h: 3 },
      { i: "alerts", x: 0, y: 6, w: 12, h: 3 },
    ],
  },
  detailed: {
    lg: [
      { i: "cpu", x: 0, y: 0, w: 8, h: 6 },
      { i: "memory", x: 8, y: 0, w: 4, h: 6 },
      { i: "disk", x: 0, y: 6, w: 4, h: 4 },
      { i: "network", x: 4, y: 6, w: 8, h: 4 },
      { i: "app-stats", x: 0, y: 10, w: 12, h: 4 },
      { i: "alerts", x: 0, y: 14, w: 6, h: 4 },
      { i: "api-logs", x: 6, y: 14, w: 6, h: 4 },
      { i: "sessions", x: 0, y: 18, w: 12, h: 4 },
    ],
  },
};

// ============================================
// Widget Configuration
// ============================================

export const WIDGETS = {
  cpu: {
    id: "cpu",
    title: "CPU Usage",
    icon: "FiCpu",
    component: "CPUMetric",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    refreshInterval: 5000,
    thresholds: {
      warning: 80,
      critical: 95,
    },
  },
  memory: {
    id: "memory",
    title: "Memory Usage",
    icon: "FiHardDrive",
    component: "MemoryMetric",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    refreshInterval: 5000,
    thresholds: {
      warning: 85,
      critical: 95,
    },
  },
  disk: {
    id: "disk",
    title: "Disk Usage",
    icon: "FiDatabase",
    component: "DiskMetric",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    refreshInterval: 10000,
    thresholds: {
      warning: 85,
      critical: 95,
    },
  },
  network: {
    id: "network",
    title: "Network Traffic",
    icon: "FiWifi",
    component: "NetworkMetric",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    refreshInterval: 5000,
  },
  "app-stats": {
    id: "app-stats",
    title: "Application Statistics",
    icon: "FiBarChart2",
    component: "AppStats",
    defaultSize: { w: 12, h: 4 },
    minSize: { w: 6, h: 3 },
    refreshInterval: 10000,
  },
  alerts: {
    id: "alerts",
    title: "Active Alerts",
    icon: "FiAlertCircle",
    component: "AlertList",
    defaultSize: { w: 12, h: 4 },
    minSize: { w: 6, h: 3 },
    refreshInterval: 3000,
  },
  "api-logs": {
    id: "api-logs",
    title: "Recent API Requests",
    icon: "FiActivity",
    component: "ApiLogs",
    defaultSize: { w: 12, h: 4 },
    minSize: { w: 6, h: 3 },
    refreshInterval: 5000,
  },
  sessions: {
    id: "sessions",
    title: "Active Sessions",
    icon: "FiUsers",
    component: "ActiveSessions",
    defaultSize: { w: 12, h: 4 },
    minSize: { w: 6, h: 3 },
    refreshInterval: 10000,
  },
};

// ============================================
// Time Range Options
// ============================================

export const TIME_RANGES = [
  { value: "1h", label: "Last Hour", seconds: 3600 },
  { value: "6h", label: "Last 6 Hours", seconds: 21600 },
  { value: "24h", label: "Last 24 Hours", seconds: 86400 },
  { value: "7d", label: "Last 7 Days", seconds: 604800 },
  { value: "30d", label: "Last 30 Days", seconds: 2592000 },
  { value: "custom", label: "Custom Range", seconds: null },
];

// ============================================
// Refresh Intervals
// ============================================

export const REFRESH_INTERVALS = [
  { value: 0, label: "Off" },
  { value: 5, label: "5 seconds" },
  { value: 10, label: "10 seconds" },
  { value: 30, label: "30 seconds" },
  { value: 60, label: "1 minute" },
  { value: 300, label: "5 minutes" },
];

// ============================================
// Alert Severity Colors
// ============================================

export const ALERT_SEVERITY = {
  info: {
    color: "#3b82f6",
    bg: "#dbeafe",
    text: "#1e40af",
    icon: "FiInfo",
  },
  warning: {
    color: "#f59e0b",
    bg: "#fef3c7",
    text: "#92400e",
    icon: "FiAlertTriangle",
  },
  critical: {
    color: "#ef4444",
    bg: "#fee2e2",
    text: "#991b1b",
    icon: "FiAlertOctagon",
  },
  emergency: {
    color: "#7f1d1d",
    bg: "#fee2e2",
    text: "#7f1d1d",
    icon: "FiAlertCircle",
  },
};

// ============================================
// Metric Thresholds
// ============================================

export const METRIC_THRESHOLDS = {
  cpu: {
    warning: 80,
    critical: 95,
  },
  memory: {
    warning: 85,
    critical: 95,
  },
  disk: {
    warning: 85,
    critical: 95,
  },
  response_time: {
    warning: 500,
    critical: 1000,
  },
  error_rate: {
    warning: 5,
    critical: 10,
  },
};

// ============================================
// Chart Theme
// ============================================

export const CHART_THEME = {
  light: {
    grid: "#e5e7eb",
    text: "#6b7280",
    background: "#ffffff",
    tooltip: {
      background: "#1f2937",
      text: "#f9fafb",
    },
  },
  dark: {
    grid: "#374151",
    text: "#9ca3af",
    background: "#1f2937",
    tooltip: {
      background: "#111827",
      text: "#f9fafb",
    },
  },
};

// ============================================
// Default Dashboard Config
// ============================================

export const DEFAULT_DASHBOARD_CONFIG = {
  layout: DASHBOARD_LAYOUTS.default,
  widgets: Object.keys(WIDGETS),
  timeRange: "24h",
  refreshInterval: 30,
  theme: "light",
};

// ============================================
// Monitoring Stats Cards
// ============================================

export const STATS_CARDS = [
  {
    id: "total_requests",
    title: "Total Requests",
    icon: "FiActivity",
    color: "primary",
    format: "number",
  },
  {
    id: "avg_response_time",
    title: "Avg Response Time",
    icon: "FiClock",
    color: "success",
    format: "time",
    unit: "ms",
  },
  {
    id: "error_rate",
    title: "Error Rate",
    icon: "FiAlertCircle",
    color: "danger",
    format: "percentage",
    unit: "%",
  },
  {
    id: "active_sessions",
    title: "Active Sessions",
    icon: "FiUsers",
    color: "info",
    format: "number",
  },
  {
    id: "total_users",
    title: "Total Users",
    icon: "FiUser",
    color: "warning",
    format: "number",
  },
  {
    id: "total_files",
    title: "Total Files",
    icon: "FiFile",
    color: "secondary",
    format: "number",
  },
];

// ============================================
// Export all configurations
// ============================================

export default {
  DASHBOARD_LAYOUTS,
  WIDGETS,
  TIME_RANGES,
  REFRESH_INTERVALS,
  ALERT_SEVERITY,
  METRIC_THRESHOLDS,
  CHART_THEME,
  DEFAULT_DASHBOARD_CONFIG,
  STATS_CARDS,
};
