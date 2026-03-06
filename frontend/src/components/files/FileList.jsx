import React, { useState } from "react";
import { useFiles } from "../../hooks/useFiles";
import FileCard from "./FileCard";
import FileTable from "./FileTable";
import FileSearch from "./FileSearch";
import FileFilters from "./FileFilters";
import Pagination from "../common/Pagination";
import LoadingSpinner from "../common/LoadingSpinner";
import { FiGrid, FiList } from "react-icons/fi";

const FileList = () => {
  const { files, loading, pagination, changePage } = useFiles();
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'table'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <FiGrid className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No files found
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Upload your first file to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <FileSearch />
          </div>
          <div className="flex items-center space-x-4">
            <FileFilters />
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
                title="Grid view"
              >
                <FiGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "table"
                    ? "bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
                title="Table view"
              >
                <FiList className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* File display */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {files.map((file) => (
            <FileCard key={file.id} file={file} />
          ))}
        </div>
      ) : (
        <FileTable files={files} />
      )}

      {/* Pagination */}
      {pagination?.totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={changePage}
          />
        </div>
      )}
    </div>
  );
};

export default FileList;
