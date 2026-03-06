import React from "react";
import { Link } from "react-router-dom";
import { FiAlertCircle, FiHome } from "react-icons/fi";

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center px-4">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-primary-100 dark:bg-primary-900/20 rounded-full mb-6">
          <FiAlertCircle className="h-12 w-12 text-primary-600 dark:text-primary-400" />
        </div>

        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
          404
        </h1>

        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Page Not Found
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <Link
          to="/"
          className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <FiHome className="h-5 w-5" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
