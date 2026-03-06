import React from "react";
import { Link } from "react-router-dom";
import {
  FiUpload,
  FiDownload,
  FiShare2,
  FiFile,
  FiPlus,
  FiUsers,
  FiSettings,
  FiHelpCircle,
} from "react-icons/fi";

const QuickActions = () => {
  const actions = [
    {
      title: "Upload File",
      description: "Upload a new file securely",
      icon: FiUpload,
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-600",
      link: "/files/upload",
    },
    {
      title: "Share File",
      description: "Share files with others",
      icon: FiShare2,
      color: "bg-green-500",
      hoverColor: "hover:bg-green-600",
      link: "/files",
    },
    {
      title: "Create Folder",
      description: "Organize your files",
      icon: FiFile,
      color: "bg-purple-500",
      hoverColor: "hover:bg-purple-600",
      link: "/files/new-folder",
    },
    {
      title: "View Shared",
      description: "See files shared with you",
      icon: FiUsers,
      color: "bg-yellow-500",
      hoverColor: "hover:bg-yellow-600",
      link: "/shared",
    },
  ];

  const secondaryActions = [
    {
      title: "Download All",
      description: "Download files as ZIP",
      icon: FiDownload,
      color: "bg-indigo-500",
      link: "/files/download-all",
    },
    {
      title: "Settings",
      description: "Configure preferences",
      icon: FiSettings,
      color: "bg-gray-500",
      link: "/settings",
    },
    {
      title: "Help & Support",
      description: "Get assistance",
      icon: FiHelpCircle,
      color: "bg-pink-500",
      link: "/help",
    },
    {
      title: "New Request",
      description: "Request file access",
      icon: FiPlus,
      color: "bg-teal-500",
      link: "/share-requests/new",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Primary Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                to={action.link}
                className={`group flex flex-col items-center p-4 rounded-lg text-white transition-all transform hover:scale-105 ${action.color} ${action.hoverColor}`}
              >
                <Icon className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium text-center">
                  {action.title}
                </span>
                <span className="text-xs text-white/80 mt-1 text-center hidden group-hover:block">
                  {action.description}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Secondary Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          More Actions
        </h3>
        <div className="space-y-2">
          {secondaryActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                to={action.link}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
              >
                <div className={`${action.color} p-2 rounded-lg`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
                    {action.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {action.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Storage Alert */}
      <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg p-4">
        <h4 className="text-sm font-medium text-primary-800 dark:text-primary-300 mb-2">
          Storage Tip
        </h4>
        <p className="text-xs text-primary-600 dark:text-primary-400">
          You have 10GB of free storage remaining. Upgrade your plan for more
          space.
        </p>
        <button className="mt-3 text-xs bg-primary-600 text-white px-3 py-1 rounded hover:bg-primary-700 transition-colors">
          Upgrade Now
        </button>
      </div>
    </div>
  );
};

export default QuickActions;
