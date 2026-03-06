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
} from "react-icons/fi";
import { formatFileSize, getFileIcon } from "../../utils/fileHelpers";
import { formatDate } from "../../utils/dateHelpers";
import ConfirmationModal from "../common/ConfirmationModal";
import FileShare from "./FileShare";
import toast from "react-hot-toast";

const FileTable = ({ files }) => {
  const { downloadFile, deleteFile } = useFiles();
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const handleDownload = async (file) => {
    setDownloading(file.id);
    const result = await downloadFile(file.id, file.filename);
    if (!result.success) {
      toast.error(result.error);
    }
    setDownloading(null);
  };

  const handleDelete = async () => {
    if (!selectedFile) return;
    const result = await deleteFile(selectedFile.id);
    if (result.success) {
      toast.success("File deleted successfully");
    } else {
      toast.error(result.error);
    }
    setShowDeleteModal(false);
    setSelectedFile(null);
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                File Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Upload Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {files.map((file) => {
              const fileIcon = getFileIcon(file.filename);
              return (
                <tr
                  key={file.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 text-2xl mr-3">
                        {fileIcon}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {file.filename}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {file.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {formatFileSize(file.original_size)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Encrypted: {formatFileSize(file.encrypted_size)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {formatDate(file.upload_date)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(file.upload_date).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleDownload(file)}
                        disabled={downloading === file.id}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 disabled:opacity-50 p-1 rounded"
                        title="Download"
                      >
                        <FiDownload className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedFile(file);
                          setShowShareModal(true);
                        }}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1 rounded"
                        title="Share"
                      >
                        <FiShare2 className="h-5 w-5" />
                      </button>
                      <Link
                        to={`/files/${file.id}`}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1 rounded"
                        title="Details"
                      >
                        <FiEye className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => {
                          setSelectedFile(file);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded"
                        title="Delete"
                      >
                        <FiTrash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedFile(null);
        }}
        onConfirm={handleDelete}
        title="Delete File"
        message={`Are you sure you want to delete "${selectedFile?.filename}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <FileShare
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setSelectedFile(null);
        }}
        file={selectedFile}
      />
    </>
  );
};

export default FileTable;
