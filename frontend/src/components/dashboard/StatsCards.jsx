import React from "react";
import {
  FiFile,
  FiShare2,
  FiInbox,
  FiHardDrive,
  FiDownload,
  FiUpload,
} from "react-icons/fi";

const StatsCards = ({ files, sharedFiles, pendingRequests, stats }) => {
  const statCards = [
    {
      title: "Total Files",
      value: files?.length || 0,
      icon: FiFile,
      color: "bg-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Shared With Me",
      value: sharedFiles?.length || 0,
      icon: FiShare2,
      color: "bg-green-500",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      textColor: "text-green-600 dark:text-green-400",
    },
    {
      title: "Pending Requests",
      value: pendingRequests?.length || 0,
      icon: FiInbox,
      color: "bg-yellow-500",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
      textColor: "text-yellow-600 dark:text-yellow-400",
    },
    {
      title: "Storage Used",
      value: stats?.total_storage_mb
        ? `${stats.total_storage_mb.toFixed(2)} MB`
        : "0 MB",
      icon: FiHardDrive,
      color: "bg-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      textColor: "text-purple-600 dark:text-purple-400",
    },
  ];

  // Additional stats if available
  if (stats?.total_downloads !== undefined) {
    statCards.push({
      title: "Total Downloads",
      value: stats.total_downloads,
      icon: FiDownload,
      color: "bg-indigo-500",
      bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
      textColor: "text-indigo-600 dark:text-indigo-400",
    });
  }

  if (stats?.total_uploads !== undefined) {
    statCards.push({
      title: "Total Uploads",
      value: stats.total_uploads,
      icon: FiUpload,
      color: "bg-pink-500",
      bgColor: "bg-pink-50 dark:bg-pink-900/20",
      textColor: "text-pink-600 dark:text-pink-400",
    });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.title}
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                  {stat.value}
                </p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <Icon className={`h-6 w-6 ${stat.textColor}`} />
              </div>
            </div>

            {/* Progress bar for storage card */}
            {stat.title === "Storage Used" && stats?.total_storage_mb && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                  <span>Used</span>
                  <span>
                    {((stats.total_storage_mb / 100) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-purple-600 dark:bg-purple-500 rounded-full h-2 transition-all duration-500"
                    style={{
                      width: `${Math.min((stats.total_storage_mb / 100) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;
