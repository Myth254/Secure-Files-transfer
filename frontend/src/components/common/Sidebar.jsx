import React from "react";
import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiFolder,
  FiShare2,
  FiInbox,
  FiActivity,
  FiSettings,
  FiUsers,
  FiShield,
} from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const navItems = [
    { path: "/dashboard", name: "Dashboard", icon: FiHome },
    { path: "/files", name: "My Files", icon: FiFolder },
    { path: "/shared", name: "Shared With Me", icon: FiShare2 },
    { path: "/share-requests", name: "Share Requests", icon: FiInbox },
    { path: "/monitoring", name: "Monitoring", icon: FiActivity },
    { path: "/profile", name: "Profile", icon: FiUsers },
    { path: "/settings", name: "Settings", icon: FiSettings },
  ];

  const adminItems = [
    { path: "/admin", name: "Admin Dashboard", icon: FiShield },
    { path: "/admin/users", name: "User Management", icon: FiUsers },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out z-30 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Menu
            </h2>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                          : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`
                    }
                    onClick={onClose}
                  >
                    <item.icon className="mr-3" size={20} />
                    <span>{item.name}</span>
                  </NavLink>
                </li>
              ))}

              {/* Admin section */}
              {user?.role === "admin" && (
                <>
                  <li className="pt-4 mt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Admin
                    </span>
                  </li>
                  {adminItems.map((item) => (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          `flex items-center px-4 py-3 rounded-lg transition-colors ${
                            isActive
                              ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                              : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`
                        }
                        onClick={onClose}
                      >
                        <item.icon className="mr-3" size={20} />
                        <span>{item.name}</span>
                      </NavLink>
                    </li>
                  ))}
                </>
              )}
            </ul>
          </nav>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.username || "Guest"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email || ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
