import React from "react";
import PDFPreview from "./PDFPreview";
import ImagePreview from "./ImagePreview";
import TextPreview from "./TextPreview";
import { FiFile, FiX } from "react-icons/fi";

const FilePreview = ({ file, onClose }) => {
  const getFileExtension = (filename) => {
    return filename.split(".").pop()?.toLowerCase() || "";
  };

  const getPreviewComponent = () => {
    const ext = getFileExtension(file.filename);

    // Images
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
      return <ImagePreview file={file} />;
    }

    // PDF
    if (ext === "pdf") {
      return <PDFPreview file={file} />;
    }

    // Text files
    if (
      [
        "txt",
        "md",
        "csv",
        "json",
        "xml",
        "html",
        "css",
        "js",
        "jsx",
        "ts",
        "tsx",
      ].includes(ext)
    ) {
      return <TextPreview file={file} />;
    }

    // Unsupported
    return (
      <div className="text-center py-12">
        <FiFile className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Preview Not Available
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          This file type cannot be previewed.
        </p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
          onClick={onClose}
        />

        {/* Preview panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Preview: {file.filename}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Preview content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {getPreviewComponent()}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilePreview;
