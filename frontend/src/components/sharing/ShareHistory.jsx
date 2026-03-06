import React, { useState } from "react";
import { useShare } from "../../hooks/useShare";
import {
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiUser,
  FiFile,
  FiEye,
} from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import LoadingSpinner from "../common/LoadingSpinner";

const ShareHistory = () => {
  const { sentRequests, loading } = useShare();
  const [filter, setFilter] = useState("all"); // all, accepted, rejected, pending

  const getFilteredRequests = () => {
    if (filter === "all") return sentRequests;
    return sentRequests?.filter((req) => req.status === filter) || [];
  };

  const getTimeAgo = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "some time ago";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "accepted":
        return (
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs flex items-center">
            <FiCheckCircle className="mr-1 h-3 w-3" />
            Accepted
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs flex items-center">
            <FiXCircle className="mr-1 h-3 w-3" />
            Rejected
          </span>
        );
      case "pending":
        return (
          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs flex items-center">
            <FiClock className="mr-1 h-3 w-3" />
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const filteredRequests = getFilteredRequests();

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "pending"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter("accepted")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "accepted"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            Accepted
          </button>
          <button
            onClick={() => setFilter("rejected")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "rejected"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* History list */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <FiClock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No share history
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            You haven't shared any files yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                    <FiFile className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {request.filename}
                    </h3>
                    <div className="flex items-center mt-2 space-x-4">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <FiUser className="mr-1 h-4 w-4" />
                        To: {request.recipient_username || "User"}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <FiClock className="mr-1 h-4 w-4" />
                        {getTimeAgo(request.requested_at)}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center space-x-3">
                      {getStatusBadge(request.status)}

                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <FiEye className="mr-1 h-3 w-3" />
                        Permissions:
                        <span className="ml-1">
                          {request.permissions?.can_view ? "View" : ""}
                          {request.permissions?.can_download ? " Download" : ""}
                          {request.permissions?.can_reshare ? " Reshare" : ""}
                        </span>
                      </div>
                    </div>

                    {request.responded_at && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Responded:{" "}
                        {new Date(request.responded_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShareHistory;
