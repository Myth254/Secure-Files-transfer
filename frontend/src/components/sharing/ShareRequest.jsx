import React, { useState } from "react";
import { useShare } from "../../hooks/useShare";
import {
  FiUser,
  FiClock,
  FiCheck,
  FiX,
  FiEye,
  FiDownload,
  FiShare2,
} from "react-icons/fi";
import LoadingSpinner from "../common/LoadingSpinner";
import toast from "react-hot-toast";

const ShareRequest = ({ request, onResponse }) => {
  const { acceptShare, rejectShare } = useShare();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    const result = await acceptShare(request.id);
    if (result.success) {
      toast.success("Share request accepted");
      if (onResponse) onResponse("accepted");
    } else {
      toast.error(result.error || "Failed to accept request");
    }
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    const result = await rejectShare(request.id);
    if (result.success) {
      toast.success("Share request rejected");
      if (onResponse) onResponse("rejected");
    } else {
      toast.error(result.error || "Failed to reject request");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            <div className="bg-primary-100 dark:bg-primary-900/20 p-2 rounded-lg">
              <FiShare2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {request.filename}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                From: {request.owner_username || `User ${request.owner_id}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <FiUser className="mr-2 h-4 w-4" />
              <span>ID: {request.id}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <FiClock className="mr-2 h-4 w-4" />
              <span>{new Date(request.requested_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Permissions */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Permissions
            </h4>
            <div className="flex space-x-4">
              <span className="flex items-center text-xs">
                {request.permissions.can_view ? (
                  <FiCheck className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <FiX className="h-3 w-3 text-red-500 mr-1" />
                )}
                View
              </span>
              <span className="flex items-center text-xs">
                {request.permissions.can_download ? (
                  <FiCheck className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <FiX className="h-3 w-3 text-red-500 mr-1" />
                )}
                Download
              </span>
              <span className="flex items-center text-xs">
                {request.permissions.can_reshare ? (
                  <FiCheck className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <FiX className="h-3 w-3 text-red-500 mr-1" />
                )}
                Reshare
              </span>
            </div>
          </div>

          {/* Expiration */}
          {request.expires_at && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Expires: {new Date(request.expires_at).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <LoadingSpinner size="sm" color="white" />
            ) : (
              <FiCheck className="mr-1 h-4 w-4" />
            )}
            Accept
          </button>
          <button
            onClick={handleReject}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 flex items-center"
          >
            <FiX className="mr-1 h-4 w-4" />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareRequest;
