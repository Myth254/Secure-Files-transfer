import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { FiUser, FiMail, FiCalendar, FiShield, FiEdit2 } from "react-icons/fi";
import { formatDate } from "../../utils/dateHelpers";
import LoadingSpinner from "../common/LoadingSpinner";

const Profile = ({ onEdit }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <FiUser className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          User not found
        </h3>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-8">
          <div className="flex items-center space-x-4">
            <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold text-primary-600">
                {user.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-white">
              <h1 className="text-2xl font-bold">{user.username}</h1>
              <p className="text-primary-100">
                Member since {formatDate(user.created_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex justify-end mb-4">
            <button
              onClick={onEdit}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <FiEdit2 className="h-4 w-4" />
              <span>Edit Profile</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <FiUser className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Username
                </p>
                <p className="text-gray-900 dark:text-white">{user.username}</p>
              </div>
            </div>

            <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <FiMail className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Email
                </p>
                <p className="text-gray-900 dark:text-white">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <FiCalendar className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Member Since
                </p>
                <p className="text-gray-900 dark:text-white">
                  {formatDate(user.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <FiShield className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Account Status
                </p>
                <p className="text-green-600 dark:text-green-400">Active</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
