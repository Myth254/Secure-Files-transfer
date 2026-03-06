import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  FiLock,
  FiShare2,
  FiEye,
  FiDownload,
  FiArrowRight,
} from "react-icons/fi";

const Home = () => {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: FiLock,
      title: "End-to-End Encryption",
      description:
        "Your files are encrypted before they leave your device. Only you have the keys.",
    },
    {
      icon: FiShare2,
      title: "Secure Sharing",
      description:
        "Share files with granular permissions and optional expiration dates.",
    },
    {
      icon: FiEye,
      title: "Real-time Monitoring",
      description: "Monitor system performance and file activity in real-time.",
    },
    {
      icon: FiDownload,
      title: "Easy Downloads",
      description: "Download your files securely with OTP verification.",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Secure File Transfer
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              End-to-end encrypted file sharing with real-time monitoring and
              two-factor authentication. Your data stays private, always.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Go to Dashboard
                  <FiArrowRight className="ml-2 h-5 w-5" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Get Started
                    <FiArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Why Choose Secure File Transfer?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full mb-4">
                    <Icon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600 dark:bg-primary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of users who trust us with their secure file
            transfers.
          </p>
          {!isAuthenticated && (
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-6 py-3 bg-white text-primary-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Create Free Account
              <FiArrowRight className="ml-2 h-5 w-5" />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
