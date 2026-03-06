import React, { useState, useEffect, useMemo } from "react";
import { useFiles } from "../../hooks/useFiles";
import { useShare } from "../../hooks/useShare";
import { useAuth } from "../../hooks/useAuth";
import StatsCards from "./StatsCards";
import RecentActivity from "./RecentActivity";
import StorageChart from "./StorageChart";
import QuickActions from "./QuickActions";
import LoadingSpinner from "../common/LoadingSpinner";
import { FiClock, FiCalendar } from "react-icons/fi";

const DashboardHome = () => {
  const { user } = useAuth();
  const { files, stats: fileStats, loading: filesLoading } = useFiles();
  const { sharedFiles, pendingRequests, loading: shareLoading } = useShare();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Compute greeting based on current time (no setState needed)
  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, [currentTime]);

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (filesLoading || shareLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {greeting}, {user?.username || "User"}!
            </h1>
            <p className="mt-2 text-primary-100">
              Welcome back to your secure file dashboard
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-4 text-primary-100">
            <div className="flex items-center">
              <FiCalendar className="mr-2" />
              <span>{formatDate(currentTime)}</span>
            </div>
            <div className="flex items-center">
              <FiClock className="mr-2" />
              <span>{formatTime(currentTime)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards
        files={files}
        sharedFiles={sharedFiles}
        pendingRequests={pendingRequests}
        stats={fileStats}
      />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Storage Chart - spans 2 columns on large screens */}
        <div className="lg:col-span-2">
          <StorageChart files={files} stats={fileStats} />
        </div>

        {/* Quick Actions - spans 1 column */}
        <div className="lg:col-span-1">
          <QuickActions />
        </div>
      </div>

      {/* Recent Activity - full width */}
      <div className="mt-6">
        <RecentActivity />
      </div>
    </div>
  );
};

export default DashboardHome;
