import React, { useState } from "react";
import { FiTrash2, FiAlertTriangle } from "react-icons/fi";
import { useFiles } from "../../hooks/useFiles";
import LoadingSpinner from "../common/LoadingSpinner";
import ConfirmationModal from "../common/ConfirmationModal";
import toast from "react-hot-toast";

const FileDelete = ({ file, onComplete }) => {
  const { deleteFile } = useFiles();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteFile(file.id);

    if (result.success) {
      toast.success("File deleted successfully");
      if (onComplete) onComplete(true);
    } else {
      toast.error(result.error || "Failed to delete file");
      if (onComplete) onComplete(false);
    }

    setDeleting(false);
    setShowConfirm(false);
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={deleting}
        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {deleting ? (
          <>
            <LoadingSpinner size="sm" color="white" />
            <span>Deleting...</span>
          </>
        ) : (
          <>
            <FiTrash2 className="h-5 w-5" />
            <span>Delete File</span>
          </>
        )}
      </button>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete File"
        message={
          <div className="space-y-4">
            <div className="flex items-center justify-center text-yellow-600 dark:text-yellow-400">
              <FiAlertTriangle className="h-12 w-12" />
            </div>
            <p className="text-center">
              Are you sure you want to delete <strong>"{file.filename}"</strong>
              ?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              This action cannot be undone. The file will be permanently
              removed.
            </p>
          </div>
        }
        confirmText="Delete Permanently"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
};

export default FileDelete;
