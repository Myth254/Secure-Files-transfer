import React, { useMemo } from "react";
import {
  FiHardDrive,
  FiFile,
  FiDownload,
  FiUpload,
  FiPieChart,
} from "react-icons/fi";

const FileStats = ({ stats }) => {
  const storagePercentage = useMemo(() => {
    if (!stats?.total_storage_mb || !stats?.storage_limit_mb) return 0;
    return (stats.total_storage_mb / stats.storage_limit_mb) * 100;
  }, [stats]);

  const fileTypeDistribution = useMemo(() => {
    if (!stats?.file_types) return [];
    return Object.entries(stats.file_types)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [stats]);

  if (!stats) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <p className="text-gray-600 dark:text-gray-400 text-center">
          No statistics available
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Storage stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <FiHardDrive className="mr-2 h-5 w-5 text-primary-600 dark:text-primary-400" />
          Storage Usage
        </h2>

        <div className="space-y-4">
          {/* Storage bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">Used</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {stats.total_storage_mb?.toFixed(2) || "0"} MB /{" "}
                {stats.storage_limit_mb || 100} MB
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`rounded-full h-3 transition-all duration-500 ${
                  storagePercentage > 90
                    ? "bg-red-600"
                    : storagePercentage > 70
                      ? "bg-yellow-600"
                      : "bg-green-600"
                }`}
                style={{ width: `${Math.min(storagePercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Total Files
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {stats.total_files || 0}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Storage Used
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {stats.total_storage_mb?.toFixed(2) || "0"} MB
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* File type distribution */}
      {fileTypeDistribution.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <FiPieChart className="mr-2 h-5 w-5 text-primary-600 dark:text-primary-400" />
            File Types
          </h2>

          <div className="space-y-3">
            {fileTypeDistribution.map((item) => (
              <div key={item.type}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">
                    .{item.type}
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {item.count}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-primary-600 rounded-full h-2 transition-all duration-500"
                    style={{
                      width: `${(item.count / stats.total_files) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity stats */}
      {(stats.total_downloads !== undefined ||
        stats.total_uploads !== undefined) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Activity
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {stats.total_uploads !== undefined && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Uploads
                    </p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {stats.total_uploads}
                    </p>
                  </div>
                  <FiUpload className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            )}

            {stats.total_downloads !== undefined && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Downloads
                    </p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {stats.total_downloads}
                    </p>
                  </div>
                  <FiDownload className="h-8 w-8 text-green-500" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileStats;
