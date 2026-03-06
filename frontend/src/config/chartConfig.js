/**
 * Chart.js Configuration
 * Centralized configuration for all charts in the monitoring dashboard
 */

import { Chart } from "chart.js";

// ============================================
// Chart Colors
// ============================================

export const CHART_COLORS = {
  primary: "#4f46e5",
  secondary: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",

  success: "#10b981",
  error: "#ef4444",

  cpu: "#4f46e5",
  memory: "#10b981",
  disk: "#f59e0b",
  network: "#3b82f6",

  gradient: {
    cpu: ["#4f46e5", "#818cf8"],
    memory: ["#10b981", "#34d399"],
    disk: ["#f59e0b", "#fbbf24"],
    network: ["#3b82f6", "#60a5fa"],
  },

  chart: [
    "#4f46e5", // Indigo
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#84cc16", // Lime
  ],
};

// ============================================
// Base Chart Options
// ============================================

export const BASE_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: "top",
      labels: {
        font: {
          family: "'Inter', sans-serif",
          size: 12,
        },
        color: "#6b7280",
        usePointStyle: true,
        pointStyle: "circle",
      },
    },
    tooltip: {
      enabled: true,
      mode: "index",
      intersect: false,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      titleFont: {
        family: "'Inter', sans-serif",
        size: 13,
        weight: "bold",
      },
      bodyFont: {
        family: "'Inter', sans-serif",
        size: 12,
      },
      borderColor: "rgba(0, 0, 0, 0.1)",
      borderWidth: 1,
      padding: 10,
      cornerRadius: 6,
    },
  },
  layout: {
    padding: {
      top: 10,
      bottom: 10,
      left: 10,
      right: 10,
    },
  },
  animation: {
    duration: 1000,
    easing: "easeInOutQuart",
  },
};

// ============================================
// Line Chart Configuration
// ============================================

export const lineChartOptions = {
  ...BASE_CHART_OPTIONS,
  elements: {
    line: {
      tension: 0.4,
      borderWidth: 2,
      fill: false,
    },
    point: {
      radius: 3,
      hoverRadius: 5,
      backgroundColor: "white",
      borderWidth: 2,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
        drawBorder: true,
        drawOnChartArea: true,
        drawTicks: true,
      },
      ticks: {
        font: {
          family: "'Inter', sans-serif",
          size: 11,
        },
        maxRotation: 45,
        minRotation: 45,
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: "rgba(0, 0, 0, 0.05)",
        drawBorder: false,
      },
      ticks: {
        font: {
          family: "'Inter', sans-serif",
          size: 11,
        },
        callback: function (value) {
          return value;
        },
      },
    },
  },
};

// ============================================
// Bar Chart Configuration
// ============================================

export const barChartOptions = {
  ...BASE_CHART_OPTIONS,
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        font: {
          family: "'Inter', sans-serif",
          size: 11,
        },
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: "rgba(0, 0, 0, 0.05)",
      },
      ticks: {
        font: {
          family: "'Inter', sans-serif",
          size: 11,
        },
      },
    },
  },
};

// ============================================
// Pie/Doughnut Chart Configuration
// ============================================

export const pieChartOptions = {
  ...BASE_CHART_OPTIONS,
  cutout: "60%",
  plugins: {
    ...BASE_CHART_OPTIONS.plugins,
    legend: {
      position: "bottom",
      labels: {
        font: {
          family: "'Inter', sans-serif",
          size: 11,
        },
        boxWidth: 12,
        padding: 15,
      },
    },
  },
};

// ============================================
// Gauge Chart Configuration
// ============================================

export const gaugeChartOptions = {
  ...BASE_CHART_OPTIONS,
  circumference: 180,
  rotation: 270,
  cutout: "70%",
  plugins: {
    ...BASE_CHART_OPTIONS.plugins,
    tooltip: {
      callbacks: {
        label: function (context) {
          return `${context.raw}%`;
        },
      },
    },
  },
};

// ============================================
// Metric Card Chart Configurations
// ============================================

export const cpuChartConfig = {
  type: "line",
  options: {
    ...lineChartOptions,
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          callback: function (value) {
            return value + "%";
          },
        },
      },
    },
    plugins: {
      ...lineChartOptions.plugins,
      legend: {
        display: false,
      },
    },
  },
};

export const memoryChartConfig = {
  type: "line",
  options: {
    ...lineChartOptions,
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          callback: function (value) {
            return value + "%";
          },
        },
      },
    },
    plugins: {
      ...lineChartOptions.plugins,
      legend: {
        display: false,
      },
    },
  },
};

export const diskChartConfig = {
  type: "doughnut",
  options: {
    ...pieChartOptions,
    plugins: {
      ...pieChartOptions.plugins,
      legend: {
        display: false,
      },
    },
  },
};

export const networkChartConfig = {
  type: "line",
  options: {
    ...lineChartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return value + " MB";
          },
        },
      },
    },
    plugins: {
      ...lineChartOptions.plugins,
      legend: {
        display: true,
        position: "top",
      },
    },
  },
};

// ============================================
// Chart Data Formatters
// ============================================

export const formatChartData = (metrics, type = "line") => {
  if (!metrics || metrics.length === 0) {
    return {
      labels: [],
      datasets: [],
    };
  }

  switch (type) {
    case "cpu":
      return {
        labels: metrics.map((m) => new Date(m.timestamp).toLocaleTimeString()),
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
        labels: metrics.map((m) => new Date(m.timestamp).toLocaleTimeString()),
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
        labels: metrics.map((m) => new Date(m.timestamp).toLocaleTimeString()),
        datasets: [
          {
            label: "Upload MB/s",
            data: metrics.map((m) => m.upload || 0),
            borderColor: CHART_COLORS.cpu,
            backgroundColor: `rgba(79, 70, 229, 0.1)`,
            yAxisID: "y",
          },
          {
            label: "Download MB/s",
            data: metrics.map((m) => m.download || 0),
            borderColor: CHART_COLORS.memory,
            backgroundColor: `rgba(16, 185, 129, 0.1)`,
            yAxisID: "y",
          },
        ],
      };

    default:
      return {
        labels: metrics.map((m) => new Date(m.timestamp).toLocaleTimeString()),
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

// ============================================
// Chart Defaults
// ============================================

export const setChartDefaults = () => {
  // Set default font for all charts
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = "#6b7280";

  // Set default animation duration
  Chart.defaults.animation.duration = 1000;

  // Set default responsive behavior
  Chart.defaults.responsive = true;
  Chart.defaults.maintainAspectRatio = false;
};

// ============================================
// Export all configurations
// ============================================

export default {
  CHART_COLORS,
  BASE_CHART_OPTIONS,
  lineChartOptions,
  barChartOptions,
  pieChartOptions,
  gaugeChartOptions,
  cpuChartConfig,
  memoryChartConfig,
  diskChartConfig,
  networkChartConfig,
  formatChartData,
  setChartDefaults,
};
