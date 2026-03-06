import React from "react";
import { useShare } from "../../hooks/useShare";
import {
  FiShare2,
  FiUsers,
  FiDownload,
  FiCheckCircle,
  FiClock,
  FiTrendingUp,
} from "react-icons/fi";

const ShareStats = () => {
  const { shareStats } = useShare();

  if (!shareStats) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <p className="text-gray-600 dark:text-gray-400 text-center">
          No sharing statistics available
        </p>
      </div>
    );
  }

  const stats = [
    {
      title: "Shares Sent",
      value: shareStats.shares_sent || 0,
      icon: FiShare2,
      color: "bg-blue-500",
      textColor: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "Shares Received",
      value: shareStats.shares_received || 0,
      icon: FiUsers,
      color: "bg-green-500",
      textColor: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "Files Accessible",
      value: shareStats.files_accessible || 0,
      icon: FiCheckCircle,
      color: "bg-purple-500",
      textColor: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      title: "Total Downloads",
      value: shareStats.total_downloads || 0,
      icon: FiDownload,
      color: "bg-orange-500",
      textColor: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
    },
    {
      title: "Acceptance Rate",
      value: `${shareStats.acceptance_rate || 0}%`,
      icon: FiTrendingUp,
      color: "bg-indigo-500",
      textColor: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
    },
    {
      title: "Pending Requests",
      value: shareStats.shares_pending || 0,
      icon: FiClock,
      color: "bg-yellow-500",
      textColor: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
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
            </div>
          );
        })}
      </div>

      {/* Activity summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Sharing Activity
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">
                Shares Sent
              </span>
              <span className="text-gray-900 dark:text-white font-medium">
                {shareStats.shares_sent || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 rounded-full h-2"
                style={{
                  width: `${Math.min((shareStats.shares_sent / (shareStats.shares_sent + shareStats.shares_received || 1)) * 100, 100)}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">
                Shares Received
              </span>
              <span className="text-gray-900 dark:text-white font-medium">
                {shareStats.shares_received || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-600 rounded-full h-2"
                style={{
                  width: `${Math.min((shareStats.shares_received / (shareStats.shares_sent + shareStats.shares_received || 1)) * 100, 100)}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">
                Acceptance Rate
              </span>
              <span className="text-gray-900 dark:text-white font-medium">
                {shareStats.acceptance_rate || 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-indigo-600 rounded-full h-2"
                style={{ width: `${shareStats.acceptance_rate || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareStats;
