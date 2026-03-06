import React from "react";
import { FiSearch, FiFilter } from "react-icons/fi";

const LogFilters = ({ filters, onFilterChange }) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) =>
              onFilterChange({ ...filters, search: e.target.value })
            }
            placeholder="Search endpoints..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Method filter */}
        <div>
          <select
            value={filters.method}
            onChange={(e) =>
              onFilterChange({ ...filters, method: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>
        </div>

        {/* Status filter */}
        <div>
          <select
            value={filters.status}
            onChange={(e) =>
              onFilterChange({ ...filters, status: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="success">Success (2xx)</option>
            <option value="error">Error (4xx/5xx)</option>
          </select>
        </div>

        {/* Filter summary */}
        <div className="flex items-center justify-end text-sm text-gray-600 dark:text-gray-400">
          <FiFilter className="h-4 w-4 mr-1" />
          <span>
            Active filters:{" "}
            {
              Object.values(filters).filter((v) => v !== "all" && v !== "")
                .length
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default LogFilters;
