import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFiles } from '../../hooks/useFiles';
import { FiUpload, FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatFileSize } from '../../utils/fileHelpers';

const FileUpload = ({ onUploadComplete, maxFiles = 10 }) => {
  const { uploadFile, uploadProgress } = useFiles();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState([]);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(file => ({
        file: file.file.name,
        error: file.errors[0]?.message || 'Invalid file',
      }));
      setUploadErrors(prev => [...prev, ...errors]);
    }

    // Add accepted files
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      progress: 0,
      status: 'pending',
    }));

    setFiles(prev => [...prev, ...newFiles].slice(0, maxFiles));
  }, [maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize: 10 * 1024 * 1024, // 10MB
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
  });

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearErrors = () => {
    setUploadErrors([]);
  };

  const handleUploadAll = async () => {
    setUploading(true);
    setUploadErrors([]);

    for (const file of files) {
      try {
        const result = await uploadFile(file.file);
        if (result.success) {
          setFiles(prev =>
            prev.map(f =>
              f.id === file.id ? { ...f, status: 'success' } : f
            )
          );
        } else {
          setFiles(prev =>
            prev.map(f =>
              f.id === file.id ? { ...f, status: 'error' } : f
            )
          );
          setUploadErrors(prev => [
            ...prev,
            { file: file.file.name, error: result.error },
          ]);
        }
      } catch (error) {
        setFiles(prev =>
          prev.map(f => (f.id === file.id ? { ...f, status: 'error' } : f))
        );
        setUploadErrors(prev => [
          ...prev,
          { file: file.file.name, error: 'Upload failed' },
        ]);
      }
    }

    setUploading(false);
    if (onUploadComplete) {
      onUploadComplete();
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400'
        }`}
      >
        <input {...getInputProps()} />
        <FiUpload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-primary-600 dark:text-primary-400">Drop your files here...</p>
        ) : (
          <>
            <p className="text-gray-600 dark:text-gray-400">
              Drag & drop files here, or click to select
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Maximum file size: 10MB | Supported: Images, PDF, Documents
            </p>
          </>
        )}
      </div>

      {/* Error list */}
      {uploadErrors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
              Upload Errors
            </h3>
            <button
              onClick={clearErrors}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-1">
            {uploadErrors.map((error, index) => (
              <li key={index} className="text-xs text-red-600 dark:text-red-400">
                {error.file}: {error.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Files to Upload ({files.length})
            </h3>
            {!uploading && (
              <button
                onClick={handleUploadAll}
                className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
              >
                Upload All
              </button>
            )}
          </div>

          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.file.size)}
                    </p>
                  </div>

                  {/* Progress/Status */}
                  {uploading && uploadProgress[file.file.name] !== undefined ? (
                    <div className="w-24">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-400">
                          {uploadProgress[file.file.name]}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                        <div
                          className="bg-primary-600 rounded-full h-1 transition-all duration-300"
                          style={{ width: `${uploadProgress[file.file.name]}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    file.status === 'success' && (
                      <FiCheck className="h-5 w-5 text-green-500" />
                    )
                  )}
                  {file.status === 'error' && (
                    <FiAlertCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>

                {!uploading && file.status !== 'success' && (
                  <button
                    onClick={() => removeFile(file.id)}
                    className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;