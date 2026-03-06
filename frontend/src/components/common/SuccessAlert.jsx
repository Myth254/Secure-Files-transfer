import React from "react";
import { FiCheckCircle, FiX } from "react-icons/fi";

const SuccessAlert = ({ message, details, onClose }) => {
  if (!message) return null;

  return (
    <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 mb-4 relative">
      <div className="flex">
        <div className="flex-shrink-0">
          <FiCheckCircle className="h-5 w-5 text-green-400 dark:text-green-500" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
            {message}
          </h3>
          {details && (
            <div className="mt-2 text-sm text-green-700 dark:text-green-400">
              <p>{details}</p>
            </div>
          )}
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              onClick={onClose}
              className="inline-flex rounded-md bg-green-50 dark:bg-green-900/20 p-1.5 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/40 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-green-50"
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

export default SuccessAlert;
