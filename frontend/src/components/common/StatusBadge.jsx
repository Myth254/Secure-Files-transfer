import React from "react";

const StatusBadge = ({ status, type = "default", size = "md" }) => {
  const typeStyles = {
    success:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    warning:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    default: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    pending:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    active:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    inactive: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    processing:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    completed:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };

  const getStatusText = () => {
    if (status) return status;
    if (type) return type;
    return "Unknown";
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${typeStyles[type] || typeStyles.default}
        ${sizeStyles[size]}
      `}
    >
      {getStatusText()}
    </span>
  );
};

export default StatusBadge;
