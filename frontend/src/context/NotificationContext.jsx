import React, { createContext, useState, useCallback } from "react";
import toast from "react-hot-toast";

// Create context
const NotificationContext = createContext(null);

// Provider component
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
    };

    setNotifications((prev) => [newNotification, ...prev].slice(0, 100));
    setUnreadCount((prev) => prev + 1);

    // Show toast based on type
    switch (notification.type) {
      case "success":
        toast.success(notification.message);
        break;
      case "error":
        toast.error(notification.message);
        break;
      case "warning":
        toast.warning(notification.message);
        break;
      case "info":
        toast.success(notification.message, { icon: "ℹ️" });
        break;
      default:
        toast(notification.message);
    }

    return newNotification.id;
  }, []);

  const markAsRead = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
    setUnreadCount(0);
  }, []);

  const removeNotification = useCallback((notificationId) => {
    setNotifications((prev) => {
      const removed = prev.find((n) => n.id === notificationId);
      if (removed && !removed.read) {
        setUnreadCount((prevCount) => Math.max(0, prevCount - 1));
      }
      return prev.filter((n) => n.id !== notificationId);
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Export context for custom hook
export { NotificationContext };
