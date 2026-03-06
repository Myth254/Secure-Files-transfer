import React, { useState } from "react";
import {
  FiMoreVertical,
  FiX,
  FiMapPin,
  FiMonitor,
  FiClock,
} from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import ConfirmationModal from "../../common/ConfirmationModal";

const SessionTable = ({ sessions, onTerminate }) => {
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  const getTimeAgo = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "some time ago";
    }
  };

  const getDeviceIcon = (device) => {
    switch (device) {
      case "mobile":
        return (
          <FiMonitor className="h-4 w-4 text-green-500 transform rotate-90" />
        );
      default:
        return <FiMonitor className="h-4 w-4 text-blue-500" />;
    }
  };

  const handleTerminateClick = (session) => {
    setSelectedSession(session);
    setShowTerminateModal(true);
  };

  const handleTerminateConfirm = async () => {
    if (selectedSession) {
      await onTerminate(selectedSession.id);
    }
    setShowTerminateModal(false);
    setSelectedSession(null);
  };

  if (!sessions || sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <FiUsers className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-gray-600 dark:text-gray-400">No active sessions</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Device
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Login Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Last Activity
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sessions.map((session) => (
              <tr
                key={session.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-700 dark:text-primary-400">
                        {session.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {session.username}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {session.id}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiMapPin className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {session.client?.city || "Unknown"},{" "}
                      {session.client?.country || "Unknown"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    IP: {session.ip_address}
                  </p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    {getDeviceIcon(session.client?.device)}
                    <span className="ml-1 text-sm text-gray-900 dark:text-white">
                      {session.client?.browser || "Unknown"} on{" "}
                      {session.client?.os || "Unknown"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiClock className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {new Date(session.login_time).toLocaleString()}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-900 dark:text-white">
                    {getTimeAgo(session.last_activity)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <button
                    onClick={() => handleTerminateClick(session)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Terminate Session"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmationModal
        isOpen={showTerminateModal}
        onClose={() => {
          setShowTerminateModal(false);
          setSelectedSession(null);
        }}
        onConfirm={handleTerminateConfirm}
        title="Terminate Session"
        message={`Are you sure you want to terminate the session for user "${selectedSession?.username}"? They will be logged out immediately.`}
        confirmText="Terminate"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
};

export default SessionTable;
