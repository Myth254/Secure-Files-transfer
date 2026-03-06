import React from "react";
import { FiAlertCircle, FiX } from "react-icons/fi";

const ErrorAlert = ({ message, details, onClose }) => {
  if (!message) return null;

  return (
    <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 mb-4 relative">
      <div className="flex">
        <div className="flex-shrink-0">
          <FiAlertCircle className="h-5 w-5 text-red-400 dark:text-red-500" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
            {message}
          </h3>
          {details && (
            <div className="mt-2 text-sm text-red-700 dark:text-red-400">
              <p>{details}</p>
            </div>
          )}
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              onClick={onClose}
              className="inline-flex rounded-md bg-red-50 dark:bg-red-900/20 p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
            >
              <span className="sr-only">Dismiss</span>
              <FiX className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorAlert;
