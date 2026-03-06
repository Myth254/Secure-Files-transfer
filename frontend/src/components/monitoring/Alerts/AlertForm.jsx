import React, { useState, useEffect } from "react";
import { useMonitoring } from "../../../hooks/useMonitoring";
import { FiX, FiSave } from "react-icons/fi";
import LoadingSpinner from "../../common/LoadingSpinner";
import toast from "react-hot-toast";

const AlertForm = ({ isOpen, onClose, rule }) => {
  const { createAlertRule, updateAlertRule } = useMonitoring();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    metric_type: "cpu",
    metric_name: "usage",
    condition: "gt",
    threshold: 80,
    severity: "warning",
    duration: 60,
    enabled: true,
    notify_email: false,
    notify_slack: false,
    notify_discord: false,
  });

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name || "",
        description: rule.description || "",
        metric_type: rule.metric_type || "cpu",
        metric_name: rule.metric_name || "usage",
        condition: rule.condition || "gt",
        threshold: rule.threshold || 80,
        severity: rule.severity || "warning",
        duration: rule.duration || 60,
        enabled: rule.enabled !== false,
        notify_email: rule.notify_email || false,
        notify_slack: rule.notify_slack || false,
        notify_discord: rule.notify_discord || false,
      });
    }
  }, [rule]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let result;
    if (rule) {
      result = await updateAlertRule(rule.id, formData);
    } else {
      result = await createAlertRule(formData);
    }

    if (result.success) {
      toast.success(rule ? "Alert rule updated" : "Alert rule created");
      onClose();
    } else {
      toast.error(result.error);
    }

    setLoading(false);
  };

  const metricTypes = [
    { value: "cpu", label: "CPU" },
    { value: "memory", label: "Memory" },
    { value: "disk", label: "Disk" },
    { value: "network", label: "Network" },
    { value: "app", label: "Application" },
  ];

  const conditions = [
    { value: "gt", label: "Greater than (>)" },
    { value: "lt", label: "Less than (<)" },
    { value: "gte", label: "Greater than or equal (≥)" },
    { value: "lte", label: "Less than or equal (≤)" },
    { value: "eq", label: "Equal to (=)" },
    { value: "ne", label: "Not equal (≠)" },
  ];

  const severities = [
    { value: "info", label: "Info" },
    { value: "warning", label: "Warning" },
    { value: "critical", label: "Critical" },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
          onClick={onClose}
        />

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {rule ? "Edit Alert Rule" : "New Alert Rule"}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rule Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Metric Type and Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Metric Type
                </label>
                <select
                  value={formData.metric_type}
                  onChange={(e) =>
                    setFormData({ ...formData, metric_type: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {metricTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Metric Name
                </label>
                <select
                  value={formData.metric_name}
                  onChange={(e) =>
                    setFormData({ ...formData, metric_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="usage">Usage</option>
                  <option value="temperature">Temperature</option>
                  <option value="load">Load</option>
                </select>
              </div>
            </div>

            {/* Condition and Threshold */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Condition
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) =>
                    setFormData({ ...formData, condition: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {conditions.map((cond) => (
                    <option key={cond.value} value={cond.value}>
                      {cond.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Threshold
                </label>
                <input
                  type="number"
                  value={formData.threshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      threshold: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  step="0.1"
                  required
                />
              </div>
            </div>

            {/* Severity and Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Severity
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) =>
                    setFormData({ ...formData, severity: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {severities.map((sev) => (
                    <option key={sev.value} value={sev.value}>
                      {sev.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="0"
                  step="1"
                />
              </div>
            </div>

            {/* Notifications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notifications
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notify_email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notify_email: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Email
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notify_slack}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notify_slack: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Slack
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notify_discord}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notify_discord: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Discord
                  </span>
                </label>
              </div>
            </div>

            {/* Enabled */}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) =>
                  setFormData({ ...formData, enabled: e.target.checked })
                }
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Enable rule
              </span>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  <>
                    <FiSave className="mr-2 h-4 w-4" />
                    {rule ? "Update Rule" : "Create Rule"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AlertForm;
