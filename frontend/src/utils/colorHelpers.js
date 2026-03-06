/**
 * Color Helpers
 * Utilities for generating and manipulating colors for charts and UI
 */

// ============================================
// Color Palettes
// ============================================

/**
 * Predefined color palettes for charts
 */
export const COLOR_PALETTES = {
  // Default palette
  default: [
    "#4f46e5", // Indigo
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#84cc16", // Lime
    "#6366f1", // Indigo
    "#14b8a6", // Teal
  ],

  // Pastel palette
  pastel: [
    "#a5b4fc", // Light Indigo
    "#6ee7b7", // Light Emerald
    "#fcd34d", // Light Amber
    "#fca5a5", // Light Red
    "#c4b5fd", // Light Violet
    "#f9a8d4", // Light Pink
    "#7dd3fc", // Light Cyan
    "#bef264", // Light Lime
  ],

  // Vibrant palette
  vibrant: [
    "#ff006e", // Hot Pink
    "#8338ec", // Purple
    "#3a86ff", // Blue
    "#fb5607", // Orange
    "#ffbe0b", // Yellow
    "#00bbf9", // Sky Blue
    "#00f5d4", // Turquoise
    "#9b5de5", // Lavender
  ],

  // Monochromatic (blue)
  monochrome: [
    "#e0f2fe", // 50
    "#bae6fd", // 100
    "#7dd3fc", // 200
    "#38bdf8", // 300
    "#0ea5e9", // 400
    "#0284c7", // 500
    "#0369a1", // 600
    "#075985", // 700
    "#0c4a6e", // 800
    "#082f49", // 900
  ],

  // Gradient palettes
  gradients: {
    sunset: ["#ff6b6b", "#feca57", "#ff9f43"],
    ocean: ["#54a0ff", "#5f9ea0", "#48dbfb"],
    forest: ["#1dd1a1", "#10ac84", "#2ecc71"],
    royal: ["#5f27cd", "#341f97", "#222f3e"],
    candy: ["#ff9ff3", "#feca57", "#ff6b6b", "#48dbfb"],
  },

  // Status colors
  status: {
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",
    pending: "#8b5cf6",
    active: "#10b981",
    inactive: "#9ca3af",
    disabled: "#d1d5db",
  },
};

// ============================================
// Color Generation
// ============================================

/**
 * Generate random color
 * @returns {string} Random hex color
 */
export const generateRandomColor = () => {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

/**
 * Generate random color with seed
 * @param {number} seed - Seed value for consistent colors
 * @returns {string} Deterministic color
 */
export const generateSeededColor = (seed) => {
  const hash = String(seed)
    .split("")
    .reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

  const color = Math.abs(hash).toString(16).substring(0, 6).padStart(6, "0");
  return `#${color}`;
};

/**
 * Generate color from string (username, filename, etc.)
 * @param {string} str - Input string
 * @returns {string} Hex color
 */
export const generateColorFromString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ("00" + value.toString(16)).substr(-2);
  }

  return color;
};

/**
 * Generate gradient colors
 * @param {string} startColor - Start color hex
 * @param {string} endColor - End color hex
 * @param {number} steps - Number of steps
 * @returns {Array} Array of gradient colors
 */
export const generateGradient = (startColor, endColor, steps = 5) => {
  const start = hexToRgb(startColor);
  const end = hexToRgb(endColor);
  const colors = [];

  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    const r = Math.round(start.r + (end.r - start.r) * ratio);
    const g = Math.round(start.g + (end.g - start.g) * ratio);
    const b = Math.round(start.b + (end.b - start.b) * ratio);
    colors.push(rgbToHex(r, g, b));
  }

  return colors;
};

// ============================================
// Color Conversion
// ============================================

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color code
 * @returns {Object} RGB values
 */
export const hexToRgb = (hex) => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => {
    return r + r + g + g + b + b;
  });

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

/**
 * Convert RGB to hex
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {string} Hex color code
 */
export const rgbToHex = (r, g, b) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

/**
 * Convert hex to HSL
 * @param {string} hex - Hex color code
 * @returns {Object} HSL values
 */
export const hexToHsl = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        h = 0;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

/**
 * Convert HSL to hex
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {string} Hex color code
 */
export const hslToHex = (h, s, l) => {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return rgbToHex(
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255),
  );
};

// ============================================
// Color Manipulation
// ============================================

/**
 * Lighten a color
 * @param {string} color - Hex color code
 * @param {number} percent - Lighten percentage (0-100)
 * @returns {string} Lightened color
 */
export const lightenColor = (color, percent) => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const factor = percent / 100;
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor));
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor));
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor));

  return rgbToHex(r, g, b);
};

/**
 * Darken a color
 * @param {string} color - Hex color code
 * @param {number} percent - Darken percentage (0-100)
 * @returns {string} Darkened color
 */
export const darkenColor = (color, percent) => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const factor = percent / 100;
  const r = Math.max(0, Math.round(rgb.r * (1 - factor)));
  const g = Math.max(0, Math.round(rgb.g * (1 - factor)));
  const b = Math.max(0, Math.round(rgb.b * (1 - factor)));

  return rgbToHex(r, g, b);
};

/**
 * Get contrasting text color (black or white)
 * @param {string} backgroundColor - Background color hex
 * @returns {string} Contrasting text color (#000000 or #ffffff)
 */
export const getContrastText = (backgroundColor) => {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return "#000000";

  // Calculate luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

  return luminance > 0.5 ? "#000000" : "#ffffff";
};

/**
 * Get color opacity
 * @param {string} color - Hex color code
 * @param {number} opacity - Opacity value (0-1)
 * @returns {string} RGBA color string
 */
export const getColorWithOpacity = (color, opacity) => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
};

/**
 * Blend two colors
 * @param {string} color1 - First color hex
 * @param {string} color2 - Second color hex
 * @param {number} ratio - Blend ratio (0-1, 0 = color1, 1 = color2)
 * @returns {string} Blended color
 */
export const blendColors = (color1, color2, ratio = 0.5) => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return color1;

  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * ratio);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * ratio);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * ratio);

  return rgbToHex(r, g, b);
};

// ============================================
// Chart Color Utilities
// ============================================

/**
 * Get color palette for chart
 * @param {string} paletteName - Palette name
 * @param {number} count - Number of colors needed
 * @returns {Array} Array of colors
 */
export const getChartPalette = (paletteName = "default", count = null) => {
  const palette = COLOR_PALETTES[paletteName] || COLOR_PALETTES.default;

  if (!count) return palette;

  // If we need more colors than available, generate additional colors
  if (count > palette.length) {
    const colors = [...palette];
    for (let i = palette.length; i < count; i++) {
      colors.push(generateSeededColor(i));
    }
    return colors;
  }

  return palette.slice(0, count);
};

/**
 * Get color for metric based on value and thresholds
 * @param {number} value - Metric value
 * @param {Object} thresholds - Threshold configuration
 * @returns {string} Color code
 */
export const getMetricColor = (value, thresholds = {}) => {
  const { warning = 70, critical = 90 } = thresholds;

  if (value >= critical) return COLOR_PALETTES.status.error;
  if (value >= warning) return COLOR_PALETTES.status.warning;
  return COLOR_PALETTES.status.success;
};

/**
 * Get status color
 * @param {string} status - Status string
 * @returns {string} Color code
 */
export const getStatusColor = (status) => {
  const statusColors = {
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",
    active: "#10b981",
    inactive: "#9ca3af",
    pending: "#8b5cf6",
    completed: "#10b981",
    failed: "#ef4444",
    cancelled: "#6b7280",
    processing: "#f59e0b",
  };

  return statusColors[status] || statusColors.info;
};

/**
 * Generate color scale for heatmap
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {Array} colors - Color stops
 * @returns {Function} Color interpolation function
 */
export const createHeatmapScale = (
  min,
  max,
  colors = ["#ffffff", "#4f46e5"],
) => {
  const colorStops = colors.map((color) => hexToRgb(color));

  return (value) => {
    const t = (value - min) / (max - min);
    const index = t * (colorStops.length - 1);
    const i1 = Math.floor(index);
    const i2 = Math.min(i1 + 1, colorStops.length - 1);
    const ratio = index - i1;

    const rgb1 = colorStops[i1];
    const rgb2 = colorStops[i2];

    if (!rgb1 || !rgb2) return colors[0];

    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * ratio);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * ratio);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * ratio);

    return rgbToHex(r, g, b);
  };
};

// ============================================
// Export all color helpers
// ============================================

export default {
  COLOR_PALETTES,
  generateRandomColor,
  generateSeededColor,
  generateColorFromString,
  generateGradient,
  hexToRgb,
  rgbToHex,
  hexToHsl,
  hslToHex,
  lightenColor,
  darkenColor,
  getContrastText,
  getColorWithOpacity,
  blendColors,
  getChartPalette,
  getMetricColor,
  getStatusColor,
  createHeatmapScale,
};
