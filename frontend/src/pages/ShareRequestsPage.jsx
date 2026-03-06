import React from "react";
import { ShareRequestsList } from "../components/sharing";

const ShareRequestsPage = () => {
  return (
    <div className="py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Share Requests
      </h1>
      <ShareRequestsList />
    </div>
  );
};

export default ShareRequestsPage;
