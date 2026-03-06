import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "../hooks/useAuth";
import socketService from "../services/websocket/socket";
import toast from "react-hot-toast";

// Create context
const WebSocketContext = createContext(null);

// Provider component
export const WebSocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [apiRequests, setApiRequests] = useState([]);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Use refs to track mounted state and prevent memory leaks
  const mountedRef = useRef(true);
  const connectionInProgressRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const connectWebSocket = useCallback(() => {
    if (connectionInProgressRef.current) return;
    connectionInProgressRef.current = true;

    try {
      socketService.connect();

      socketService.on("connect", () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        setConnectionError(null);
        setReconnectAttempt(0);
        console.log("✅ WebSocket connected");
        connectionInProgressRef.current = false;
      });

      socketService.on("disconnect", () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        console.log("❌ WebSocket disconnected");
        connectionInProgressRef.current = false;
      });

      socketService.on("connect_error", (err) => {
        if (!mountedRef.current) return;
        setConnectionError(err.message);
        setReconnectAttempt((prev) => prev + 1);
        console.error("WebSocket connection error:", err);
        connectionInProgressRef.current = false;
      });

      socketService.on("reconnect", () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        setConnectionError(null);
        toast.success("WebSocket reconnected");
        connectionInProgressRef.current = false;
      });

      socketService.on("reconnect_error", (err) => {
        if (!mountedRef.current) return;
        setConnectionError(err.message);
        console.error("WebSocket reconnect error:", err);
        connectionInProgressRef.current = false;
      });

      socketService.on("reconnect_failed", () => {
        if (!mountedRef.current) return;
        setConnectionError("Failed to reconnect");
        toast.error("WebSocket connection failed");
        connectionInProgressRef.current = false;
      });

      // Monitoring events
      socketService.on("metrics_update", (data) => {
        if (!mountedRef.current) return;
        setMetrics(data);
      });

      socketService.on("alert_triggered", (alert) => {
        if (!mountedRef.current) return;
        setAlerts((prev) => [alert, ...prev].slice(0, 50));

        // Show toast for critical alerts
        if (alert.severity === "critical" || alert.severity === "emergency") {
          toast.error(`🚨 ${alert.message}`, {
            duration: 10000,
            position: "top-center",
          });
        } else if (alert.severity === "warning") {
          toast.warning(`⚠️ ${alert.message}`, {
            duration: 8000,
          });
        }
      });

      socketService.on("alert_resolved", (data) => {
        if (!mountedRef.current) return;
        setAlerts((prev) => prev.filter((alert) => alert.id !== data.alert_id));
      });

      socketService.on("api_request", (request) => {
        if (!mountedRef.current) return;
        setApiRequests((prev) => [request, ...prev].slice(0, 100));
      });

      // Subscribe to monitoring rooms
      socketService.subscribe("metrics");
      socketService.subscribe("alerts");
    } catch (err) {
      if (!mountedRef.current) return;
      console.error("Failed to connect WebSocket:", err);
      setConnectionError(err.message);
      connectionInProgressRef.current = false;
    }
  }, []);

  const disconnectWebSocket = useCallback(() => {
    socketService.disconnect();
    if (!mountedRef.current) return;
    setIsConnected(false);
    setMetrics(null);
    setAlerts([]);
    setApiRequests([]);
    connectionInProgressRef.current = false;
  }, []);

  // Connect/disconnect based on authentication
  useEffect(() => {
    let timeoutId;

    if (isAuthenticated) {
      // Delay connection to avoid race conditions
      timeoutId = setTimeout(() => {
        connectWebSocket();
      }, 100);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      disconnectWebSocket();
    };
  }, [isAuthenticated, connectWebSocket, disconnectWebSocket]);

  const subscribeToRoom = useCallback((room) => {
    socketService.subscribe(room);
  }, []);

  const unsubscribeFromRoom = useCallback((room) => {
    socketService.unsubscribe(room);
  }, []);

  const emitEvent = useCallback((event, data) => {
    socketService.emit(event, data);
  }, []);

  const value = {
    isConnected,
    metrics,
    alerts,
    apiRequests,
    connectionError,
    reconnectAttempt,
    subscribeToRoom,
    unsubscribeFromRoom,
    emitEvent,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Export context for custom hook
export { WebSocketContext };
