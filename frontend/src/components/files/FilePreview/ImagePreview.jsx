import React, { useState } from "react";
import { FiDownload, FiZoomIn, FiZoomOut, FiRotateCw } from "react-icons/fi";

const ImagePreview = ({ file }) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  // This would need a proper image URL from your backend
  const imageUrl = `/api/files/${file.id}/preview`; // You'd need to implement this endpoint

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 25));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div className="space-y-4">
      {/* Image controls */}
      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 25}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
            title="Zoom Out"
          >
            <FiZoomOut className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[60px] text-center">
            {zoom}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 200}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
            title="Zoom In"
          >
            <FiZoomIn className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={handleRotate}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 ml-2"
            title="Rotate"
          >
            <FiRotateCw className="h-5 w-5 text-gray-600 dark:text-gray-400" />
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

      {/* Image display */}
      <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-8 flex items-center justify-center min-h-[500px]">
        <div
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transition: "transform 0.3s ease",
          }}
        >
          <img
            src={imageUrl}
            alt={file.filename}
            className="max-w-full max-h-[500px] object-contain rounded-lg shadow-lg"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src =
                "https://via.placeholder.com/400x300?text=Image+Not+Available";
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ImagePreview;
