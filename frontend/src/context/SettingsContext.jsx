import React, { createContext, useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

// Create context
const SettingsContext = createContext(null);

// Provider component
export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      desktop: true,
      fileUploads: true,
      shares: true,
      alerts: true,
    },
    privacy: {
      showEmail: false,
      showActivity: true,
      allowDataCollection: true,
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: 30,
      loginAlerts: true,
    },
    preferences: {
      language: "en",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12h",
      defaultFileSort: "upload_date_desc",
    },
    display: {
      compactMode: false,
      showThumbnails: true,
      itemsPerPage: 20,
    },
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("user_settings");
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (err) {
        console.error("Failed to parse saved settings:", err);
      }
    }
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem("user_settings", JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((section, newSettings) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...newSettings,
      },
    }));
    setSaved(false);
  }, []);

  const saveSettings = useCallback(async () => {
    setLoading(true);

    try {
      // Here you would typically save to backend
      // await userAPI.updateSettings(settings);

      setSaved(true);
      toast.success("Settings saved successfully");

      // Auto-hide saved message after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  }, []); // Removed settings dependency since it's not needed

  const resetSettings = useCallback(() => {
    setSettings({
      notifications: {
        email: true,
        push: true,
        desktop: true,
        fileUploads: true,
        shares: true,
        alerts: true,
      },
      privacy: {
        showEmail: false,
        showActivity: true,
        allowDataCollection: true,
      },
      security: {
        twoFactorEnabled: false,
        sessionTimeout: 30,
        loginAlerts: true,
      },
      preferences: {
        language: "en",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12h",
        defaultFileSort: "upload_date_desc",
      },
      display: {
        compactMode: false,
        showThumbnails: true,
        itemsPerPage: 20,
      },
    });
    toast.success("Settings reset to default");
  }, []);

  const value = {
    settings,
    loading,
    saved,
    updateSettings,
    saveSettings,
    resetSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// Export context for custom hook
export { SettingsContext };
