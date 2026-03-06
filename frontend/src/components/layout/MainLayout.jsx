import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Navbar, Sidebar, Footer } from "../common";
import { useTheme } from "../../hooks/useTheme";

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isDark } = useTheme();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? "dark" : ""}`}>
      {/* Navbar */}
      <Navbar onMenuClick={toggleSidebar} />

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main content */}
        <main className="flex-1 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default MainLayout;
