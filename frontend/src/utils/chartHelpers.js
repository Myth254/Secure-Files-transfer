/**
 * Chart Helpers
 * Utilities for formatting and processing chart data
 */

import { CHART_COLORS } from "../config/chartConfig";

// ============================================
// Data Formatting
// ============================================

/**
 * Format raw metrics for chart display
 * @param {Array} metrics - Raw metric data
 * @param {string} type - Chart type
 * @returns {Object} Formatted chart data
 */
export const formatMetricsForChart = (metrics, type = "line") => {
  if (!metrics || metrics.length === 0) {
    return {
      labels: [],
      datasets: [],
    };
  }

  const timestamps = metrics.map((m) =>
    new Date(m.timestamp).toLocaleTimeString(),
  );

  switch (type) {
    case "cpu":
      return {
        labels: timestamps,
        datasets: [
          {
            label: "CPU Usage %",
            data: metrics.map((m) => m.value),
            borderColor: CHART_COLORS.cpu,
            backgroundColor: `rgba(79, 70, 229, 0.1)`,
            fill: true,
          },
        ],
      };

    case "memory":
      return {
        labels: timestamps,
        datasets: [
          {
            label: "Memory Usage %",
            data: metrics.map((m) => m.value),
            borderColor: CHART_COLORS.memory,
            backgroundColor: `rgba(16, 185, 129, 0.1)`,
            fill: true,
          },
        ],
      };

    case "disk":
      return {
        labels: ["Used", "Free"],
        datasets: [
          {
            data: [metrics.used || 0, metrics.free || 0],
            backgroundColor: [CHART_COLORS.disk, "#e5e7eb"],
            borderWidth: 0,
          },
        ],
      };

    case "network":
      return {
        labels: timestamps,
        datasets: [
          {
            label: "Upload (MB/s)",
            data: metrics.map((m) => m.upload || 0),
            borderColor: CHART_COLORS.primary,
            backgroundColor: `rgba(79, 70, 229, 0.1)`,
            yAxisID: "y",
          },
          {
            label: "Download (MB/s)",
            data: metrics.map((m) => m.download || 0),
            borderColor: CHART_COLORS.success,
            backgroundColor: `rgba(16, 185, 129, 0.1)`,
            yAxisID: "y",
          },
        ],
      };

    default:
      return {
        labels: timestamps,
        datasets: [
          {
            label: "Value",
            data: metrics.map((m) => m.value),
            borderColor: CHART_COLORS.primary,
            backgroundColor: `rgba(79, 70, 229, 0.1)`,
            fill: true,
          },
        ],
      };
  }
};

/**
 * Aggregate metrics by time interval
 * @param {Array} metrics - Raw metric data
 * @param {string} interval - Time interval ('minute', 'hour', 'day')
 * @returns {Array} Aggregated metrics
 */
export const aggregateMetricsByTime = (metrics, interval = "hour") => {
  if (!metrics || metrics.length === 0) return [];

  const grouped = {};

  metrics.forEach((metric) => {
    const date = new Date(metric.timestamp);
    let key;

    switch (interval) {
      case "minute":
        key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
        break;
      case "hour":
        key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:00`;
        break;
      case "day":
        key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        break;
      default:
        key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:00`;
    }

    if (!grouped[key]) {
      grouped[key] = {
        sum: 0,
        count: 0,
        min: metric.value,
        max: metric.value,
        timestamp: date,
      };
    }

    grouped[key].sum += metric.value;
    grouped[key].count++;
    grouped[key].min = Math.min(grouped[key].min, metric.value);
    grouped[key].max = Math.max(grouped[key].max, metric.value);
  });

  return Object.entries(grouped).map(([key, value]) => ({
    interval: key,
    avg: value.sum / value.count,
    min: value.min,
    max: value.max,
    timestamp: value.timestamp,
  }));
};

// ============================================
// Threshold Management
// ============================================

/**
 * Get color based on threshold
 * @param {number} value - Current value
 * @param {Object} thresholds - Threshold configuration
 * @returns {string} Color code
 */
export const getThresholdColor = (value, thresholds) => {
  if (!thresholds) return CHART_COLORS.primary;

  if (thresholds.critical && value >= thresholds.critical) {
    return CHART_COLORS.danger;
  }
  if (thresholds.warning && value >= thresholds.warning) {
    return CHART_COLORS.warning;
  }
  return CHART_COLORS.success;
};

/**
 * Get status based on threshold
 * @param {number} value - Current value
 * @param {Object} thresholds - Threshold configuration
 * @returns {string} Status string
 */
export const getThresholdStatus = (value, thresholds) => {
  if (!thresholds) return "normal";

  if (thresholds.critical && value >= thresholds.critical) {
    return "critical";
  }
  if (thresholds.warning && value >= thresholds.warning) {
    return "warning";
  }
  return "normal";
};

// ============================================
// Chart Options Helpers
// ============================================

/**
 * Generate chart options with custom settings
 * @param {Object} customOptions - Custom chart options
 * @returns {Object} Chart options
 */
export const getChartOptions = (customOptions = {}) => {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
      },
      tooltip: {
        enabled: true,
        mode: "index",
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return {
    ...defaultOptions,
    ...customOptions,
    plugins: {
      ...defaultOptions.plugins,
      ...customOptions.plugins,
    },
    scales: {
      ...defaultOptions.scales,
      ...customOptions.scales,
    },
  };
};

/**
 * Create gauge chart data
 * @param {number} value - Current value
 * @param {number} max - Maximum value
 * @param {string} label - Chart label
 * @returns {Object} Gauge chart data
 */
export const createGaugeData = (value, max = 100, label = "Usage") => {
  const percentage = (value / max) * 100;
  const color = getThresholdColor(percentage, {
    warning: 80,
    critical: 95,
  });

  return {
    datasets: [
      {
        data: [percentage, 100 - percentage],
        backgroundColor: [color, "#e5e7eb"],
        borderWidth: 0,
        circumference: 180,
        rotation: 270,
      },
    ],
    value: percentage,
    label,
  };
};

// ============================================
// Export all chart helpers
// ============================================

export default {
  formatMetricsForChart,
  aggregateMetricsByTime,
  getThresholdColor,
  getThresholdStatus,
  getChartOptions,
  createGaugeData,
};
