import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useFiles } from "../../hooks/useFiles";
import { useShare } from "../../hooks/useShare";
import {
  FiFile,
  FiShare2,
  FiDownload,
  FiUpload,
  FiClock,
  FiUser,
  FiMoreHorizontal,
} from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";

const RecentActivity = () => {
  const { files } = useFiles();
  const { sharedFiles, pendingRequests } = useShare();
  const [showAll, setShowAll] = useState(false);

  // Compute activities using useMemo instead of useState + useEffect
  const activities = useMemo(() => {
    const allActivities = [];

    // File uploads
    files?.slice(0, 5).forEach((file) => {
      allActivities.push({
        id: `upload-${file.id}`,
        type: "upload",
        title: `Uploaded "${file.filename}"`,
        time: new Date(file.upload_date),
        icon: FiUpload,
        color: "text-blue-500",
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
        link: `/files/${file.id}`,
      });
    });

    // Shared files
    sharedFiles?.slice(0, 5).forEach((file) => {
      allActivities.push({
        id: `share-${file.file_id}`,
        type: "share",
        title: `Shared "${file.filename}" with you`,
        time: new Date(file.access_granted),
        icon: FiShare2,
        color: "text-green-500",
        bgColor: "bg-green-50 dark:bg-green-900/20",
        link: `/shared`,
      });
    });

    // Share requests
    pendingRequests?.slice(0, 5).forEach((request) => {
      allActivities.push({
        id: `request-${request.id}`,
        type: "request",
        title: `Share request for "${request.filename}"`,
        time: new Date(request.requested_at),
        icon: FiFile,
        color: "text-yellow-500",
        bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
        link: "/share-requests",
      });
    });

    // Sort by time (most recent first)
    allActivities.sort((a, b) => b.time - a.time);

    return allActivities;
  }, [files, sharedFiles, pendingRequests]);

  const displayedActivities = showAll ? activities : activities.slice(0, 5);

  const getTimeAgo = (date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "some time ago";
    }
  };

  if (activities.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="text-center">
          <FiClock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Recent Activity
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Upload files or share with others to see activity here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Recent Activity
        </h2>
        {activities.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center"
          >
            <FiMoreHorizontal className="mr-1" />
            {showAll ? "Show Less" : "View All"}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {displayedActivities.map((activity) => {
          const Icon = activity.icon;
          return (
            <Link
              key={activity.id}
              to={activity.link}
              className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
            >
              <div className={`${activity.bgColor} p-2 rounded-lg`}>
                <Icon className={`h-5 w-5 ${activity.color}`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {activity.title}
                </p>
                <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <FiClock className="mr-1 h-3 w-3" />
                  {getTimeAgo(activity.time)}
                </div>
              </div>

              <div className="flex-shrink-0 self-center">
                <FiUser className="h-4 w-4 text-gray-400" />
              </div>
            </Link>
          );
        })}
      </div>

      {activities.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
