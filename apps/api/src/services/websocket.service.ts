import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAuthenticated?: boolean;
}

interface WebSocketMessage {
  type: "new_email" | "email_read" | "sync_status" | "refresh_emails";
  data?: any;
  userId?: string;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({
      server,
      path: "/ws",
      verifyClient: this.verifyClient.bind(this),
    });

    this.wss.on("connection", this.handleConnection.bind(this));
  }

  private verifyClient(info: any): boolean {
    const token = info.req.url?.split("token=")[1];
    if (!token) return false;

    try {
      jwt.verify(token, env.JWT_SECRET);
      return true;
    } catch {
      return false;
    }
  }

  private handleConnection(ws: AuthenticatedWebSocket, request: any) {
    const token = request.url?.split("token=")[1];

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      ws.userId = decoded.userId;
      ws.isAuthenticated = true;

      if (!this.clients.has(decoded.userId)) {
        this.clients.set(decoded.userId, new Set());
      }
      this.clients.get(decoded.userId)!.add(ws);

      console.log(`✅ WebSocket connected for user: ${decoded.userId}`);

      ws.on("close", () => {
        this.removeClient(decoded.userId, ws);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        this.removeClient(decoded.userId, ws);
      });
    } catch (error) {
      console.error("WebSocket authentication failed:", error);
      ws.close(1008, "Invalid token");
    }
  }

  private removeClient(userId: string, ws: AuthenticatedWebSocket) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(ws);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  public notifyUser(userId: string, message: WebSocketMessage) {
    const userClients = this.clients.get(userId);
    if (!userClients) return;

    const payload = JSON.stringify(message);
    userClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  public notifyNewEmail(userId: string, email: any) {
    this.notifyUser(userId, {
      type: "new_email",
      data: {
        id: email.id,
        subject: email.subject,
        from: email.from,
        snippet: email.snippet,
        date: email.date,
        isRead: email.isRead,
      },
    });
  }

  public notifyEmailRead(userId: string, emailId: string) {
    this.notifyUser(userId, {
      type: "email_read",
      data: { emailId },
    });
  }

  public notifySyncStatus(userId: string, status: any) {
    this.notifyUser(userId, {
      type: "sync_status",
      data: status,
    });
  }

  public notifyRefreshEmails(userId: string) {
    this.notifyUser(userId, {
      type: "refresh_emails",
    });
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.clients.keys());
  }

  public isUserConnected(userId: string): boolean {
    return this.clients.has(userId) && this.clients.get(userId)!.size > 0;
  }
}

let webSocketService: WebSocketService | null = null;

export const initializeWebSocketService = (
  server: Server
): WebSocketService => {
  if (!webSocketService) {
    webSocketService = new WebSocketService(server);
  }
  return webSocketService;
};

export const getWebSocketService = (): WebSocketService => {
  if (!webSocketService) {
    throw new Error("WebSocket service not initialized");
  }
  return webSocketService;
};
