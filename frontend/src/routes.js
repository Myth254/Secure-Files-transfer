/**
 * Application Route Configuration
 * Centralized route management for the entire app
 */

// ============================================
// Route Paths
// ============================================

export const ROUTES = {
  // Public routes
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  VERIFY_OTP: "/verify-otp",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  ABOUT: "/about",
  CONTACT: "/contact",

  // Protected routes
  DASHBOARD: "/dashboard",
  FILES: "/files",
  FILE_DETAILS: (id) => `/files/${id}`,
  FILE_UPLOAD: "/files/upload",

  // Sharing routes
  SHARED_WITH_ME: "/shared",
  SHARE_REQUESTS: "/share-requests",
  SHARE_DETAILS: (id) => `/share/${id}`,

  // User routes
  PROFILE: "/profile",
  SETTINGS: "/settings",
  ACTIVITY: "/activity",

  // Monitoring routes
  MONITORING: "/monitoring",
  MONITORING_METRICS: "/monitoring/metrics",
  MONITORING_ALERTS: "/monitoring/alerts",
  MONITORING_SESSIONS: "/monitoring/sessions",
  MONITORING_LOGS: "/monitoring/logs",

  // Admin routes
  ADMIN: "/admin",
  ADMIN_USERS: "/admin/users",
  ADMIN_SYSTEM: "/admin/system",
  ADMIN_LOGS: "/admin/logs",

  // Error routes
  NOT_FOUND: "/404",
  UNAUTHORIZED: "/401",
  FORBIDDEN: "/403",
  SERVER_ERROR: "/500",
};

// ============================================
// Route Types
// ============================================

export const ROUTE_TYPES = {
  PUBLIC: "public",
  PRIVATE: "private",
  ADMIN: "admin",
  AUTH: "auth",
};

// ============================================
// Route Configuration
// ============================================

export const routeConfig = [
  // Public routes
  {
    path: ROUTES.HOME,
    type: ROUTE_TYPES.PUBLIC,
    name: "Home",
    component: "Home",
    exact: true,
  },
  {
    path: ROUTES.LOGIN,
    type: ROUTE_TYPES.PUBLIC,
    name: "Login",
    component: "Login",
    layout: "AuthLayout",
  },
  {
    path: ROUTES.REGISTER,
    type: ROUTE_TYPES.PUBLIC,
    name: "Register",
    component: "Register",
    layout: "AuthLayout",
  },
  {
    path: ROUTES.VERIFY_OTP,
    type: ROUTE_TYPES.PUBLIC,
    name: "Verify OTP",
    component: "OTPVerificationPage",
    layout: "AuthLayout",
  },
  {
    path: ROUTES.ABOUT,
    type: ROUTE_TYPES.PUBLIC,
    name: "About",
    component: "About",
  },
  {
    path: ROUTES.CONTACT,
    type: ROUTE_TYPES.PUBLIC,
    name: "Contact",
    component: "Contact",
  },

  // Protected routes (require authentication)
  {
    path: ROUTES.DASHBOARD,
    type: ROUTE_TYPES.PRIVATE,
    name: "Dashboard",
    component: "Dashboard",
    layout: "DashboardLayout",
    icon: "FiHome",
  },
  {
    path: ROUTES.FILES,
    type: ROUTE_TYPES.PRIVATE,
    name: "My Files",
    component: "FilesPage",
    layout: "DashboardLayout",
    icon: "FiFolder",
  },
  {
    path: ROUTES.FILE_DETAILS(":id"),
    type: ROUTE_TYPES.PRIVATE,
    name: "File Details",
    component: "FileDetailsPage",
    layout: "DashboardLayout",
    hidden: true, // Hidden from navigation
  },
  {
    path: ROUTES.SHARED_WITH_ME,
    type: ROUTE_TYPES.PRIVATE,
    name: "Shared With Me",
    component: "SharedWithMePage",
    layout: "DashboardLayout",
    icon: "FiShare2",
  },
  {
    path: ROUTES.SHARE_REQUESTS,
    type: ROUTE_TYPES.PRIVATE,
    name: "Share Requests",
    component: "ShareRequestsPage",
    layout: "DashboardLayout",
    icon: "FiInbox",
  },
  {
    path: ROUTES.PROFILE,
    type: ROUTE_TYPES.PRIVATE,
    name: "Profile",
    component: "ProfilePage",
    layout: "DashboardLayout",
    icon: "FiUser",
  },
  {
    path: ROUTES.SETTINGS,
    type: ROUTE_TYPES.PRIVATE,
    name: "Settings",
    component: "SettingsPage",
    layout: "DashboardLayout",
    icon: "FiSettings",
  },
  {
    path: ROUTES.MONITORING,
    type: ROUTE_TYPES.PRIVATE,
    name: "Monitoring",
    component: "MonitoringPage",
    layout: "MonitoringLayout",
    icon: "FiActivity",
  },

  // Admin routes (require admin privileges)
  {
    path: ROUTES.ADMIN,
    type: ROUTE_TYPES.ADMIN,
    name: "Admin Dashboard",
    component: "AdminPage",
    layout: "DashboardLayout",
    icon: "FiShield",
    adminOnly: true,
  },
  {
    path: ROUTES.ADMIN_USERS,
    type: ROUTE_TYPES.ADMIN,
    name: "User Management",
    component: "UserManagement",
    layout: "DashboardLayout",
    icon: "FiUsers",
    adminOnly: true,
  },

  // Error routes
  {
    path: ROUTES.NOT_FOUND,
    type: ROUTE_TYPES.PUBLIC,
    name: "Not Found",
    component: "NotFoundPage",
  },
  {
    path: ROUTES.UNAUTHORIZED,
    type: ROUTE_TYPES.PUBLIC,
    name: "Unauthorized",
    component: "UnauthorizedPage",
  },
];

// ============================================
// Navigation Items (for sidebar/menu)
// ============================================

export const getNavigationItems = (userRole = "user") => {
  const items = routeConfig.filter(
    (route) =>
      !route.hidden &&
      (route.type === ROUTE_TYPES.PRIVATE ||
        (route.type === ROUTE_TYPES.ADMIN && userRole === "admin")),
  );

  return items.map(({ path, name, icon }) => ({ path, name, icon }));
};

// ============================================
// Route Guards
// ============================================

export const canAccessRoute = (route, user) => {
  if (!route) return false;

  switch (route.type) {
    case ROUTE_TYPES.PUBLIC:
      return true;

    case ROUTE_TYPES.PRIVATE:
      return !!user;

    case ROUTE_TYPES.ADMIN:
      return user?.role === "admin";

    default:
      return false;
  }
};

// ============================================
// Breadcrumb Generator
// ============================================

export const generateBreadcrumbs = (pathname) => {
  const paths = pathname.split("/").filter(Boolean);
  const breadcrumbs = [];

  let currentPath = "";
  paths.forEach((segment) => {
    currentPath += `/${segment}`;
    const route = routeConfig.find((r) => r.path === currentPath);
    if (route) {
      breadcrumbs.push({
        name: route.name,
        path: currentPath,
      });
    }
  });

  return breadcrumbs;
};

// ============================================
// Route Helpers
// ============================================

export const getRouteByName = (name) => {
  return routeConfig.find((route) => route.name === name);
};

export const getRouteByPath = (path) => {
  return routeConfig.find((route) => route.path === path);
};

export const isActiveRoute = (currentPath, routePath) => {
  if (routePath === ROUTES.HOME) {
    return currentPath === ROUTES.HOME;
  }
  return currentPath.startsWith(routePath);
};

// ============================================
// Export all routes as constants
// ============================================

export default ROUTES;
