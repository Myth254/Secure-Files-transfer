import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiDownload, FiAlertTriangle, FiCheck, FiCopy } from "react-icons/fi";
import { useEncryption } from "../../hooks/useEncryption";
import LoadingSpinner from "../common/LoadingSpinner";
import ConfirmationModal from "../common/ConfirmationModal";
import toast from "react-hot-toast";

const PrivateKeyDownload = ({ privateKey }) => {
  const navigate = useNavigate();
  const { storePrivateKey } = useEncryption();
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([privateKey], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "secure_files_private_key.pem";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setDownloaded(true);
    toast.success("Private key downloaded successfully");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(privateKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast.success("Private key copied to clipboard");
  };

  const handleContinue = async () => {
    setLoading(true);

    // Store key in IndexedDB with password
    const password = prompt(
      "Enter a password to encrypt your private key for future use:",
    );
    if (password) {
      await storePrivateKey(password);
    }

    setLoading(false);
    navigate("/dashboard");
  };

  const handleSkip = () => {
    setShowConfirm(true);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-4">
          <FiAlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Save Your Private Key!
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          This is the only time you'll see your private key. Save it somewhere
          safe. You'll need it to decrypt your files.
        </p>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-300">
          <strong>⚠️ Warning:</strong> If you lose this key, you won't be able
          to decrypt your files. There's no way to recover it!
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all text-gray-700 dark:text-gray-300 font-mono">
          {privateKey}
        </pre>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center space-x-2 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <FiDownload className="h-5 w-5" />
          <span>{downloaded ? "Downloaded" : "Download Key"}</span>
        </button>

        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center space-x-2 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
        >
          {copied ? (
            <FiCheck className="h-5 w-5" />
          ) : (
            <FiCopy className="h-5 w-5" />
          )}
          <span>{copied ? "Copied!" : "Copy to Clipboard"}</span>
        </button>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <button
          onClick={handleContinue}
          disabled={loading || !downloaded}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <LoadingSpinner size="sm" color="white" />
          ) : (
            "I've Saved My Key - Continue"
          )}
        </button>

        <button
          onClick={handleSkip}
          className="w-full mt-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          Skip for now (not recommended)
        </button>
      </div>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => navigate("/dashboard")}
        title="Skip Key Download?"
        message="Skipping now means you'll need to download your key later. Are you sure you want to continue?"
        confirmText="Skip Anyway"
        cancelText="Go Back"
        type="warning"
      />
    </div>
  );
};

export default PrivateKeyDownload;
