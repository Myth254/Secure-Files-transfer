/**
 * API Configuration
 * Centralized configuration for all API endpoints
 */

// ============================================
// Base Configuration
// ============================================

export const API_CONFIG = {
  // Base URLs
  BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  WEBSOCKET_URL: import.meta.env.VITE_WEBSOCKET_URL || "ws://localhost:5000",

  // Timeouts
  TIMEOUT: 30000, // 30 seconds
  UPLOAD_TIMEOUT: 60000, // 60 seconds for file uploads

  // Rate Limiting
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second

  // File Upload
  MAX_FILE_SIZE: parseInt(import.meta.env.VITE_MAX_FILE_SIZE) || 10485760, // 10MB
  ALLOWED_FILE_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Cache
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
};

// ============================================
// API Endpoints
// ============================================

export const API_ENDPOINTS = {
  // Health Check
  HEALTH: "/health",

  // ============================================
  // Authentication Endpoints
  // ============================================
  AUTH: {
    REGISTER: "/api/auth/register",
    LOGIN: "/api/auth/login",
    VERIFY_LOGIN_OTP: "/api/auth/verify-login-otp",
    RESEND_LOGIN_OTP: "/api/auth/resend-login-otp",
    LOGOUT: "/api/auth/logout",
    VERIFY_TOKEN: "/api/auth/verify",
  },

  // ============================================
  // User Endpoints
  // ============================================
  USER: {
    PROFILE: "/api/user",
    PUBLIC_KEY: "/api/user/public_key",
    ACTIVITY: "/api/user/activity",
    UPDATE_PROFILE: "/api/user/update",
    CHECK_USERNAME: (username) => `/api/user/check_username/${username}`,
    CHECK_EMAIL: (email) => `/api/user/check_email/${email}`,
  },

  // ============================================
  // File Management Endpoints
  // ============================================
  FILES: {
    UPLOAD: "/api/files/upload",
    LIST: "/api/files",
    DOWNLOAD: (id) => `/api/files/${id}`,
    DELETE: (id) => `/api/files/${id}`,
    STATS: "/api/files/stats",
  },

  // ============================================
  // File Sharing Endpoints
  // ============================================
  SHARE: {
    REQUEST: "/api/share/request",
    REQUESTS: "/api/share/requests",
    ACCEPT: (id) => `/api/share/requests/${id}/accept`,
    REJECT: (id) => `/api/share/requests/${id}/reject`,
    REVOKE: (id) => `/api/share/requests/${id}/revoke`,
    SHARED_FILES: "/api/share/shared-files",
    DOWNLOAD_SHARED: (id) => `/api/share/shared-files/${id}/download`,
    STATS: "/api/share/stats",
  },

  // ============================================
  // OTP Endpoints
  // ============================================
  OTP: {
    SEND: "/api/otp/send",
    VERIFY: "/api/otp/verify",
    RESEND: (id) => `/api/otp/resend/${id}`,
  },

  // ============================================
  // Monitoring Endpoints
  // ============================================
  MONITORING: {
    // Dashboard
    DASHBOARD_CONFIG: "/api/monitoring/dashboard/config",

    // Metrics
    METRICS_CURRENT: "/api/monitoring/metrics/current",
    METRICS_HISTORY: (type, name) =>
      `/api/monitoring/metrics/history/${type}/${name}`,
    METRICS_AGGREGATED: (type, name) =>
      `/api/monitoring/metrics/aggregated/${type}/${name}`,

    // Alerts
    ALERTS_RULES: "/api/monitoring/alerts/rules",
    ALERTS_RULE: (id) => `/api/monitoring/alerts/rules/${id}`,
    ALERTS_HISTORY: "/api/monitoring/alerts/history",
    ALERTS_ACTIVE: "/api/monitoring/alerts/history/active",
    ALERTS_ACKNOWLEDGE: (id) =>
      `/api/monitoring/alerts/history/${id}/acknowledge`,

    // Sessions
    SESSIONS: "/api/monitoring/sessions",
    SESSIONS_STATS: "/api/monitoring/sessions/stats",
    TERMINATE_SESSION: (id) => `/api/monitoring/sessions/${id}`,

    // API Logs
    API_LOGS: "/api/monitoring/api-logs",
    API_LOGS_SUMMARY: "/api/monitoring/api-logs/summary",

    // Health
    HEALTH_DETAILED: "/api/monitoring/health/detailed",

    // Init
    INIT: "/api/monitoring/init",
  },
};

// ============================================
// HTTP Methods
// ============================================

export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
  OPTIONS: "OPTIONS",
};

// ============================================
// Response Status Codes
// ============================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

// ============================================
// Error Messages
// ============================================

export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error. Please check your internet connection.",
  TIMEOUT: "Request timed out. Please try again.",
  UNAUTHORIZED: "Your session has expired. Please login again.",
  FORBIDDEN: "You do not have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  SERVER_ERROR: "Server error. Please try again later.",
  RATE_LIMIT: "Too many requests. Please try again later.",
  VALIDATION_ERROR: "Please check your input and try again.",
  FILE_TOO_LARGE: `File size exceeds the maximum limit of ${API_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB.`,
  INVALID_FILE_TYPE: "File type not allowed.",
  UPLOAD_FAILED: "File upload failed. Please try again.",
  DOWNLOAD_FAILED: "File download failed. Please try again.",
  DELETE_FAILED: "File deletion failed. Please try again.",
  SHARE_FAILED: "Sharing failed. Please try again.",
};

// ============================================
// Request Headers
// ============================================

export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

export const MULTIPART_HEADERS = {
  "Content-Type": "multipart/form-data",
};

// ============================================
// Query Parameters
// ============================================

export const DEFAULT_QUERY_PARAMS = {
  page: 1,
  per_page: API_CONFIG.DEFAULT_PAGE_SIZE,
  sort_by: "created_at",
  sort_order: "desc",
};

// ============================================
// Export all configurations
// ============================================

export default {
  API_CONFIG,
  API_ENDPOINTS,
  HTTP_METHODS,
  HTTP_STATUS,
  ERROR_MESSAGES,
  DEFAULT_HEADERS,
  MULTIPART_HEADERS,
  DEFAULT_QUERY_PARAMS,
};
