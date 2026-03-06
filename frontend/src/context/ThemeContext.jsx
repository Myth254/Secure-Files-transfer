import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { THEMES } from "../config/themeConfig";

// Create context
const ThemeContext = createContext(null);

// Provider component
export const ThemeProvider = ({ children }) => {
  // Initialize theme from localStorage directly in useState
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme || "light";
  });

  // Apply theme to DOM whenever theme changes
  useEffect(() => {
    const themeColors = THEMES[theme]?.colors || THEMES.light.colors;

    // Apply CSS variables
    const root = document.documentElement;

    // Background colors
    root.style.setProperty("--bg-primary", themeColors.background.primary);
    root.style.setProperty("--bg-secondary", themeColors.background.secondary);
    root.style.setProperty("--bg-tertiary", themeColors.background.tertiary);

    // Text colors
    root.style.setProperty("--text-primary", themeColors.text.primary);
    root.style.setProperty("--text-secondary", themeColors.text.secondary);
    root.style.setProperty("--text-tertiary", themeColors.text.tertiary);
    root.style.setProperty("--text-inverse", themeColors.text.inverse);

    // Border colors
    root.style.setProperty("--border-light", themeColors.border.light);
    root.style.setProperty("--border-default", themeColors.border.default);
    root.style.setProperty("--border-dark", themeColors.border.dark);

    // Card colors
    root.style.setProperty("--card-bg", themeColors.card.background);
    root.style.setProperty("--card-border", themeColors.card.border);
    root.style.setProperty("--card-shadow", themeColors.card.shadow);

    // Input colors
    root.style.setProperty("--input-bg", themeColors.input.background);
    root.style.setProperty("--input-border", themeColors.input.border);
    root.style.setProperty("--input-focus", themeColors.input.focus);
    root.style.setProperty(
      "--input-placeholder",
      themeColors.input.placeholder,
    );

    // Button colors
    root.style.setProperty("--btn-primary", themeColors.button.primary);
    root.style.setProperty(
      "--btn-primary-hover",
      themeColors.button.primaryHover,
    );
    root.style.setProperty("--btn-secondary", themeColors.button.secondary);
    root.style.setProperty(
      "--btn-secondary-hover",
      themeColors.button.secondaryHover,
    );
    root.style.setProperty("--btn-danger", themeColors.button.danger);
    root.style.setProperty(
      "--btn-danger-hover",
      themeColors.button.dangerHover,
    );

    // Chart colors
    root.style.setProperty("--chart-grid", themeColors.chart.grid);
    root.style.setProperty("--chart-text", themeColors.chart.text);

    // Sidebar colors
    root.style.setProperty("--sidebar-bg", themeColors.sidebar.background);
    root.style.setProperty("--sidebar-border", themeColors.sidebar.border);
    root.style.setProperty("--sidebar-hover", themeColors.sidebar.hover);
    root.style.setProperty("--sidebar-active", themeColors.sidebar.active);
    root.style.setProperty("--sidebar-text", themeColors.sidebar.text);
    root.style.setProperty(
      "--sidebar-text-active",
      themeColors.sidebar.textActive,
    );

    // Navbar colors
    root.style.setProperty("--navbar-bg", themeColors.navbar.background);
    root.style.setProperty("--navbar-border", themeColors.navbar.border);
    root.style.setProperty("--navbar-text", themeColors.navbar.text);

    // Add dark class for Tailwind
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Save to localStorage
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Compute currentTheme directly without state
  const currentTheme = useMemo(() => THEMES[theme] || THEMES.light, [theme]);

  const switchTheme = useCallback((themeName) => {
    if (THEMES[themeName]) {
      setTheme(themeName);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      currentTheme,
      isDark: theme === "dark",
      isLight: theme === "light",
      switchTheme,
      toggleTheme,
    }),
    [theme, currentTheme, switchTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

// Export context for custom hook
export { ThemeContext };
