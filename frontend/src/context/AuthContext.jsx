import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api/authAPI";
import {
  setToken,
  getToken,
  removeToken,
  decodeToken,
} from "../services/utils/tokenManager";
import toast from "react-hot-toast";

// Create context
const AuthContext = createContext();

// Custom hook
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [otpData, setOtpData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await authAPI.verifyToken();
        setUser(response.data.user);
        setIsAuthenticated(true);
        setError(null);
      } catch (error) {
        console.error("Auth check failed:", error);
        removeToken();
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Auto logout when token expires
  useEffect(() => {
    const checkTokenExpiry = async () => {
      const token = getToken();
      if (token && isAuthenticated && user) {
        const decoded = decodeToken(token);
        if (decoded && decoded.exp * 1000 < Date.now()) {
          try {
            await authAPI.logout();
          } catch (error) {
            console.error("Logout error:", error);
          } finally {
            removeToken();
            setUser(null);
            setIsAuthenticated(false);
            setOtpData(null);
            localStorage.removeItem("rsa_private_key");
            toast.error("Session expired. Please login again.");
            navigate("/login");
          }
        }
      }
    };

    const interval = setInterval(checkTokenExpiry, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isAuthenticated, user, navigate]);

  const register = async (userData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authAPI.register(userData);
      const { token, user: userData_, rsa_private_key } = response.data;

      setToken(token);
      setUser(userData_);
      setIsAuthenticated(true);

      // Save private key securely
      localStorage.setItem("rsa_private_key", rsa_private_key);

      toast.success("Registration successful!");
      navigate("/dashboard");

      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Registration failed";
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authAPI.login(credentials);
      const { requires_otp, otp_id, user_id } = response.data;

      if (requires_otp) {
        setOtpData({ otp_id, user_id });
        navigate("/verify-otp");
        toast.success("OTP sent to your email");
      }

      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Login failed";
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (otpCode) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authAPI.verifyOTP({
        otp_id: otpData?.otp_id,
        otp_code: otpCode,
        user_id: otpData?.user_id,
      });

      const { token, user: userData_ } = response.data;
      setToken(token);
      setUser(userData_);
      setIsAuthenticated(true);
      setOtpData(null);

      toast.success("Login successful!");
      navigate("/dashboard");

      return { success: true };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "OTP verification failed";
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    setLoading(true);
    setError(null);

    try {
      await authAPI.resendOTP({
        otp_id: otpData?.otp_id,
        user_id: otpData?.user_id,
      });
      toast.success("OTP resent successfully");
      return { success: true };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "Failed to resend OTP";
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      removeToken();
      setUser(null);
      setIsAuthenticated(false);
      setOtpData(null);
      localStorage.removeItem("rsa_private_key");
      toast.success("Logged out successfully");
      navigate("/login");
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    otpData,
    error,
    register,
    login,
    verifyOTP,
    resendOTP,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
