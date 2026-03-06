import React, { useState } from "react";
import { FiCopy, FiLink, FiCheck, FiX } from "react-icons/fi";
import toast from "react-hot-toast";

const ShareLink = ({ isOpen, onClose, file }) => {
  const [copied, setCopied] = useState(false);

  const shareLink = `${window.location.origin}/shared/${file?.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
          onClick={onClose}
        />

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Share Link
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="px-6 py-4 space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Anyone with this link can access the file based on your sharing
                settings.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Share Link
              </label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <FiLink className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  onClick={handleCopy}
                  className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  title="Copy link"
                >
                  {copied ? (
                    <FiCheck className="h-5 w-5" />
                  ) : (
                    <FiCopy className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                Link Settings
              </h4>
              <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                <li>• Link expires in 7 days</li>
                <li>• Anyone with link can view</li>
                <li>• Download permission required</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareLink;
