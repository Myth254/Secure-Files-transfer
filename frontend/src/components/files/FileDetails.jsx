import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFiles } from "../../hooks/useFiles";
import {
  FiFile,
  FiDownload,
  FiTrash2,
  FiShare2,
  FiArrowLeft,
  FiClock,
  FiHardDrive,
  FiLock,
  FiEye,
} from "react-icons/fi";
import {
  formatFileSize,
  getFileIcon,
  getFileColor,
} from "../../utils/fileHelpers";
import { formatDate } from "../../utils/dateHelpers";
import LoadingSpinner from "../common/LoadingSpinner";
import ConfirmationModal from "../common/ConfirmationModal";
import FileShare from "./FileShare";
import FilePreview from "./FilePreview";
import toast from "react-hot-toast";

const FileDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { files, downloadFile, deleteFile } = useFiles();
  const [downloading, setDownloading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Find the file using useMemo instead of useState + useEffect
  const file = useMemo(() => {
    return files?.find((f) => f.id === parseInt(id));
  }, [files, id]);

  const handleDownload = async () => {
    if (!file) return;
    setDownloading(true);
    const result = await downloadFile(file.id, file.filename);
    if (!result.success) {
      toast.error(result.error);
    }
    setDownloading(false);
  };

  const handleDelete = async () => {
    if (!file) return;
    const result = await deleteFile(file.id);
    if (result.success) {
      toast.success("File deleted successfully");
      navigate("/files");
    } else {
      toast.error(result.error);
    }
    setShowDeleteModal(false);
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  if (!files) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!file) {
    return (
      <div className="text-center py-12">
        <FiFile className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          File not found
        </h3>
        <button
          onClick={() => navigate("/files")}
          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
        >
          Back to Files
        </button>
      </div>
    );
  }

  const fileIcon = getFileIcon(file.filename);
  const fileColor = getFileColor(file.filename);

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/files")}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <FiArrowLeft className="mr-2 h-5 w-5" />
            Back to Files
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreview}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
            >
              <FiEye className="mr-2" />
              Preview
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FiShare2 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FiTrash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* File info card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="flex items-center space-x-6">
              <div className={`p-6 rounded-2xl ${fileColor} bg-opacity-10`}>
                <span className="text-5xl">{fileIcon}</span>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {file.filename}
                </h1>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <FiHardDrive className="mr-2 h-5 w-5" />
                    <span>
                      {formatFileSize(file.original_size)} (Encrypted:{" "}
                      {formatFileSize(file.encrypted_size)})
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <FiClock className="mr-2 h-5 w-5" />
                    <span>Uploaded {formatDate(file.upload_date)}</span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <FiLock className="mr-2 h-5 w-5 text-green-500" />
                    <span>End-to-end encrypted</span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <FiFile className="mr-2 h-5 w-5" />
                    <span>File ID: {file.id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 px-8 py-4 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Share this file:
                </span>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center"
                >
                  <FiShare2 className="mr-1 h-4 w-4" />
                  Share
                </button>
              </div>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center"
              >
                <FiDownload className="mr-2 h-5 w-5" />
                {downloading ? "Downloading..." : "Download File"}
              </button>
            </div>
          </div>
        </div>

        {/* File preview */}
        {showPreview && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              File Preview
            </h2>
            <FilePreview file={file} onClose={() => setShowPreview(false)} />
          </div>
        )}
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete File"
        message={`Are you sure you want to delete "${file.filename}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <FileShare
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        file={file}
      />
    </>
  );
};

export default FileDetails;
