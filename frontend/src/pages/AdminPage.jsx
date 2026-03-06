import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { FiUsers, FiSettings, FiActivity, FiShield } from "react-icons/fi";
import LoadingSpinner from "../components/common/LoadingSpinner";

const AdminPage = () => {
  const { user } = useAuth();
  const [loading] = useState(false);
  const [activeTab, setActiveTab] = useState("users");

  if (!user || user.role !== "admin") {
    return (
      <div className="text-center py-12">
        <FiShield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Access Denied
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          You don't have permission to access this page.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const tabs = [
    { id: "users", name: "Users", icon: FiUsers },
    { id: "system", name: "System Settings", icon: FiSettings },
    { id: "logs", name: "Activity Logs", icon: FiActivity },
  ];

  return (
    <div className="py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Admin Dashboard
      </h1>

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
          {activeTab === "users" && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                User Management
              </h2>
              {/* User management component would go here */}
              <p className="text-gray-600 dark:text-gray-400">
                User management functionality coming soon...
              </p>
            </div>
          )}

          {activeTab === "system" && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                System Settings
              </h2>
              {/* System settings component would go here */}
              <p className="text-gray-600 dark:text-gray-400">
                System settings coming soon...
              </p>
            </div>
          )}

          {activeTab === "logs" && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Activity Logs
              </h2>
              {/* Activity logs component would go here */}
              <p className="text-gray-600 dark:text-gray-400">
                Activity logs coming soon...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
