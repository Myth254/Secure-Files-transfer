import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useFiles } from "../../hooks/useFiles";
import {
  FiFile,
  FiDownload,
  FiTrash2,
  FiShare2,
  FiMoreVertical,
  FiEye,
  FiCopy,
} from "react-icons/fi";
import {
  formatFileSize,
  getFileIcon,
  getFileColor,
} from "../../utils/fileHelpers";
import { formatDate } from "../../utils/dateHelpers";
import ConfirmationModal from "../common/ConfirmationModal";
import FileShare from "./FileShare";
import toast from "react-hot-toast";

const FileCard = ({ file }) => {
  const { downloadFile, deleteFile } = useFiles();
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    const result = await downloadFile(file.id, file.filename);
    if (!result.success) {
      toast.error(result.error);
    }
    setDownloading(false);
  };

  const handleDelete = async () => {
    const result = await deleteFile(file.id);
    if (result.success) {
      toast.success("File deleted successfully");
    } else {
      toast.error(result.error);
    }
    setShowDeleteModal(false);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/files/${file.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
    setShowMenu(false);
  };

  const fileIcon = getFileIcon(file.filename);
  const fileColor = getFileColor(file.filename);

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 group">
        {/* Card header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg ${fileColor} bg-opacity-10`}>
                <span className="text-2xl">{fileIcon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {file.filename}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatFileSize(file.original_size)}
                </p>
              </div>
            </div>

            {/* Menu button */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FiMoreVertical className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>

              {/* Dropdown menu */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  <button
                    onClick={() => {
                      setShowShareModal(true);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <FiShare2 className="mr-2 h-4 w-4" />
                    Share
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <FiCopy className="mr-2 h-4 w-4" />
                    Copy Link
                  </button>
                  <Link
                    to={`/files/${file.id}`}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    onClick={() => setShowMenu(false)}
                  >
                    <FiEye className="mr-2 h-4 w-4" />
                    Details
                  </Link>
                  <button
                    onClick={() => {
                      setShowDeleteModal(true);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <FiTrash2 className="mr-2 h-4 w-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card body */}
        <div className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Uploaded</span>
              <span className="text-gray-900 dark:text-white">
                {formatDate(file.upload_date)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Size</span>
              <span className="text-gray-900 dark:text-white">
                {formatFileSize(file.original_size)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                Encrypted
              </span>
              <span className="text-green-600 dark:text-green-400">Yes</span>
            </div>
          </div>
        </div>

        {/* Card footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg flex items-center justify-between">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center space-x-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 disabled:opacity-50"
          >
            <FiDownload className="h-4 w-4" />
            <span>{downloading ? "Downloading..." : "Download"}</span>
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <FiShare2 className="h-4 w-4" />
            <span>Share</span>
          </button>
        </div>
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

export default FileCard;
