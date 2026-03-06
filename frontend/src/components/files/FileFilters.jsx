import React, { useState, useRef, useEffect } from "react";
import { FiFilter, FiChevronDown, FiX } from "react-icons/fi";
import { useFiles } from "../../hooks/useFiles";

const FileFilters = () => {
  const { filters, updateFilters } = useFiles();
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState({
    type: filters.type || "all",
    sortBy: filters.sortBy || "upload_date",
    sortOrder: filters.sortOrder || "desc",
  });
  const dropdownRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleApply = () => {
    updateFilters(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetFilters = {
      type: "all",
      sortBy: "upload_date",
      sortOrder: "desc",
    };
    setLocalFilters(resetFilters);
    updateFilters(resetFilters);
    setIsOpen(false);
  };

  const handleChange = (key, value) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.type !== "all") count++;
    return count;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <FiFilter className="h-4 w-4" />
        <span>Filters</span>
        {getActiveFilterCount() > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full">
            {getActiveFilterCount()}
          </span>
        )}
        <FiChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              Filter Files
            </h3>

            {/* File type filter */}
            <div className="mb-4">
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">
                File Type
              </label>
              <select
                value={localFilters.type}
                onChange={(e) => handleChange("type", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Files</option>
                <option value="document">Documents</option>
                <option value="image">Images</option>
                <option value="spreadsheet">Spreadsheets</option>
                <option value="presentation">Presentations</option>
                <option value="archive">Archives</option>
              </select>
            </div>

            {/* Sort by */}
            <div className="mb-4">
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">
                Sort By
              </label>
              <select
                value={localFilters.sortBy}
                onChange={(e) => handleChange("sortBy", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="upload_date">Upload Date</option>
                <option value="filename">File Name</option>
                <option value="size">File Size</option>
              </select>
            </div>

            {/* Sort order */}
            <div className="mb-4">
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">
                Order
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={localFilters.sortOrder === "asc"}
                    onChange={() => handleChange("sortOrder", "asc")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Ascending
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={localFilters.sortOrder === "desc"}
                    onChange={() => handleChange("sortOrder", "desc")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Descending
                  </span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleReset}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Reset
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileFilters;
