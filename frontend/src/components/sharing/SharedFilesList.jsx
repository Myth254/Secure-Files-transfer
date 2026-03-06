import React, { useState, useMemo } from "react";
import { useShare } from "../../hooks/useShare";
import SharedFileCard from "./SharedFileCard";
import { FiShare2, FiSearch } from "react-icons/fi";
import LoadingSpinner from "../common/LoadingSpinner";
import { useDebounce } from "../../hooks/useDebounce";

const SharedFilesList = () => {
  const { sharedFiles, loading } = useShare();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const filteredFiles = useMemo(() => {
    if (!sharedFiles) return [];
    if (!debouncedSearch) return sharedFiles;

    return sharedFiles.filter((file) =>
      file.filename.toLowerCase().includes(debouncedSearch.toLowerCase()),
    );
  }, [sharedFiles, debouncedSearch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!sharedFiles || sharedFiles.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
        <FiShare2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Shared Files
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Files shared with you will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Shared With Me ({filteredFiles.length})
          </h2>

          {/* Search */}
          <div className="relative w-64">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search shared files..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Files grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFiles.map((file) => (
          <SharedFileCard key={file.file_id} file={file} />
        ))}
      </div>
    </div>
  );
};

export default SharedFilesList;
