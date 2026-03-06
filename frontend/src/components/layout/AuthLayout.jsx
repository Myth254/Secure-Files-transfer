import React, { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";

const AuthLayout = () => {
  const { isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? "dark" : ""}`}>
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />

      {/* Main content */}
      <div className="relative flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Secure File Transfer
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              End-to-end encrypted file sharing with real-time monitoring
            </p>
          </div>

          {/* Auth card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <Outlet />
          </div>

          {/* Footer links */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              By continuing, you agree to our{" "}
              <a
                href="/terms"
                className="text-primary-600 dark:text-primary-400 hover:underline"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                className="text-primary-600 dark:text-primary-400 hover:underline"
              >
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
