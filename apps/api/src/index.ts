import { createServer } from "http";
import { createApp } from "./app";
import { initializeWebSocketService } from "./services/websocket.service";
import { env } from "./config/env";
import { disconnectDb } from "./config/database";

const app = createApp();

const server = createServer(app);

const wsService = initializeWebSocketService(server);
console.log("🔌 WebSocket service initialized");

server.listen(env.PORT, () => {
  console.log(`🚀 API Server running on port ${env.PORT}`);
  console.log(`📧 Environment: ${env.NODE_ENV}`);
  console.log(`🌐 Frontend URL: ${env.FRONTEND_URL}`);
  console.log(`🔗 Health check: http://localhost:${env.PORT}/api/health`);
  console.log(`🔗 DB Health check: http://localhost:${env.PORT}/api/health/db`);
  console.log(`🔌 WebSocket endpoint: ws://localhost:${env.PORT}/ws`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

  console.log("🔌 Closing WebSocket connections...");
  console.log("🗄️  Closing database connections...");

  try {
    await disconnectDb();
    console.log("✅ Database disconnected");
  } catch (error) {
    console.error("❌ Database disconnect error:", error);
  }

  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

setInterval(
  async () => {
    try {
      const { EmailSyncService } = await import(
        "./services/email-sync.service"
      );
      await EmailSyncService.cleanupStuckSyncs();
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  },
  5 * 60 * 1000
);
