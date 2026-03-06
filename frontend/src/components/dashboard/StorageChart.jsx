import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import { FiHardDrive, FiPieChart, FiBarChart2 } from "react-icons/fi";

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
);

const StorageChart = ({ files, stats }) => {
  const [chartType, setChartType] = React.useState("pie");

  // Calculate file type distribution
  const fileTypeData = useMemo(() => {
    if (!files || files.length === 0) {
      return {
        labels: ["No Data"],
        datasets: [
          {
            data: [1],
            backgroundColor: ["#e5e7eb"],
            borderWidth: 0,
          },
        ],
      };
    }

    const types = {};
    files.forEach((file) => {
      const ext = file.filename.split(".").pop()?.toLowerCase() || "unknown";
      types[ext] = (types[ext] || 0) + 1;
    });

    // Sort by count and take top 5
    const sortedTypes = Object.entries(types)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const colors = [
      "#4f46e5", // indigo
      "#10b981", // emerald
      "#f59e0b", // amber
      "#ef4444", // red
      "#8b5cf6", // violet
    ];

    return {
      labels: sortedTypes.map(([ext]) => ext.toUpperCase()),
      datasets: [
        {
          data: sortedTypes.map(([, count]) => count),
          backgroundColor: colors.slice(0, sortedTypes.length),
          borderWidth: 0,
        },
      ],
    };
  }, [files]);

  // Calculate storage usage by month
  const monthlyData = useMemo(() => {
    if (!files || files.length === 0) {
      return {
        labels: ["No Data"],
        datasets: [
          {
            label: "Storage Used (MB)",
            data: [0],
            backgroundColor: "#4f46e5",
          },
        ],
      };
    }

    const months = {};
    files.forEach((file) => {
      const date = new Date(file.upload_date);
      const monthYear = date.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      months[monthYear] =
        (months[monthYear] || 0) + file.original_size / (1024 * 1024);
    });

    const sortedMonths = Object.entries(months)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .slice(-6); // Last 6 months

    return {
      labels: sortedMonths.map(([month]) => month),
      datasets: [
        {
          label: "Storage Used (MB)",
          data: sortedMonths.map(([, size]) => Number(size.toFixed(2))),
          backgroundColor: "#4f46e5",
          borderRadius: 4,
        },
      ],
    };
  }, [files]);

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: document.documentElement.classList.contains("dark")
            ? "#e5e7eb"
            : "#374151",
          font: { size: 12 },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || "";
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} file${value !== 1 ? "s" : ""} (${percentage}%)`;
          },
        },
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `Storage: ${context.raw} MB`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: document.documentElement.classList.contains("dark")
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          callback: (value) => `${value} MB`,
          color: document.documentElement.classList.contains("dark")
            ? "#e5e7eb"
            : "#374151",
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: document.documentElement.classList.contains("dark")
            ? "#e5e7eb"
            : "#374151",
        },
      },
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <FiHardDrive className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Storage Analytics
          </h2>
        </div>

        {/* Chart type toggle */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setChartType("pie")}
            className={`p-2 rounded-lg transition-colors ${
              chartType === "pie"
                ? "bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
            title="File Type Distribution"
          >
            <FiPieChart className="h-4 w-4" />
          </button>
          <button
            onClick={() => setChartType("bar")}
            className={`p-2 rounded-lg transition-colors ${
              chartType === "bar"
                ? "bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
            title="Monthly Storage Usage"
          >
            <FiBarChart2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        {files?.length > 0 ? (
          chartType === "pie" ? (
            <Pie data={fileTypeData} options={pieOptions} />
          ) : (
            <Bar data={monthlyData} options={barOptions} />
          )
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <FiHardDrive className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No files uploaded yet
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Upload files to see storage analytics
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Storage summary */}
      {stats && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Storage
              </p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {stats.total_storage_mb?.toFixed(2) || "0"} MB
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Files
              </p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {stats.total_files || 0}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageChart;
