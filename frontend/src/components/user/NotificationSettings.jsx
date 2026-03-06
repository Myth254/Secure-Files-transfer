import React from "react";
import { useSettings } from "../../hooks/useSettings";
import { FiMail, FiBell, FiSmartphone, FiDesktop } from "react-icons/fi";

const NotificationSettings = () => {
  const { settings, updateSettings } = useSettings();

  const channels = [
    {
      id: "email",
      name: "Email",
      icon: FiMail,
      description: "Receive notifications via email",
    },
    {
      id: "push",
      name: "Push",
      icon: FiBell,
      description: "Browser push notifications",
    },
    {
      id: "desktop",
      name: "Desktop",
      icon: FiDesktop,
      description: "Desktop notifications",
    },
    {
      id: "sms",
      name: "SMS",
      icon: FiSmartphone,
      description: "Text message alerts",
    },
  ];

  const events = [
    {
      id: "fileUploads",
      name: "File Uploads",
      description: "When files are uploaded",
    },
    {
      id: "shares",
      name: "File Shares",
      description: "When files are shared with you",
    },
    {
      id: "downloads",
      name: "Downloads",
      description: "When your files are downloaded",
    },
    {
      id: "alerts",
      name: "System Alerts",
      description: "Important system notifications",
    },
  ];

  const handleChannelToggle = (channelId) => {
    updateSettings("notifications", {
      [channelId]: !settings.notifications[channelId],
    });
  };

  const handleEventToggle = (eventId) => {
    updateSettings("notifications", {
      [eventId]: !settings.notifications[eventId],
    });
  };

  return (
    <div className="space-y-6">
      {/* Notification Channels */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Notification Channels
        </h3>
        <div className="space-y-3">
          {channels.map((channel) => {
            const Icon = channel.icon;
            return (
              <label
                key={channel.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {channel.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {channel.description}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications[channel.id]}
                  onChange={() => handleChannelToggle(channel.id)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
            );
          })}
        </div>
      </div>

      {/* Notification Events */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Notification Events
        </h3>
        <div className="space-y-3">
          {events.map((event) => (
            <label
              key={event.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {event.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {event.description}
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications[event.id]}
                onChange={() => handleEventToggle(event.id)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
