import { useEffect, useCallback, useRef } from "react";
import { useEmailStore } from "@/store/useEmailStore";
import Cookies from "js-cookie";

interface WebSocketMessage {
  type:
    | "NEW_EMAIL"
    | "EMAIL_READ"
    | "EMAIL_UPDATED"
    | "SYNC_STATUS"
    | "REFRESH_EMAILS";
  payload?: any;
}

export const useWebSocket = () => {
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = useRef(1000);

  const { loadEmails, loadCategories, loadStats } = useEmailStore();

  const connect = useCallback(() => {
    const token = Cookies.get("token");
    if (!token) return;

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000"}/ws?token=${token}`;

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log("🔌 WebSocket connected");
        reconnectAttempts.current = 0;
        reconnectDelay.current = 1000;
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case "NEW_EMAIL":
              loadEmails(); // Refresh email list
              loadStats(); // Update stats
              break;

            case "EMAIL_READ":
            case "EMAIL_UPDATED":
              loadEmails(); // Refresh to show changes
              break;

            case "REFRESH_EMAILS":
              loadEmails();
              loadCategories();
              break;

            case "SYNC_STATUS":
              // Handle sync status updates if needed
              break;
          }
        } catch (error) {
          console.error("WebSocket message parse error:", error);
        }
      };

      ws.current.onclose = () => {
        console.log("🔌 WebSocket disconnected");

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          setTimeout(() => {
            reconnectAttempts.current++;
            reconnectDelay.current *= 2;
            connect();
          }, reconnectDelay.current);
        }
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("WebSocket connection error:", error);
    }
  }, [loadEmails, loadCategories, loadStats]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    connect,
    disconnect,
    isConnected: ws.current?.readyState === WebSocket.OPEN,
  };
};
