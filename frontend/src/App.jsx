import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { FileProvider } from "./context/FileContext";
import { ShareProvider } from "./context/ShareContext";
import { MonitoringProvider } from "./context/MonitoringContext";
import { WebSocketProvider } from "./context/WebSocketContext";
import { ThemeProvider } from "./context/ThemeContext";
import PrivateRoute from "./components/common/PrivateRoute";

// Layouts
import MainLayout from "./components/layout/MainLayout";
import AuthLayout from "./components/layout/AuthLayout";
import DashboardLayout from "./components/layout/DashboardLayout";
import MonitoringLayout from "./components/layout/MonitoringLayout";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import OTPVerificationPage from "./pages/OTPVerificationPage";
import Dashboard from "./pages/Dashboard";
import FilesPage from "./pages/FilesPage";
import FileDetailsPage from "./pages/FileDetailsPage";
import SharedWithMePage from "./pages/SharedWithMePage";
import ShareRequestsPage from "./pages/ShareRequestsPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import MonitoringPage from "./pages/MonitoringPage";
import AdminPage from "./pages/AdminPage";
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFoundPage from "./pages/NotFoundPage";

// Styles
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <FileProvider>
            <ShareProvider>
              <MonitoringProvider>
                <WebSocketProvider>
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: "#363636",
                        color: "#fff",
                      },
                      success: {
                        duration: 3000,
                        iconTheme: {
                          primary: "#10b981",
                          secondary: "#fff",
                        },
                      },
                      error: {
                        duration: 4000,
                        iconTheme: {
                          primary: "#ef4444",
                          secondary: "#fff",
                        },
                      },
                    }}
                  />

                  <Routes>
                    {/* Public Routes */}
                    <Route element={<AuthLayout />}>
                      <Route path="/" element={<Home />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route
                        path="/verify-otp"
                        element={<OTPVerificationPage />}
                      />
                      <Route path="/about" element={<About />} />
                      <Route path="/contact" element={<Contact />} />
                    </Route>

                    {/* Protected Routes - Main App */}
                    <Route
                      element={
                        <PrivateRoute>
                          <MainLayout />
                        </PrivateRoute>
                      }
                    >
                      <Route element={<DashboardLayout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/files" element={<FilesPage />} />
                        <Route
                          path="/files/:id"
                          element={<FileDetailsPage />}
                        />
                        <Route path="/shared" element={<SharedWithMePage />} />
                        <Route
                          path="/share-requests"
                          element={<ShareRequestsPage />}
                        />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                      </Route>

                      {/* Monitoring Dashboard */}
                      <Route element={<MonitoringLayout />}>
                        <Route
                          path="/monitoring"
                          element={<MonitoringPage />}
                        />
                      </Route>

                      {/* Admin Routes */}
                      <Route element={<DashboardLayout isAdmin />}>
                        <Route path="/admin" element={<AdminPage />} />
                      </Route>
                    </Route>

                    {/* 404 */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </WebSocketProvider>
              </MonitoringProvider>
            </ShareProvider>
          </FileProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
