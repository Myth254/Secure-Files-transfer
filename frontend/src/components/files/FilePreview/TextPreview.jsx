import React, { useState, useEffect } from "react";
import { FiDownload, FiCopy, FiCheck } from "react-icons/fi";
import LoadingSpinner from "../../common/LoadingSpinner";
import toast from "react-hot-toast";

const TextPreview = ({ file }) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // This would fetch the text content from your backend
    const fetchContent = async () => {
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Mock content - in reality, you'd fetch from `/api/files/${file.id}/content`
        setContent(
          `This is a preview of the text file: ${file.filename}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`,
        );
      } catch {
        setError("Failed to load file content");
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [file]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
          >
            {copied ? (
              <>
                <FiCheck className="h-4 w-4 text-green-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <FiCopy className="h-4 w-4" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <a
          href={`/api/files/${file.id}/download`}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <FiDownload className="h-4 w-4" />
          <span>Download</span>
        </a>
      </div>

      {/* Text content */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono overflow-auto max-h-[500px]">
          {content}
        </pre>
      </div>

      {/* File info */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        <p>File: {file.filename}</p>
        <p>Size: {file.original_size} bytes</p>
        <p>Encoding: UTF-8</p>
      </div>
    </div>
  );
};

export default TextPreview;
