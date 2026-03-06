import React, { useState } from "react";
import { FiDownload, FiCheck, FiAlertCircle } from "react-icons/fi";
import { useFiles } from "../../hooks/useFiles";
import LoadingSpinner from "../common/LoadingSpinner";
import { formatFileSize } from "../../utils/fileHelpers";
import toast from "react-hot-toast";

const FileDownload = ({ file, onComplete }) => {
  const { downloadFile } = useFiles();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("idle"); // idle, downloading, success, error

  const handleDownload = async () => {
    setDownloading(true);
    setStatus("downloading");
    setProgress(0);

    // Simulate progress (since actual progress may not be available)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    try {
      const result = await downloadFile(file.id, file.filename);
      clearInterval(interval);

      if (result.success) {
        setProgress(100);
        setStatus("success");
        toast.success("File downloaded successfully");
        if (onComplete) onComplete(true);
      } else {
        setStatus("error");
        toast.error(result.error || "Download failed");
        if (onComplete) onComplete(false);
      }
    } catch {
      clearInterval(interval);
      setStatus("error");
      toast.error("Download failed");
      if (onComplete) onComplete(false);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* File info */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {file.filename}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Size: {formatFileSize(file.original_size)}
            </p>
          </div>

          {/* Status indicator */}
          {status === "success" && (
            <div className="flex items-center text-green-600 dark:text-green-400">
              <FiCheck className="h-5 w-5 mr-1" />
              <span className="text-sm">Downloaded</span>
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center text-red-600 dark:text-red-400">
              <FiAlertCircle className="h-5 w-5 mr-1" />
              <span className="text-sm">Failed</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {status === "downloading" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Downloading...
            </span>
            <span className="text-gray-900 dark:text-white">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary-600 rounded-full h-2 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Download button */}
      {status !== "success" && (
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {downloading ? (
            <>
              <LoadingSpinner size="sm" color="white" />
              <span className="ml-2">Downloading...</span>
            </>
          ) : (
            <>
              <FiDownload className="mr-2 h-5 w-5" />
              Download File
            </>
          )}
        </button>
      )}

      {/* Success message */}
      {status === "success" && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          File downloaded successfully. Check your downloads folder.
        </div>
      )}

      {/* Error message */}
      {status === "error" && (
        <div className="text-center">
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">
            Download failed. Please try again.
          </p>
          <button
            onClick={handleDownload}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm"
          >
            Retry Download
          </button>
        </div>
      )}
    </div>
  );
};

export default FileDownload;
