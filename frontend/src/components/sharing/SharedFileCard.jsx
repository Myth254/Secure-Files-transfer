import React, { useState } from "react";
import { useShare } from "../../hooks/useShare";
import {
  FiFile,
  FiDownload,
  FiUser,
  FiClock,
  FiEye,
  FiLock,
  FiUnlock,
} from "react-icons/fi";
import {
  formatFileSize,
  getFileIcon,
  getFileColor,
} from "../../utils/fileHelpers";
import { formatDate } from "../../utils/dateHelpers";
import LoadingSpinner from "../common/LoadingSpinner";
import toast from "react-hot-toast";

const SharedFileCard = ({ file }) => {
  const { downloadSharedFile } = useShare();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    const result = await downloadSharedFile(file.file_id, file.filename);
    if (!result.success) {
      toast.error(result.error);
    }
    setDownloading(false);
  };

  const fileIcon = getFileIcon(file.filename);
  const fileColor = getFileColor(file.filename);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="p-6">
        <div className="flex items-start space-x-4">
          <div className={`p-4 rounded-xl ${fileColor} bg-opacity-10`}>
            <span className="text-3xl">{fileIcon}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate mb-2">
              {file.filename}
            </h3>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <FiUser className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">Owner: {file.owner_username}</span>
              </div>

              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <FiClock className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>Shared {formatDate(file.access_granted)}</span>
              </div>

              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <FiFile className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>{formatFileSize(file.original_size)}</span>
              </div>
            </div>

            {/* Permissions */}
            <div className="mt-4 flex items-center space-x-2">
              {file.permissions.can_view && (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs flex items-center">
                  <FiEye className="mr-1 h-3 w-3" />
                  View
                </span>
              )}
              {file.permissions.can_download && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs flex items-center">
                  <FiDownload className="mr-1 h-3 w-3" />
                  Download
                </span>
              )}
              {file.permissions.can_reshare ? (
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs flex items-center">
                  <FiUnlock className="mr-1 h-3 w-3" />
                  Can Reshare
                </span>
              ) : (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs flex items-center">
                  <FiLock className="mr-1 h-3 w-3" />
                  No Reshare
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Download button */}
        {file.permissions.can_download && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <FiDownload className="h-5 w-5" />
                  <span>Download</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedFileCard;
