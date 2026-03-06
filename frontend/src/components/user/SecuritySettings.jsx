import React, { useState } from "react";
import { useSettings } from "../../hooks/useSettings";
import { FiShield, FiClock, FiAlertCircle, FiKey } from "react-icons/fi";
import ChangePassword from "./ChangePassword";

const SecuritySettings = () => {
  const { settings, updateSettings } = useSettings();
  const [showChangePassword, setShowChangePassword] = useState(false);

  const sessionTimeouts = [
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 60, label: "1 hour" },
    { value: 120, label: "2 hours" },
    { value: 240, label: "4 hours" },
  ];

  const handleTwoFactorToggle = () => {
    updateSettings("security", {
      twoFactorEnabled: !settings.security.twoFactorEnabled,
    });
  };

  const handleSessionTimeoutChange = (e) => {
    updateSettings("security", {
      sessionTimeout: parseInt(e.target.value),
    });
  };

  const handleLoginAlertsToggle = () => {
    updateSettings("security", {
      loginAlerts: !settings.security.loginAlerts,
    });
  };

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FiKey className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Password
            </h3>
          </div>
          <button
            onClick={() => setShowChangePassword(!showChangePassword)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
          >
            {showChangePassword ? "Cancel" : "Change Password"}
          </button>
        </div>

        {showChangePassword && (
          <div className="mt-4">
            <ChangePassword onSuccess={() => setShowChangePassword(false)} />
          </div>
        )}
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FiShield className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Two-Factor Authentication
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add an extra layer of security to your account
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.security.twoFactorEnabled}
              onChange={handleTwoFactorToggle}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
          </label>
        </div>
      </div>

      {/* Session Timeout */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <FiClock className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Session Timeout
          </h3>
        </div>

        <select
          value={settings.security.sessionTimeout}
          onChange={handleSessionTimeoutChange}
          className="w-full md:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {sessionTimeouts.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Automatically log out after period of inactivity
        </p>
      </div>

      {/* Login Alerts */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FiAlertCircle className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Login Alerts
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Get notified of new login attempts
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.security.loginAlerts}
              onChange={handleLoginAlertsToggle}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
