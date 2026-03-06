import React, { useState } from "react";
import { useShare } from "../../hooks/useShare";
import {
  FiShare2,
  FiUser,
  FiClock,
  FiCheck,
  FiX,
  FiCopy,
} from "react-icons/fi";
import LoadingSpinner from "../common/LoadingSpinner";
import toast from "react-hot-toast";

const FileShare = ({ isOpen, onClose, file }) => {
  const { shareFile } = useShare();
  const [step, setStep] = useState("form"); // form, success, error
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    recipientUsername: "",
    canView: true,
    canDownload: true,
    canReshare: false,
    expiresDays: 7,
  });
  const [shareResult, setShareResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await shareFile(file.id, formData.recipientUsername, {
      canView: formData.canView,
      canDownload: formData.canDownload,
      canReshare: formData.canReshare,
      expiresDays: formData.expiresDays,
    });

    if (result.success) {
      setShareResult(result.shareRequest);
      setStep("success");
      toast.success("File shared successfully");
    } else {
      setStep("error");
      toast.error(result.error || "Failed to share file");
    }

    setLoading(false);
  };

  const handleCopyLink = () => {
    // This would generate a share link
    const link = `${window.location.origin}/shared/${file?.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Share link copied to clipboard");
  };

  const resetForm = () => {
    setFormData({
      recipientUsername: "",
      canView: true,
      canDownload: true,
      canReshare: false,
      expiresDays: 7,
    });
    setStep("form");
    setShareResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Share File
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            {/* File info */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Sharing:{" "}
                <span className="font-medium text-gray-900 dark:text-white">
                  {file.filename}
                </span>
              </p>
            </div>

            {step === "form" && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Recipient */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Recipient Username
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      value={formData.recipientUsername}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          recipientUsername: e.target.value,
                        })
                      }
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter username"
                      required
                    />
                  </div>
                </div>

                {/* Permissions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Permissions
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.canView}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            canView: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Can view
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.canDownload}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            canDownload: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Can download
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.canReshare}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            canReshare: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Can reshare
                      </span>
                    </label>
                  </div>
                </div>

                {/* Expiration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Expires After
                  </label>
                  <div className="relative">
                    <FiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <select
                      value={formData.expiresDays}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          expiresDays: parseInt(e.target.value),
                        })
                      }
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value={1}>1 day</option>
                      <option value={7}>7 days</option>
                      <option value={30}>30 days</option>
                      <option value={90}>90 days</option>
                      <option value={365}>1 year</option>
                    </select>
                  </div>
                </div>
              </form>
            )}

            {step === "success" && shareResult && (
              <div className="text-center py-6">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                  <FiCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Share Request Sent!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Your share request has been sent to{" "}
                  {formData.recipientUsername}.
                </p>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-left">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Share ID: {shareResult.id}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Status: Pending acceptance
                  </p>
                </div>
              </div>
            )}

            {step === "error" && (
              <div className="text-center py-6">
                <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                  <FiX className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Share Failed
                </h3>
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                  Failed to share file. Please try again.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex items-center justify-between">
            {step === "form" && (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <div className="space-x-2">
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 flex items-center"
                  >
                    <FiCopy className="mr-2 h-4 w-4" />
                    Copy Link
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !formData.recipientUsername}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <LoadingSpinner size="sm" color="white" />
                    ) : (
                      "Send Request"
                    )}
                  </button>
                </div>
              </>
            )}

            {(step === "success" || step === "error") && (
              <button
                onClick={handleClose}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileShare;
