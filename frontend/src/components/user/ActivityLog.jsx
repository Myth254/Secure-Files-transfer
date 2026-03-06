import React, { useState, useMemo } from "react";
import {
  FiFile,
  FiShare2,
  FiDownload,
  FiUpload,
  FiLogIn,
  FiLogOut,
  FiClock,
  FiFilter,
} from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import LoadingSpinner from "../common/LoadingSpinner";

// Mock activity data - in a real app, this would come from an API
const MOCK_ACTIVITIES = [
  {
    id: 1,
    type: "login",
    action: "Logged in",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    ip: "192.168.1.100",
  },
  {
    id: 2,
    type: "upload",
    action: "Uploaded file",
    filename: "document.pdf",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    type: "share",
    action: "Shared file",
    filename: "image.jpg",
    recipient: "john_doe",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    type: "download",
    action: "Downloaded file",
    filename: "report.docx",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 5,
    type: "logout",
    action: "Logged out",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const ActivityLog = () => {
  const [loading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [activities] = useState(MOCK_ACTIVITIES);

  const getTimeAgo = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "some time ago";
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "login":
        return <FiLogIn className="h-5 w-5 text-green-500" />;
      case "logout":
        return <FiLogOut className="h-5 w-5 text-red-500" />;
      case "upload":
        return <FiUpload className="h-5 w-5 text-blue-500" />;
      case "download":
        return <FiDownload className="h-5 w-5 text-purple-500" />;
      case "share":
        return <FiShare2 className="h-5 w-5 text-yellow-500" />;
      default:
        return <FiFile className="h-5 w-5 text-gray-500" />;
    }
  };

  const filteredActivities = useMemo(() => {
    if (filter === "all") return activities;
    return activities.filter((a) => a.type === filter);
  }, [activities, filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Activity Log
        </h2>

        <div className="flex items-center space-x-2">
          <FiFilter className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Activities</option>
            <option value="login">Logins</option>
            <option value="upload">Uploads</option>
            <option value="download">Downloads</option>
            <option value="share">Shares</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredActivities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex-shrink-0">
              {getActivityIcon(activity.type)}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {activity.action}
                {activity.filename && (
                  <span className="text-primary-600 dark:text-primary-400 ml-1">
                    "{activity.filename}"
                  </span>
                )}
                {activity.recipient && (
                  <span className="text-gray-600 dark:text-gray-400 ml-1">
                    with {activity.recipient}
                  </span>
                )}
              </p>

              <div className="flex items-center mt-1 space-x-4">
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <FiClock className="mr-1 h-3 w-3" />
                  {getTimeAgo(activity.timestamp)}
                </div>
                {activity.ip && (
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <FiLogIn className="mr-1 h-3 w-3" />
                    IP: {activity.ip}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredActivities.length === 0 && (
          <div className="text-center py-12">
            <FiFile className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No activities found
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
