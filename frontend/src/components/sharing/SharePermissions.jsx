import React, { useState } from "react";
import { FiEye, FiDownload, FiShare2, FiClock } from "react-icons/fi";

const SharePermissions = ({ permissions, onChange }) => {
  const [localPermissions, setLocalPermissions] = useState({
    canView: permissions?.canView ?? true,
    canDownload: permissions?.canDownload ?? false,
    canReshare: permissions?.canReshare ?? false,
    expiresDays: permissions?.expiresDays ?? 7,
  });

  const handleChange = (key, value) => {
    const updated = { ...localPermissions, [key]: value };
    setLocalPermissions(updated);
    if (onChange) onChange(updated);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
        Share Permissions
      </h3>

      {/* View permission */}
      <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <div className="flex items-center space-x-3">
          <FiEye className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Can View
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Allow recipient to view the file
            </p>
          </div>
        </div>
        <input
          type="checkbox"
          checked={localPermissions.canView}
          onChange={(e) => handleChange("canView", e.target.checked)}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
      </label>

      {/* Download permission */}
      <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <div className="flex items-center space-x-3">
          <FiDownload className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Can Download
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Allow recipient to download the file
            </p>
          </div>
        </div>
        <input
          type="checkbox"
          checked={localPermissions.canDownload}
          onChange={(e) => handleChange("canDownload", e.target.checked)}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
      </label>

      {/* Reshare permission */}
      <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <div className="flex items-center space-x-3">
          <FiShare2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Can Reshare
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Allow recipient to share with others
            </p>
          </div>
        </div>
        <input
          type="checkbox"
          checked={localPermissions.canReshare}
          onChange={(e) => handleChange("canReshare", e.target.checked)}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
      </label>

      {/* Expiration */}
      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="flex items-center space-x-3 mb-2">
          <FiClock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Expires After
          </span>
        </div>
        <select
          value={localPermissions.expiresDays}
          onChange={(e) =>
            handleChange("expiresDays", parseInt(e.target.value))
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value={1}>1 day</option>
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
          <option value={365}>1 year</option>
          <option value={0}>Never</option>
        </select>
      </div>
    </div>
  );
};

export default SharePermissions;
