/**
 * Date Helpers
 * Utilities for date formatting and manipulation
 */

import {
  format,
  formatDistance,
  isToday,
  isYesterday,
  differenceInDays,
} from "date-fns";

// ============================================
// Date Formatting
// ============================================

/**
 * Format date to standard display format
 * @param {string|Date} date - Date to format
 * @param {string} formatStr - Format string
 * @returns {string} Formatted date string
 */
export const formatDate = (date, formatStr = "PPP") => {
  if (!date) return "";
  try {
    return format(new Date(date), formatStr);
  } catch {
    return "";
  }
};

/**
 * Format date to time string
 * @param {string|Date} date - Date to format
 * @returns {string} Time string (HH:MM:SS)
 */
export const formatTime = (date) => {
  if (!date) return "";
  try {
    return format(new Date(date), "HH:mm:ss");
  } catch {
    return "";
  }
};

/**
 * Format date to relative time (e.g., "2 hours ago")
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
  if (!date) return "";
  try {
    return formatDistance(new Date(date), new Date(), { addSuffix: true });
  } catch {
    return "";
  }
};

/**
 * Format date to smart format (today/yesterday/date)
 * @param {string|Date} date - Date to format
 * @returns {string} Smart formatted date
 */
export const formatSmartDate = (date) => {
  if (!date) return "";

  try {
    const dateObj = new Date(date);

    if (isToday(dateObj)) {
      return `Today at ${format(dateObj, "h:mm a")}`;
    }
    if (isYesterday(dateObj)) {
      return `Yesterday at ${format(dateObj, "h:mm a")}`;
    }
    if (differenceInDays(new Date(), dateObj) < 7) {
      return format(dateObj, "EEEE"); // Day name
    }
    return format(dateObj, "MMM d, yyyy");
  } catch {
    return "";
  }
};

/**
 * Format file upload date
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date for file display
 */
export const formatFileDate = (date) => {
  if (!date) return "";
  return formatSmartDate(date);
};

/**
 * Format timestamp for API logs
 * @param {string|Date} timestamp - Timestamp to format
 * @returns {string} Formatted timestamp
 */
export const formatLogTimestamp = (timestamp) => {
  if (!timestamp) return "";
  try {
    return format(new Date(timestamp), "yyyy-MM-dd HH:mm:ss");
  } catch {
    return "";
  }
};

// ============================================
// Date Ranges
// ============================================

/**
 * Get date range based on preset
 * @param {string} preset - Preset name ('today', 'week', 'month', 'year')
 * @returns {Object} Start and end dates
 */
export const getDateRange = (preset) => {
  const now = new Date();
  const start = new Date(now);

  switch (preset) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      now.setDate(now.getDate() - 1);
      now.setHours(23, 59, 59, 999);
      break;
    case "week":
      start.setDate(start.getDate() - 7);
      break;
    case "month":
      start.setMonth(start.getMonth() - 1);
      break;
    case "quarter":
      start.setMonth(start.getMonth() - 3);
      break;
    case "year":
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setHours(0, 0, 0, 0);
  }

  return {
    start: start.toISOString(),
    end: now.toISOString(),
  };
};

/**
 * Format date range for display
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {string} Formatted range string
 */
export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return "";

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return `${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}`;
  } catch {
    return "";
  }
};

// ============================================
// Time Calculations
// ============================================

/**
 * Calculate duration between two dates
 * @param {string|Date} start - Start date
 * @param {string|Date} end - End date
 * @returns {string} Formatted duration
 */
export const getDuration = (start, end = new Date()) => {
  if (!start) return "";

  try {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate - startDate;

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  } catch {
    return "";
  }
};

/**
 * Check if date is within range
 * @param {string|Date} date - Date to check
 * @param {string|Date} start - Range start
 * @param {string|Date} end - Range end
 * @returns {boolean} True if date is within range
 */
export const isDateInRange = (date, start, end) => {
  try {
    const checkDate = new Date(date);
    const startDate = new Date(start);
    const endDate = new Date(end);

    return checkDate >= startDate && checkDate <= endDate;
  } catch {
    return false;
  }
};

/**
 * Get timezone offset string
 * @returns {string} Timezone offset (e.g., '+05:30')
 */
export const getTimezoneOffset = () => {
  const offset = new Date().getTimezoneOffset();
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset <= 0 ? "+" : "-";

  return `${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

/**
 * Format bytes to human readable size
 * @param {number} bytes - Bytes to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted size
 */
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

// ============================================
// Export all date helpers
// ============================================

export default {
  formatDate,
  formatTime,
  formatRelativeTime,
  formatSmartDate,
  formatFileDate,
  formatLogTimestamp,
  getDateRange,
  formatDateRange,
  getDuration,
  isDateInRange,
  getTimezoneOffset,
  formatBytes,
};
