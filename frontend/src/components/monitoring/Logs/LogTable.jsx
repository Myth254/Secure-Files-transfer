import React, { useState } from "react";
import { FiClock, FiUser, FiMoreVertical } from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";

const LogTable = ({ logs }) => {
  const [expandedRow, setExpandedRow] = useState(null);

  const getTimeAgo = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "some time ago";
    }
  };

  const getStatusColor = (status) => {
    if (status < 300) return "text-green-600 dark:text-green-400";
    if (status < 400) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getMethodColor = (method) => {
    switch (method) {
      case "GET":
        return "text-blue-600 dark:text-blue-400";
      case "POST":
        return "text-green-600 dark:text-green-400";
      case "PUT":
        return "text-yellow-600 dark:text-yellow-400";
      case "DELETE":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">No logs found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Time
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Method
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Endpoint
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Response Time
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              User
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Details
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {logs.map((log) => (
            <React.Fragment key={log.id}>
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiClock className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {getTimeAgo(log.timestamp)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`text-sm font-medium ${getMethodColor(log.method)}`}
                  >
                    {log.method}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-900 dark:text-white font-mono">
                    {log.endpoint}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`text-sm font-medium ${getStatusColor(log.status_code)}`}
                  >
                    {log.status_code}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-900 dark:text-white">
                    {log.response_time?.toFixed(2)}ms
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiUser className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {log.user_id || "Guest"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <button
                    onClick={() =>
                      setExpandedRow(expandedRow === log.id ? null : log.id)
                    }
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <FiMoreVertical className="h-5 w-5" />
                  </button>
                </td>
              </tr>
              {expandedRow === log.id && (
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <td colSpan="7" className="px-4 py-3">
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            IP Address
                          </p>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {log.ip_address || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            User Agent
                          </p>
                          <p
                            className="text-sm text-gray-900 dark:text-white truncate"
                            title={log.user_agent}
                          >
                            {log.user_agent || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Request ID
                        </p>
                        <p className="text-sm text-gray-900 dark:text-white font-mono">
                          {log.request_id}
                        </p>
                      </div>
                      {log.query_params && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Query Parameters
                          </p>
                          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(
                              JSON.parse(log.query_params || "{}"),
                              null,
                              2,
                            )}
                          </pre>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LogTable;
