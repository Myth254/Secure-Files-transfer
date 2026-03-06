import React, { useState } from "react";
import { useMonitoring } from "../../../hooks/useMonitoring";
import { FiEdit2, FiTrash2, FiPlus } from "react-icons/fi";
import LoadingSpinner from "../../common/LoadingSpinner";
import AlertForm from "./AlertForm";
import ConfirmationModal from "../../common/ConfirmationModal";
import toast from "react-hot-toast";

const AlertRules = () => {
  const { alertRules, loading, deleteAlertRule } = useMonitoring();
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState(null);

  const handleDelete = async () => {
    if (!ruleToDelete) return;

    const result = await deleteAlertRule(ruleToDelete.id);
    if (result.success) {
      toast.success("Alert rule deleted successfully");
    } else {
      toast.error(result.error);
    }

    setShowDeleteModal(false);
    setRuleToDelete(null);
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      warning:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[severity] || colors.info;
  };

  if (loading.alerts) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Alert Rules
        </h3>
        <button
          onClick={() => {
            setEditingRule(null);
            setShowForm(true);
          }}
          className="flex items-center space-x-1 px-3 py-1 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
        >
          <FiPlus className="h-4 w-4" />
          <span>New Rule</span>
        </button>
      </div>

      {/* Rules list */}
      {!alertRules || alertRules.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">
            No alert rules configured
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertRules.map((rule) => (
            <div
              key={rule.id}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {rule.name}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${getSeverityBadge(rule.severity)}`}
                    >
                      {rule.severity}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        rule.enabled
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {rule.description}
                  </p>

                  <div className="flex items-center space-x-4 text-xs">
                    <span className="text-gray-500 dark:text-gray-500">
                      {rule.metric_type}.{rule.metric_name} {rule.condition}{" "}
                      {rule.threshold}
                    </span>
                    <span className="text-gray-500 dark:text-gray-500">
                      Duration: {rule.duration}s
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => {
                      setEditingRule(rule);
                      setShowForm(true);
                    }}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <FiEdit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setRuleToDelete(rule);
                      setShowDeleteModal(true);
                    }}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Forms and Modals */}
      <AlertForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingRule(null);
        }}
        rule={editingRule}
      />

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setRuleToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Alert Rule"
        message={`Are you sure you want to delete "${ruleToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default AlertRules;
