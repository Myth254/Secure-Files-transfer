/**
 * Validation Helpers
 * Utilities for form and data validation
 */

// ============================================
// String Validation
// ============================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

/**
 * Validate username
 * @param {string} username - Username to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export const validateUsername = (username, options = {}) => {
  const {
    minLength = 3,
    maxLength = 50,
    allowUnderscore = true,
    allowHyphen = true,
    allowNumbers = true,
  } = options;

  if (!username) {
    return { valid: false, error: "Username is required" };
  }

  if (username.length < minLength) {
    return {
      valid: false,
      error: `Username must be at least ${minLength} characters`,
    };
  }

  if (username.length > maxLength) {
    return {
      valid: false,
      error: `Username cannot exceed ${maxLength} characters`,
    };
  }

  let pattern = "^[a-zA-Z";
  if (allowNumbers) pattern += "0-9";
  if (allowUnderscore) pattern += "_";
  if (allowHyphen) pattern += "-";
  pattern += "]+$";

  const usernameRegex = new RegExp(pattern);
  if (!usernameRegex.test(username)) {
    let allowed = "letters";
    if (allowNumbers) allowed += ", numbers";
    if (allowUnderscore) allowed += ", underscores";
    if (allowHyphen) allowed += ", hyphens";
    return { valid: false, error: `Username can only contain ${allowed}` };
  }

  return { valid: true };
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export const validatePassword = (password, options = {}) => {
  const {
    minLength = 8,
    maxLength = 100,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
  } = options;

  if (!password) {
    return { valid: false, error: "Password is required" };
  }

  if (password.length < minLength) {
    return {
      valid: false,
      error: `Password must be at least ${minLength} characters`,
    };
  }

  if (password.length > maxLength) {
    return {
      valid: false,
      error: `Password cannot exceed ${maxLength} characters`,
    };
  }

  const checks = [];

  if (requireUppercase && !/[A-Z]/.test(password)) {
    checks.push("uppercase letter");
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    checks.push("lowercase letter");
  }

  if (requireNumbers && !/[0-9]/.test(password)) {
    checks.push("number");
  }

  if (
    requireSpecialChars &&
    !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  ) {
    checks.push("special character");
  }

  if (checks.length > 0) {
    const error =
      checks.length === 1
        ? `Password must contain at least one ${checks[0]}`
        : `Password must contain at least one ${checks.slice(0, -1).join(", ")} and one ${checks.slice(-1)}`;
    return { valid: false, error };
  }

  return { valid: true };
};

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export const isValidUrl = (url) => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @param {string} country - Country code (optional)
 * @returns {boolean} True if valid phone number
 */
export const isValidPhone = (phone, country = "US") => {
  if (!phone) return false;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // Basic validation - adjust based on country
  const phonePatterns = {
    US: /^[2-9]\d{2}[2-9]\d{2}\d{4}$/,
    UK: /^\d{10}$/,
    IN: /^\d{10}$/,
  };

  const pattern = phonePatterns[country] || /^\d{10,15}$/;
  return pattern.test(digits);
};

// ============================================
// Number Validation
// ============================================

/**
 * Validate if value is a number
 * @param {any} value - Value to check
 * @returns {boolean} True if number
 */
export const isNumber = (value) => {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
};

/**
 * Validate if value is an integer
 * @param {any} value - Value to check
 * @returns {boolean} True if integer
 */
export const isInteger = (value) => {
  return Number.isInteger(Number(value));
};

/**
 * Validate if value is within range
 * @param {number} value - Value to check
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} True if within range
 */
export const isInRange = (value, min, max) => {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
};

/**
 * Validate percentage
 * @param {number} value - Value to check
 * @returns {boolean} True if valid percentage (0-100)
 */
export const isValidPercentage = (value) => {
  return isInRange(value, 0, 100);
};

// ============================================
// Date Validation
// ============================================

/**
 * Validate if value is a valid date
 * @param {any} value - Value to check
 * @returns {boolean} True if valid date
 */
export const isValidDate = (value) => {
  const date = new Date(value);
  return date instanceof Date && !isNaN(date);
};

/**
 * Validate if date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if past date
 */
export const isPastDate = (date) => {
  const checkDate = new Date(date);
  return isValidDate(checkDate) && checkDate < new Date();
};

/**
 * Validate if date is in the future
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if future date
 */
export const isFutureDate = (date) => {
  const checkDate = new Date(date);
  return isValidDate(checkDate) && checkDate > new Date();
};

/**
 * Validate date range
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {Object} Validation result
 */
export const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (!isValidDate(start) || !isValidDate(end)) {
    return { valid: false, error: "Invalid date format" };
  }

  if (end < start) {
    return { valid: false, error: "End date must be after start date" };
  }

  return { valid: true };
};

// ============================================
// File Validation
// ============================================

/**
 * Validate file type
 * @param {File} file - File object
 * @param {Array} allowedTypes - Allowed MIME types
 * @returns {Object} Validation result
 */
export const validateFileMimeType = (file, allowedTypes = []) => {
  if (!file) return { valid: false, error: "No file provided" };

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
    };
  }

  return { valid: true };
};

/**
 * Validate file size
 * @param {File} file - File object
 * @param {number} maxSize - Maximum size in bytes
 * @returns {Object} Validation result
 */
export const validateFileMaxSize = (file, maxSize) => {
  if (!file) return { valid: false, error: "No file provided" };

  if (file.size > maxSize) {
    const sizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size exceeds maximum allowed size (${sizeMB} MB)`,
    };
  }

  return { valid: true };
};

/**
 * Validate file dimensions (for images)
 * @param {File} file - Image file
 * @param {Object} options - Dimension constraints
 * @returns {Promise<Object>} Validation result
 */
export const validateImageDimensions = async (file, options = {}) => {
  const { minWidth, maxWidth, minHeight, maxHeight, exactWidth, exactHeight } =
    options;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      if (exactWidth && img.width !== exactWidth) {
        resolve({
          valid: false,
          error: `Image width must be exactly ${exactWidth}px`,
        });
        return;
      }

      if (exactHeight && img.height !== exactHeight) {
        resolve({
          valid: false,
          error: `Image height must be exactly ${exactHeight}px`,
        });
        return;
      }

      if (minWidth && img.width < minWidth) {
        resolve({
          valid: false,
          error: `Image width must be at least ${minWidth}px`,
        });
        return;
      }

      if (maxWidth && img.width > maxWidth) {
        resolve({
          valid: false,
          error: `Image width must not exceed ${maxWidth}px`,
        });
        return;
      }

      if (minHeight && img.height < minHeight) {
        resolve({
          valid: false,
          error: `Image height must be at least ${minHeight}px`,
        });
        return;
      }

      if (maxHeight && img.height > maxHeight) {
        resolve({
          valid: false,
          error: `Image height must not exceed ${maxHeight}px`,
        });
        return;
      }

      resolve({ valid: true });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, error: "Invalid image file" });
    };

    img.src = url;
  });
};

// ============================================
// Form Validation
// ============================================

/**
 * Validate required field
 * @param {any} value - Field value
 * @param {string} fieldName - Field name for error message
 * @returns {Object} Validation result
 */
export const validateRequired = (value, fieldName = "Field") => {
  if (value === undefined || value === null || value === "") {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
};

/**
 * Validate minimum length
 * @param {string} value - String value
 * @param {number} minLength - Minimum length
 * @param {string} fieldName - Field name for error message
 * @returns {Object} Validation result
 */
export const validateMinLength = (value, minLength, fieldName = "Field") => {
  if (!value || value.length < minLength) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${minLength} characters`,
    };
  }
  return { valid: true };
};

/**
 * Validate maximum length
 * @param {string} value - String value
 * @param {number} maxLength - Maximum length
 * @param {string} fieldName - Field name for error message
 * @returns {Object} Validation result
 */
export const validateMaxLength = (value, maxLength, fieldName = "Field") => {
  if (value && value.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} cannot exceed ${maxLength} characters`,
    };
  }
  return { valid: true };
};

/**
 * Validate exact length
 * @param {string} value - String value
 * @param {number} length - Exact length
 * @param {string} fieldName - Field name for error message
 * @returns {Object} Validation result
 */
export const validateExactLength = (value, length, fieldName = "Field") => {
  if (!value || value.length !== length) {
    return {
      valid: false,
      error: `${fieldName} must be exactly ${length} characters`,
    };
  }
  return { valid: true };
};

/**
 * Validate matches pattern
 * @param {string} value - String value
 * @param {RegExp} pattern - Regex pattern
 * @param {string} message - Error message
 * @returns {Object} Validation result
 */
export const validatePattern = (value, pattern, message = "Invalid format") => {
  if (!value || !pattern.test(value)) {
    return { valid: false, error: message };
  }
  return { valid: true };
};

/**
 * Validate that two fields match
 * @param {any} value - First value
 * @param {any} matchValue - Second value to match
 * @param {string} fieldName - Field name for error message
 * @returns {Object} Validation result
 */
export const validateMatch = (value, matchValue, fieldName = "Fields") => {
  if (value !== matchValue) {
    return { valid: false, error: `${fieldName} do not match` };
  }
  return { valid: true };
};

// ============================================
// OTP Validation
// ============================================

/**
 * Validate OTP code
 * @param {string} otp - OTP code
 * @param {number} length - Expected length
 * @returns {Object} Validation result
 */
export const validateOTP = (otp, length = 6) => {
  if (!otp) {
    return { valid: false, error: "OTP code is required" };
  }

  const otpStr = otp.toString().trim();

  if (otpStr.length !== length) {
    return { valid: false, error: `OTP must be ${length} digits` };
  }

  if (!/^\d+$/.test(otpStr)) {
    return { valid: false, error: "OTP must contain only digits" };
  }

  return { valid: true };
};

// ============================================
// Export all validation helpers
// ============================================

export default {
  isValidEmail,
  validateUsername,
  validatePassword,
  isValidUrl,
  isValidPhone,
  isNumber,
  isInteger,
  isInRange,
  isValidPercentage,
  isValidDate,
  isPastDate,
  isFutureDate,
  validateDateRange,
  validateFileMimeType,
  validateFileMaxSize,
  validateImageDimensions,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateExactLength,
  validatePattern,
  validateMatch,
  validateOTP,
};
