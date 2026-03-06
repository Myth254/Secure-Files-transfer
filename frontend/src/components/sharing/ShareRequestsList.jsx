import React, { useState, useMemo } from "react";
import { useShare } from "../../hooks/useShare";
import ShareRequestCard from "./ShareRequestCard";
import { FiInbox, FiFilter } from "react-icons/fi";
import LoadingSpinner from "../common/LoadingSpinner";

const ShareRequestsList = () => {
  const { pendingRequests, loading } = useShare();
  const [filter, setFilter] = useState("all"); // all, incoming, outgoing

  const filteredRequests = useMemo(() => {
    if (!pendingRequests) return [];

    if (filter === "incoming") {
      return pendingRequests.filter((req) => req.type === "incoming");
    }
    if (filter === "outgoing") {
      return pendingRequests.filter((req) => req.type === "outgoing");
    }
    return pendingRequests;
  }, [pendingRequests, filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!pendingRequests || pendingRequests.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
        <FiInbox className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Pending Requests
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          You don't have any pending share requests at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Share Requests ({pendingRequests.length})
          </h2>

          {/* Filter */}
          <div className="flex items-center space-x-2">
            <FiFilter className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Requests</option>
              <option value="incoming">Received</option>
              <option value="outgoing">Sent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests list */}
      <div className="space-y-4">
        {filteredRequests.map((request) => (
          <ShareRequestCard key={request.id} request={request} />
        ))}
      </div>
    </div>
  );
};

export default ShareRequestsList;
