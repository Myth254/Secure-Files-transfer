/**
 * Theme Configuration
 * Centralized theme configuration for the entire application
 */

// ============================================
// Color Palette
// ============================================

export const COLORS = {
  // Primary colors
  primary: {
    50: "#eef2ff",
    100: "#e0e7ff",
    200: "#c7d2fe",
    300: "#a5b4fc",
    400: "#818cf8",
    500: "#6366f1",
    600: "#4f46e5",
    700: "#4338ca",
    800: "#3730a3",
    900: "#312e81",
    950: "#1e1b4b",
  },

  // Secondary colors
  secondary: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
    950: "#022c22",
  },

  // Neutral colors
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
    950: "#030712",
  },

  // Status colors
  success: {
    light: "#10b981",
    dark: "#059669",
    bg: "#d1fae5",
    text: "#065f46",
  },

  warning: {
    light: "#f59e0b",
    dark: "#d97706",
    bg: "#fef3c7",
    text: "#92400e",
  },

  error: {
    light: "#ef4444",
    dark: "#dc2626",
    bg: "#fee2e2",
    text: "#991b1b",
  },

  info: {
    light: "#3b82f6",
    dark: "#2563eb",
    bg: "#dbeafe",
    text: "#1e40af",
  },
};

// ============================================
// Theme Configurations
// ============================================

export const THEMES = {
  light: {
    name: "light",
    colors: {
      background: {
        primary: "#ffffff",
        secondary: "#f9fafb",
        tertiary: "#f3f4f6",
      },
      text: {
        primary: "#111827",
        secondary: "#4b5563",
        tertiary: "#6b7280",
        inverse: "#ffffff",
      },
      border: {
        light: "#e5e7eb",
        default: "#d1d5db",
        dark: "#9ca3af",
      },
      card: {
        background: "#ffffff",
        border: "#e5e7eb",
        shadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      },
      input: {
        background: "#ffffff",
        border: "#d1d5db",
        focus: "#4f46e5",
        placeholder: "#9ca3af",
      },
      button: {
        primary: COLORS.primary[600],
        primaryHover: COLORS.primary[700],
        secondary: COLORS.gray[200],
        secondaryHover: COLORS.gray[300],
        danger: COLORS.error.light,
        dangerHover: COLORS.error.dark,
      },
      chart: {
        grid: "rgba(0, 0, 0, 0.05)",
        text: "#6b7280",
      },
      sidebar: {
        background: "#ffffff",
        border: "#e5e7eb",
        hover: "#f3f4f6",
        active: "#eef2ff",
        text: "#4b5563",
        textActive: "#4f46e5",
      },
      navbar: {
        background: "#ffffff",
        border: "#e5e7eb",
        text: "#374151",
      },
    },
  },

  dark: {
    name: "dark",
    colors: {
      background: {
        primary: "#111827",
        secondary: "#1f2937",
        tertiary: "#374151",
      },
      text: {
        primary: "#f9fafb",
        secondary: "#e5e7eb",
        tertiary: "#d1d5db",
        inverse: "#111827",
      },
      border: {
        light: "#374151",
        default: "#4b5563",
        dark: "#6b7280",
      },
      card: {
        background: "#1f2937",
        border: "#374151",
        shadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
      },
      input: {
        background: "#374151",
        border: "#4b5563",
        focus: "#818cf8",
        placeholder: "#9ca3af",
      },
      button: {
        primary: COLORS.primary[500],
        primaryHover: COLORS.primary[600],
        secondary: COLORS.gray[700],
        secondaryHover: COLORS.gray[600],
        danger: COLORS.error.light,
        dangerHover: COLORS.error.dark,
      },
      chart: {
        grid: "rgba(255, 255, 255, 0.05)",
        text: "#9ca3af",
      },
      sidebar: {
        background: "#1f2937",
        border: "#374151",
        hover: "#374151",
        active: "#4f46e5",
        text: "#d1d5db",
        textActive: "#ffffff",
      },
      navbar: {
        background: "#1f2937",
        border: "#374151",
        text: "#e5e7eb",
      },
    },
  },
};

// ============================================
// Typography
// ============================================

export const TYPOGRAPHY = {
  fontFamily: {
    sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
    mono: ["JetBrains Mono", "monospace"],
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem",
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
};

// ============================================
// Spacing
// ============================================

export const SPACING = {
  0: "0px",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
  32: "8rem",
  40: "10rem",
  48: "12rem",
  56: "14rem",
  64: "16rem",
};

// ============================================
// Breakpoints
// ============================================

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

export const MEDIA_QUERIES = {
  sm: `@media (min-width: ${BREAKPOINTS.sm}px)`,
  md: `@media (min-width: ${BREAKPOINTS.md}px)`,
  lg: `@media (min-width: ${BREAKPOINTS.lg}px)`,
  xl: `@media (min-width: ${BREAKPOINTS.xl}px)`,
  "2xl": `@media (min-width: ${BREAKPOINTS["2xl"]}px)`,
  dark: "@media (prefers-color-scheme: dark)",
  light: "@media (prefers-color-scheme: light)",
  motion: "@media (prefers-reduced-motion: no-preference)",
  reducedMotion: "@media (prefers-reduced-motion: reduce)",
};

// ============================================
// Z-Index
// ============================================

export const Z_INDEX = {
  hide: -1,
  auto: "auto",
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
};

// ============================================
// Animations
// ============================================

export const ANIMATIONS = {
  duration: {
    fastest: 100,
    faster: 200,
    fast: 300,
    normal: 400,
    slow: 500,
    slower: 600,
    slowest: 700,
  },
  easing: {
    linear: "linear",
    easeIn: "cubic-bezier(0.4, 0, 1, 1)",
    easeOut: "cubic-bezier(0, 0, 0.2, 1)",
    easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  keyframes: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    fadeOut: {
      from: { opacity: 1 },
      to: { opacity: 0 },
    },
    slideIn: {
      from: { transform: "translateX(-100%)" },
      to: { transform: "translateX(0)" },
    },
    slideOut: {
      from: { transform: "translateX(0)" },
      to: { transform: "translateX(100%)" },
    },
    scaleIn: {
      from: { transform: "scale(0.9)", opacity: 0 },
      to: { transform: "scale(1)", opacity: 1 },
    },
    spin: {
      from: { transform: "rotate(0deg)" },
      to: { transform: "rotate(360deg)" },
    },
    pulse: {
      "0%, 100%": { opacity: 1 },
      "50%": { opacity: 0.5 },
    },
  },
};

// ============================================
// Shadows
// ============================================

export const SHADOWS = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  base: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
  none: "none",
};

// ============================================
// Border Radius
// ============================================

export const BORDER_RADIUS = {
  none: "0",
  sm: "0.125rem",
  base: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  "3xl": "1.5rem",
  full: "9999px",
};

// ============================================
// Export all theme configurations
// ============================================

export default {
  COLORS,
  THEMES,
  TYPOGRAPHY,
  SPACING,
  BREAKPOINTS,
  MEDIA_QUERIES,
  Z_INDEX,
  ANIMATIONS,
  SHADOWS,
  BORDER_RADIUS,
};
