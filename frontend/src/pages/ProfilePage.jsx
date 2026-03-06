import React, { useState } from "react";
import { Profile, ProfileEdit } from "../components/user";
import { FiEdit2, FiX } from "react-icons/fi";

const ProfilePage = () => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Profile
        </h1>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          {isEditing ? (
            <>
              <FiX className="h-5 w-5" />
              <span>Cancel</span>
            </>
          ) : (
            <>
              <FiEdit2 className="h-5 w-5" />
              <span>Edit Profile</span>
            </>
          )}
        </button>
      </div>

      {isEditing ? (
        <ProfileEdit
          onCancel={() => setIsEditing(false)}
          onSave={() => setIsEditing(false)}
        />
      ) : (
        <Profile onEdit={() => setIsEditing(true)} />
      )}
    </div>
  );
};

export default ProfilePage;
