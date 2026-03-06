import React, { useState } from "react";
import {
  FiKey,
  FiCopy,
  FiTrash2,
  FiPlus,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import LoadingSpinner from "../common/LoadingSpinner";
import ConfirmationModal from "../common/ConfirmationModal";
import toast from "react-hot-toast";

// Mock API keys data
const MOCK_API_KEYS = [
  {
    id: 1,
    name: "Development Key",
    key: "sk_live_1234567890abcdef",
    created: "2024-01-15",
    lastUsed: "2024-02-20",
    permissions: ["read", "write"],
  },
  {
    id: 2,
    name: "Production Key",
    key: "sk_live_abcdef1234567890",
    created: "2024-02-01",
    lastUsed: "2024-02-21",
    permissions: ["read"],
  },
];

const ApiKeys = () => {
  const [loading] = useState(false);
  const [apiKeys, setApiKeys] = useState(MOCK_API_KEYS);
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [visibleKeys, setVisibleKeys] = useState({});

  const [newKey, setNewKey] = useState({
    name: "",
    permissions: {
      read: true,
      write: false,
      delete: false,
    },
  });

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  };

  const handleToggleVisibility = (keyId) => {
    setVisibleKeys((prev) => ({
      ...prev,
      [keyId]: !prev[keyId],
    }));
  };

  const handleDeleteClick = (key) => {
    setSelectedKey(key);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    setApiKeys((prev) => prev.filter((k) => k.id !== selectedKey.id));
    setShowDeleteModal(false);
    setSelectedKey(null);
    toast.success("API key deleted");
  };

  const handleCreateKey = () => {
    const permissions = Object.entries(newKey.permissions)
      .filter(([, value]) => value)
      .map(([key]) => key);

    const newApiKey = {
      id: apiKeys.length + 1,
      name: newKey.name,
      key: `sk_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`,
      created: new Date().toISOString().split("T")[0],
      lastUsed: "Never",
      permissions,
    };

    setApiKeys((prev) => [...prev, newApiKey]);
    setShowNewKeyForm(false);
    setNewKey({
      name: "",
      permissions: { read: true, write: false, delete: false },
    });
    toast.success("API key created successfully");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          API Keys
        </h3>
        <button
          onClick={() => setShowNewKeyForm(!showNewKeyForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <FiPlus className="h-4 w-4" />
          <span>New API Key</span>
        </button>
      </div>

      {/* Create new key form */}
      {showNewKeyForm && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-white">
            Create New API Key
          </h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Key Name
            </label>
            <input
              type="text"
              value={newKey.name}
              onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Development Key"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Permissions
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newKey.permissions.read}
                  onChange={(e) =>
                    setNewKey({
                      ...newKey,
                      permissions: {
                        ...newKey.permissions,
                        read: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Read
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newKey.permissions.write}
                  onChange={(e) =>
                    setNewKey({
                      ...newKey,
                      permissions: {
                        ...newKey.permissions,
                        write: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Write
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newKey.permissions.delete}
                  onChange={(e) =>
                    setNewKey({
                      ...newKey,
                      permissions: {
                        ...newKey.permissions,
                        delete: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Delete
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowNewKeyForm(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateKey}
              disabled={!newKey.name}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Key
            </button>
          </div>
        </div>
      )}

      {/* API Keys list */}
      {apiKeys.length === 0 ? (
        <div className="text-center py-12">
          <FiKey className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No API keys created yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <div
              key={apiKey.id}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {apiKey.name}
                  </h4>

                  <div className="flex items-center space-x-2 mb-3">
                    <code className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded text-sm font-mono">
                      {visibleKeys[apiKey.id] ? apiKey.key : "••••••••••••••••"}
                    </code>
                    <button
                      onClick={() => handleToggleVisibility(apiKey.id)}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      title={visibleKeys[apiKey.id] ? "Hide" : "Show"}
                    >
                      {visibleKeys[apiKey.id] ? (
                        <FiEyeOff className="h-4 w-4" />
                      ) : (
                        <FiEye className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleCopyKey(apiKey.key)}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      title="Copy"
                    >
                      <FiCopy className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Created: {apiKey.created}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      Last used: {apiKey.lastUsed}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center space-x-2">
                    {apiKey.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-xs"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteClick(apiKey)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Delete"
                >
                  <FiTrash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete API Key"
        message={`Are you sure you want to delete "${selectedKey?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default ApiKeys;
