import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Secure File Transfer
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              End-to-end encrypted file sharing with real-time monitoring and
              OTP verification. Your data is safe with us.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
              Quick Links
            </h4>
            <ul className="space-y-1">
              <li>
                <Link
                  to="/about"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
              Support
            </h4>
            <ul className="space-y-1">
              <li>
                <Link
                  to="/help"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@securefile.com"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  support@securefile.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © {currentYear} Secure File Transfer. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
