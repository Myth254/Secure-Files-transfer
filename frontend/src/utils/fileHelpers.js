/**
 * File Helpers
 * Utilities for file operations
 */

// ============================================
// File Size Formatting
// ============================================

/**
 * Format file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  if (!bytes || isNaN(bytes)) return "Unknown";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

/**
 * Format file size in MB
 * @param {number} bytes - File size in bytes
 * @returns {string} File size in MB
 */
export const formatFileSizeMB = (bytes) => {
  if (!bytes || isNaN(bytes)) return "0 MB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

// ============================================
// File Type Detection
// ============================================

/**
 * Get file extension from filename
 * @param {string} filename - File name
 * @returns {string} File extension
 */
export const getFileExtension = (filename) => {
  if (!filename) return "";
  return filename.split(".").pop()?.toLowerCase() || "";
};

/**
 * Get file type category
 * @param {string} filename - File name
 * @returns {string} File type category
 */
export const getFileType = (filename) => {
  const ext = getFileExtension(filename);

  const types = {
    image: ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"],
    document: ["pdf", "doc", "docx", "txt", "rtf", "odt"],
    spreadsheet: ["xls", "xlsx", "csv", "ods"],
    presentation: ["ppt", "pptx", "odp"],
    archive: ["zip", "rar", "7z", "tar", "gz"],
    audio: ["mp3", "wav", "ogg", "m4a"],
    video: ["mp4", "avi", "mkv", "mov", "wmv"],
  };

  for (const [type, extensions] of Object.entries(types)) {
    if (extensions.includes(ext)) {
      return type;
    }
  }

  return "other";
};

/**
 * Check if file is an image
 * @param {string} filename - File name
 * @returns {boolean} True if image
 */
export const isImage = (filename) => {
  return getFileType(filename) === "image";
};

/**
 * Check if file is a document
 * @param {string} filename - File name
 * @returns {boolean} True if document
 */
export const isDocument = (filename) => {
  return getFileType(filename) === "document";
};

/**
 * Check if file is a spreadsheet
 * @param {string} filename - File name
 * @returns {boolean} True if spreadsheet
 */
export const isSpreadsheet = (filename) => {
  return getFileType(filename) === "spreadsheet";
};

/**
 * Check if file is a presentation
 * @param {string} filename - File name
 * @returns {boolean} True if presentation
 */
export const isPresentation = (filename) => {
  return getFileType(filename) === "presentation";
};

/**
 * Check if file is an archive
 * @param {string} filename - File name
 * @returns {boolean} True if archive
 */
export const isArchive = (filename) => {
  return getFileType(filename) === "archive";
};

/**
 * Get MIME type from filename
 * @param {string} filename - File name
 * @returns {string} MIME type
 */
export const getMimeType = (filename) => {
  const ext = getFileExtension(filename);

  const mimeTypes = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    bmp: "image/bmp",

    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    rtf: "application/rtf",
    odt: "application/vnd.oasis.opendocument.text",

    // Spreadsheets
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv",
    ods: "application/vnd.oasis.opendocument.spreadsheet",

    // Presentations
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    odp: "application/vnd.oasis.opendocument.presentation",

    // Archives
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",

    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",

    // Video
    mp4: "video/mp4",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    mov: "video/quicktime",
    wmv: "video/x-ms-wmv",
  };

  return mimeTypes[ext] || "application/octet-stream";
};

// ============================================
// File Validation
// ============================================

/**
 * Validate file size
 * @param {File} file - File object
 * @param {number} maxSize - Maximum size in bytes
 * @returns {Object} Validation result
 */
export const validateFileSize = (file, maxSize = 10 * 1024 * 1024) => {
  if (!file) return { valid: false, error: "No file selected" };

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${formatFileSize(maxSize)}`,
    };
  }

  return { valid: true };
};

/**
 * Validate file type
 * @param {File} file - File object
 * @param {Array} allowedTypes - Allowed MIME types
 * @returns {Object} Validation result
 */
export const validateFileType = (file, allowedTypes = []) => {
  if (!file) return { valid: false, error: "No file selected" };

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  return { valid: true };
};

/**
 * Validate file extension
 * @param {File} file - File object
 * @param {Array} allowedExtensions - Allowed extensions
 * @returns {Object} Validation result
 */
export const validateFileExtension = (file, allowedExtensions = []) => {
  if (!file) return { valid: false, error: "No file selected" };

  const ext = getFileExtension(file.name);

  if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File extension .${ext} is not allowed`,
    };
  }

  return { valid: true };
};

/**
 * Validate file name
 * @param {string} filename - File name
 * @returns {Object} Validation result
 */
export const validateFileName = (filename) => {
  if (!filename) return { valid: false, error: "Filename is required" };

  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*]/g;
  if (invalidChars.test(filename)) {
    return {
      valid: false,
      error: "Filename contains invalid characters",
    };
  }

  // Check length
  if (filename.length > 255) {
    return {
      valid: false,
      error: "Filename is too long (max 255 characters)",
    };
  }

  return { valid: true };
};

/**
 * Validate file before upload
 * @param {File} file - File object
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024,
    allowedTypes = [],
    allowedExtensions = [],
    checkName = true,
  } = options;

  if (!file) {
    return { valid: false, error: "No file selected" };
  }

  // Check size
  const sizeValidation = validateFileSize(file, maxSize);
  if (!sizeValidation.valid) return sizeValidation;

  // Check type
  if (allowedTypes.length > 0) {
    const typeValidation = validateFileType(file, allowedTypes);
    if (!typeValidation.valid) return typeValidation;
  }

  // Check extension
  if (allowedExtensions.length > 0) {
    const extValidation = validateFileExtension(file, allowedExtensions);
    if (!extValidation.valid) return extValidation;
  }

  // Check filename
  if (checkName) {
    const nameValidation = validateFileName(file.name);
    if (!nameValidation.valid) return nameValidation;
  }

  return { valid: true, file };
};

// ============================================
// File Operations
// ============================================

/**
 * Read file as data URL
 * @param {File} file - File object
 * @returns {Promise<string>} Data URL
 */
export const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));

    reader.readAsDataURL(file);
  });
};

/**
 * Read file as text
 * @param {File} file - File object
 * @returns {Promise<string>} File text content
 */
export const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));

    reader.readAsText(file);
  });
};

/**
 * Read file as ArrayBuffer
 * @param {File} file - File object
 * @returns {Promise<ArrayBuffer>} File buffer
 */
export const readFileAsArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));

    reader.readAsArrayBuffer(file);
  });
};

/**
 * Download file from blob
 * @param {Blob} blob - File blob
 * @param {string} filename - Download filename
 */
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.URL.revokeObjectURL(url);
};

/**
 * Download file from URL
 * @param {string} url - File URL
 * @param {string} filename - Download filename
 */
export const downloadFromUrl = (url, filename) => {
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Create a file from data
 * @param {string|Blob} data - File data
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 * @returns {File} File object
 */
export const createFile = (
  data,
  filename,
  mimeType = "application/octet-stream",
) => {
  if (data instanceof Blob) {
    return new File([data], filename, { type: mimeType });
  }

  return new File([data], filename, { type: mimeType });
};

// ============================================
// File Information
// ============================================

/**
 * Get file icon based on type
 * @param {string} filename - File name
 * @returns {string} Icon name or class
 */
export const getFileIcon = (filename) => {
  const type = getFileType(filename);

  const icons = {
    image: "📷",
    document: "📄",
    spreadsheet: "📊",
    presentation: "📽️",
    archive: "📦",
    audio: "🎵",
    video: "🎬",
    other: "📁",
  };

  return icons[type] || icons.other;
};

/**
 * Get file color based on type
 * @param {string} filename - File name
 * @returns {string} Color code
 */
export const getFileColor = (filename) => {
  const type = getFileType(filename);

  const colors = {
    image: "#3b82f6", // blue
    document: "#10b981", // green
    spreadsheet: "#8b5cf6", // purple
    presentation: "#f59e0b", // amber
    archive: "#ef4444", // red
    audio: "#ec4899", // pink
    video: "#6366f1", // indigo
    other: "#6b7280", // gray
  };

  return colors[type] || colors.other;
};

// ============================================
// Export all file helpers
// ============================================

export default {
  formatFileSize,
  formatFileSizeMB,
  getFileExtension,
  getFileType,
  isImage,
  isDocument,
  isSpreadsheet,
  isPresentation,
  isArchive,
  getMimeType,
  validateFileSize,
  validateFileType,
  validateFileExtension,
  validateFileName,
  validateFile,
  readFileAsDataURL,
  readFileAsText,
  readFileAsArrayBuffer,
  downloadBlob,
  downloadFromUrl,
  createFile,
  getFileIcon,
  getFileColor,
};
