import React, { useState } from "react";
import { FileList, FileUpload } from "../components/files";
import { FiUpload, FiX } from "react-icons/fi";

const FilesPage = () => {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          My Files
        </h1>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          {showUpload ? (
            <>
              <FiX className="h-5 w-5" />
              <span>Close</span>
            </>
          ) : (
            <>
              <FiUpload className="h-5 w-5" />
              <span>Upload Files</span>
            </>
          )}
        </button>
      </div>

      {/* Upload section */}
      {showUpload && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <FileUpload onUploadComplete={() => setShowUpload(false)} />
        </div>
      )}

      {/* Files list */}
      <FileList />
    </div>
  );
};

export default FilesPage;
