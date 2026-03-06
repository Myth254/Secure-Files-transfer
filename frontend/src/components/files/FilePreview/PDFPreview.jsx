import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FiChevronLeft, FiChevronRight, FiDownload } from "react-icons/fi";
import LoadingSpinner from "../../common/LoadingSpinner";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PDFPreview = ({ file }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // This would need a proper PDF URL from your backend
  const pdfUrl = `/api/files/${file.id}/preview`; // You'd need to implement this endpoint

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (error) => {
    setError("Failed to load PDF");
    setLoading(false);
    console.error("PDF load error:", error);
  };

  return (
    <div className="space-y-4">
      {/* PDF viewer */}
      <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 min-h-[500px] flex items-center justify-center">
        {loading && <LoadingSpinner size="lg" />}

        {error && (
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<LoadingSpinner size="lg" />}
          >
            <Page pageNumber={pageNumber} />
          </Document>
        )}
      </div>

      {/* PDF controls */}
      {numPages && numPages > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
              disabled={pageNumber <= 1}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {pageNumber} of {numPages}
            </span>
            <button
              onClick={() =>
                setPageNumber((prev) => Math.min(numPages, prev + 1))
              }
              disabled={pageNumber >= numPages}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiChevronRight className="h-5 w-5" />
            </button>
          </div>

          <a
            href={`/api/files/${file.id}/download`}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <FiDownload className="h-4 w-4" />
            <span>Download PDF</span>
          </a>
        </div>
      )}
    </div>
  );
};

export default PDFPreview;
