import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import {
  FiUpload,
  FiFile,
  FiAlertTriangle,
  FiCheck,
  FiX,
} from "react-icons/fi";
import { useEncryption } from "../../hooks/useEncryption";
import LoadingSpinner from "../common/LoadingSpinner";
import ConfirmationModal from "../common/ConfirmationModal";
import toast from "react-hot-toast";

const PrivateKeyUpload = () => {
  const navigate = useNavigate();
  const { loadPrivateKey } = useEncryption();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [fileContent, setFileContent] = useState("");

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Check file type
    if (!file.name.endsWith(".pem") && !file.name.endsWith(".key")) {
      setError("Please upload a valid .pem or .key file");
      return;
    }

    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      if (
        content.includes("BEGIN PRIVATE KEY") ||
        content.includes("BEGIN RSA PRIVATE KEY")
      ) {
        setFile(file);
        setFileContent(content);
        setError("");
        setShowPasswordModal(true);
      } else {
        setError("Invalid private key format");
      }
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/x-pem-file": [".pem"],
      "application/x-iwork-keynote-sffkey": [".key"],
    },
    maxFiles: 1,
  });

  const handlePasswordSubmit = async () => {
    if (!password) {
      toast.error("Please enter a password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await loadPrivateKey(password);
      if (result.success) {
        toast.success("Private key loaded successfully");
        navigate("/dashboard");
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to load private key");
    } finally {
      setLoading(false);
      setShowPasswordModal(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setFileContent("");
    setPassword("");
    setError("");
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mb-4">
          <FiUpload className="h-8 w-8 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Upload Your Private Key
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Upload your private key file to decrypt your files.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
              : "border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400"
          }`}
        >
          <input {...getInputProps()} />
          <FiUpload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-primary-600 dark:text-primary-400">
              Drop the file here...
            </p>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-400">
                Drag & drop your private key file here, or click to select
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Supported formats: .pem, .key
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <FiFile className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 bg-white dark:bg-gray-900 rounded p-2">
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all text-gray-700 dark:text-gray-300 font-mono max-h-32">
              {fileContent.substring(0, 200)}...
            </pre>
          </div>
        </div>
      )}

      {/* Password Modal */}
      <ConfirmationModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          removeFile();
        }}
        onConfirm={handlePasswordSubmit}
        title="Enter Password"
        message={
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter the password you used to encrypt this private key.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              autoFocus
            />
          </div>
        }
        confirmText={
          loading ? <LoadingSpinner size="sm" color="white" /> : "Unlock Key"
        }
        cancelText="Cancel"
        type="info"
      />

      {file && (
        <button
          onClick={() => setShowPasswordModal(true)}
          disabled={loading}
          className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <LoadingSpinner size="sm" color="white" />
          ) : (
            "Continue with Selected Key"
          )}
        </button>
      )}

      <button
        onClick={() => navigate("/dashboard")}
        className="w-full mt-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      >
        Skip for now
      </button>
    </div>
  );
};

export default PrivateKeyUpload;
