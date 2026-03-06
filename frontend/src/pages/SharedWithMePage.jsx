import React from "react";
import { SharedFilesList } from "../components/sharing";

const SharedWithMePage = () => {
  return (
    <div className="py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Shared With Me
      </h1>
      <SharedFilesList />
    </div>
  );
};

export default SharedWithMePage;
