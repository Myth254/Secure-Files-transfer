import React, { useState } from "react";
import { FiBell, FiMail, FiSlack, FiMessageSquare } from "react-icons/fi";
import { useSettings } from "../../../hooks/useSettings";
import LoadingSpinner from "../../common/LoadingSpinner";
import toast from "react-hot-toast";

const AlertNotifications = () => {
  const { settings, updateSettings, loading, saveSettings } = useSettings();
  const [testSending, setTestSending] = useState(false);

  const channels = [
    {
      id: "email",
      name: "Email",
      icon: FiMail,
      description: "Send alerts via email",
    },
    {
      id: "slack",
      name: "Slack",
      icon: FiSlack,
      description: "Send alerts to Slack channel",
    },
    {
      id: "discord",
      name: "Discord",
      icon: FiMessageSquare,
      description: "Send alerts to Discord webhook",
    },
  ];

  const handleToggle = (channelId) => {
    updateSettings("notifications", {
      [channelId]: !settings.notifications?.[channelId],
    });
  };

  const handleTest = async (channel) => {
    setTestSending(true);

    // Simulate sending test notification
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast.success(`Test notification sent to ${channel}`);
    setTestSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start">
          <FiBell className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              Alert Notifications
            </h3>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
              Configure how you want to receive alert notifications. You can
              enable multiple channels.
            </p>
          </div>
        </div>
      </div>

      {channels.map((channel) => {
        const Icon = channel.icon;
        const isEnabled = settings.notifications?.[channel.id];

        return (
          <div
            key={channel.id}
            className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Icon
                  className={`h-6 w-6 ${
                    isEnabled ? "text-primary-600" : "text-gray-400"
                  }`}
                />
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {channel.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {channel.description}
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => handleToggle(channel.id)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {isEnabled && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {channel.id === "email" && (
                      <p>
                        Alerts will be sent to your registered email address
                      </p>
                    )}
                    {channel.id === "slack" && (
                      <p>
                        Configure your Slack webhook URL in environment
                        variables
                      </p>
                    )}
                    {channel.id === "discord" && (
                      <p>
                        Configure your Discord webhook URL in environment
                        variables
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleTest(channel.name)}
                    disabled={testSending}
                    className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-900/50 text-sm disabled:opacity-50"
                  >
                    {testSending ? "Sending..." : "Send Test"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex justify-end pt-4">
        <button
          onClick={saveSettings}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Save Notification Settings
        </button>
      </div>
    </div>
  );
};

export default AlertNotifications;
