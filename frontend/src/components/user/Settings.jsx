import React, { useState } from "react";
import { useSettings } from "../../hooks/useSettings";
import NotificationSettings from "./NotificationSettings";
import SecuritySettings from "./SecuritySettings";
import ApiKeys from "./ApiKeys";
import { FiBell, FiLock, FiKey, FiSave } from "react-icons/fi";
import LoadingSpinner from "../common/LoadingSpinner";
import toast from "react-hot-toast";

const Settings = () => {
  const { loading, saved, saveSettings } = useSettings();
  const [activeTab, setActiveTab] = useState("notifications");

  const tabs = [
    { id: "notifications", name: "Notifications", icon: FiBell },
    { id: "security", name: "Security", icon: FiLock },
    { id: "api", name: "API Keys", icon: FiKey },
  ];

  const handleSaveAll = async () => {
    await saveSettings();
    toast.success("Settings saved successfully");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <button
            onClick={handleSaveAll}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <FiSave className="h-4 w-4" />
            <span>Save All Changes</span>
          </button>
        </div>
        {saved && (
          <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">
            Settings saved successfully!
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-primary-600 text-primary-600 dark:text-primary-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "notifications" && <NotificationSettings />}
          {activeTab === "security" && <SecuritySettings />}
          {activeTab === "api" && <ApiKeys />}
        </div>
      </div>
    </div>
  );
};

export default Settings;
