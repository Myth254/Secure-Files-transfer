import React, { useState, useMemo } from "react";
import { Outlet } from "react-router-dom";
import { Navbar, Sidebar } from "../common";
import { useTheme } from "../../hooks/useTheme";
import { useFiles } from "../../hooks/useFiles";
import { useShare } from "../../hooks/useShare";
import {
  FiFolder,
  FiShare2,
  FiInbox,
  FiHardDrive,
  FiUsers,
  FiActivity,
} from "react-icons/fi";

const DashboardLayout = ({ isAdmin = false }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { isDark } = useTheme();
  const { files, stats: fileStats } = useFiles();
  const { sharedFiles, pendingRequests } = useShare();

  // Use useMemo instead of useEffect + setState
  const stats = useMemo(
    () => ({
      totalFiles: files?.length || 0,
      sharedWithMe: sharedFiles?.length || 0,
      pendingRequests: pendingRequests?.length || 0,
      storageUsed: fileStats?.total_storage_mb || 0,
      storageTotal: 100, // This should come from config
    }),
    [files, sharedFiles, pendingRequests, fileStats],
  );

  const statCards = [
    {
      title: "Total Files",
      value: stats.totalFiles,
      icon: FiFolder,
      color: "bg-blue-500",
    },
    {
      title: "Shared With Me",
      value: stats.sharedWithMe,
      icon: FiShare2,
      color: "bg-green-500",
    },
    {
      title: "Pending Requests",
      value: stats.pendingRequests,
      icon: FiInbox,
      color: "bg-yellow-500",
    },
    {
      title: "Storage Used",
      value: `${stats.storageUsed} MB`,
      icon: FiHardDrive,
      color: "bg-purple-500",
    },
  ];

  if (isAdmin) {
    statCards.push(
      {
        title: "Total Users",
        value: 0, // This should come from admin API
        icon: FiUsers,
        color: "bg-indigo-500",
      },
      {
        title: "System Health",
        value: "98%",
        icon: FiActivity,
        color: "bg-red-500",
      },
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? "dark" : ""}`}>
      {/* Navbar */}
      <Navbar onMenuClick={() => setIsSidebarOpen(true)} />

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main content */}
        <main className="flex-1 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Welcome section */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Welcome back, User!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Here's what's happening with your files today.
              </p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((stat, index) => (
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
                    <div className={`${stat.color} p-3 rounded-lg`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Storage usage bar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Storage Usage
              </h2>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary-600 bg-primary-200 dark:text-primary-300 dark:bg-primary-900/30">
                      Used
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-primary-600 dark:text-primary-400">
                      {stats.storageUsed} MB / {stats.storageTotal} MB
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary-200 dark:bg-gray-700">
                  <div
                    style={{
                      width: `${(stats.storageUsed / stats.storageTotal) * 100}%`,
                    }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-600"
                  />
                </div>
              </div>
            </div>

            {/* Main content outlet */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
