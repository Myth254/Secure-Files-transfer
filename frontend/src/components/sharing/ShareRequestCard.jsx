import React, { useState } from "react";
import { useShare } from "../../hooks/useShare";
import { useAuth } from "../../hooks/useAuth";
import {
  FiUser,
  FiClock,
  FiCheck,
  FiX,
  FiEye,
  FiDownload,
  FiShare2,
  FiFile,
} from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import LoadingSpinner from "../common/LoadingSpinner";
import ConfirmationModal from "../common/ConfirmationModal";
import toast from "react-hot-toast";

const ShareRequestCard = ({ request }) => {
  const { user } = useAuth();
  const { acceptShare, rejectShare, revokeShare } = useShare();
  const [loading, setLoading] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  const isOwner = user?.id === request.owner_id;
  const isRecipient = user?.id === request.recipient_id;

  const getTimeAgo = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "some time ago";
    }
  };

  const handleAccept = async () => {
    setLoading(true);
    const result = await acceptShare(request.id);
    if (!result.success) {
      toast.error(result.error || "Failed to accept request");
    }
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    const result = await rejectShare(request.id);
    if (!result.success) {
      toast.error(result.error || "Failed to reject request");
    }
    setLoading(false);
  };

  const handleRevoke = async () => {
    setLoading(true);
    const result = await revokeShare(request.id);
    if (result.success) {
      toast.success("Share revoked successfully");
    } else {
      toast.error(result.error || "Failed to revoke share");
    }
    setLoading(false);
    setShowRevokeModal(false);
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
        <div className="flex items-start">
          {/* Icon */}
          <div
            className={`p-3 rounded-lg ${
              request.status === "pending"
                ? "bg-yellow-100 dark:bg-yellow-900/20"
                : request.status === "accepted"
                  ? "bg-green-100 dark:bg-green-900/20"
                  : "bg-gray-100 dark:bg-gray-700/50"
            }`}
          >
            {request.status === "pending" ? (
              <FiClock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            ) : request.status === "accepted" ? (
              <FiCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
            ) : (
              <FiX className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            )}
          </div>

          {/* Content */}
          <div className="ml-4 flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {request.filename}
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  request.status === "pending"
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                    : request.status === "accepted"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                }`}
              >
                {request.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <FiUser className="mr-2 h-4 w-4" />
                <span>
                  {isOwner ? "You" : `User ${request.owner_id}`} →{" "}
                  {isRecipient ? "You" : `User ${request.recipient_id}`}
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <FiClock className="mr-2 h-4 w-4" />
                <span>{getTimeAgo(request.requested_at)}</span>
              </div>
            </div>

            {/* Permissions */}
            <div className="flex space-x-4 mb-3">
              <span className="flex items-center text-xs">
                {request.permissions?.can_view ? (
                  <FiEye className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <FiX className="h-3 w-3 text-red-500 mr-1" />
                )}
                View
              </span>
              <span className="flex items-center text-xs">
                {request.permissions?.can_download ? (
                  <FiDownload className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <FiX className="h-3 w-3 text-red-500 mr-1" />
                )}
                Download
              </span>
              <span className="flex items-center text-xs">
                {request.permissions?.can_reshare ? (
                  <FiShare2 className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <FiX className="h-3 w-3 text-red-500 mr-1" />
                )}
                Reshare
              </span>
            </div>

            {/* Expiration */}
            {request.expires_at && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Expires: {new Date(request.expires_at).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Actions */}
          {request.status === "pending" && (
            <div className="flex space-x-2 ml-4">
              {isRecipient && (
                <>
                  <button
                    onClick={handleAccept}
                    disabled={loading}
                    className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    title="Accept"
                  >
                    {loading ? (
                      <LoadingSpinner size="sm" color="white" />
                    ) : (
                      <FiCheck className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={loading}
                    className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                    title="Reject"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          )}

          {request.status === "accepted" && isOwner && (
            <button
              onClick={() => setShowRevokeModal(true)}
              className="ml-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Revoke
            </button>
          )}
        </div>
      </div>

      {/* Revoke confirmation modal */}
      <ConfirmationModal
        isOpen={showRevokeModal}
        onClose={() => setShowRevokeModal(false)}
        onConfirm={handleRevoke}
        title="Revoke Share"
        message={`Are you sure you want to revoke access to "${request.filename}"?`}
        confirmText="Revoke"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
};

export default ShareRequestCard;
