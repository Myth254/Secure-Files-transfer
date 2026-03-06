import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { filesAPI } from "../services/api/filesAPI";
import { useAuth } from "./AuthContext";
import { validateFile } from "../utils/fileHelpers";
import toast from "react-hot-toast";

// Create context
const FileContext = createContext();

// Custom hook
// eslint-disable-next-line react-refresh/only-export-components
export const useFiles = () => {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error("useFiles must be used within FileProvider");
  }
  return context;
};

// Provider component
export const FileProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [downloadProgress, setDownloadProgress] = useState({});
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    type: "all",
    sortBy: "upload_date",
    sortOrder: "desc",
    page: 1,
    perPage: 20,
  });

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await filesAPI.getFiles();
      setFiles(response.data.files);
      setPagination((prev) => ({
        ...prev,
        total: response.data.count,
        totalPages: Math.ceil(response.data.count / prev.perPage),
      }));
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "Failed to fetch files";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await filesAPI.getStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  // Fetch files when authenticated and filters change
  useEffect(() => {
    if (isAuthenticated) {
      fetchFiles();
    }
  }, [isAuthenticated, fetchFiles]);

  const uploadFile = async (file) => {
    const validation = validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedExtensions: ["pdf", "txt", "jpg", "jpeg", "png", "doc", "docx"],
    });

    if (!validation.valid) {
      toast.error(validation.error);
      return { success: false, error: validation.error };
    }

    setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await filesAPI.uploadFile(formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: percentCompleted,
          }));
        },
      });

      setFiles((prev) => [response.data.file, ...prev]);
      await fetchStats();

      toast.success("File uploaded successfully");
      return { success: true, file: response.data.file };
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Upload failed";
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[file.name];
        return newProgress;
      });
    }
  };

  const downloadFile = async (fileId, filename) => {
    setDownloadProgress((prev) => ({ ...prev, [fileId]: 0 }));
    setError(null);

    try {
      const response = await filesAPI.downloadFile(fileId, {
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            setDownloadProgress((prev) => ({
              ...prev,
              [fileId]: percentCompleted,
            }));
          }
        },
        responseType: "blob",
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("File downloaded successfully");
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Download failed";
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setDownloadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });
    }
  };

  const deleteFile = async (fileId) => {
    setError(null);

    try {
      await filesAPI.deleteFile(fileId);
      setFiles((prev) => prev.filter((file) => file.id !== fileId));
      await fetchStats();
      toast.success("File deleted successfully");
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Delete failed";
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const shareFile = async (fileId, recipientUsername, permissions) => {
    setError(null);

    try {
      const response = await filesAPI.shareFile(
        fileId,
        recipientUsername,
        permissions,
      );
      toast.success("File shared successfully");
      return { success: true, shareRequest: response.data.share_request };
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Share failed";
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const updateFilters = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  const changePage = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      type: "all",
      sortBy: "upload_date",
      sortOrder: "desc",
      page: 1,
      perPage: 20,
    });
  };

  const value = {
    files,
    stats,
    loading,
    uploadProgress,
    downloadProgress,
    error,
    pagination,
    filters,
    fetchFiles,
    fetchStats,
    uploadFile,
    downloadFile,
    deleteFile,
    shareFile,
    updateFilters,
    changePage,
    clearFilters,
  };

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
};
