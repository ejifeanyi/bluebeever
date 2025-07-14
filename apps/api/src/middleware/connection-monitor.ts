import { Request, Response, NextFunction } from "express";
import { ConnectionHealthService } from "../services/connection-health.service";

export interface ConnectionMonitorOptions {
  healthCheckPath?: string;
  enableHealthEndpoint?: boolean;
  maxResponseTime?: number;
  enableWarnings?: boolean;
}

export class ConnectionMonitorMiddleware {
  private healthService: ConnectionHealthService;
  private options: Required<ConnectionMonitorOptions>;

  constructor(options: ConnectionMonitorOptions = {}) {
    this.healthService = ConnectionHealthService.getInstance();
    this.options = {
      healthCheckPath: options.healthCheckPath || "/health/db",
      enableHealthEndpoint: options.enableHealthEndpoint ?? true,
      maxResponseTime: options.maxResponseTime || 1000,
      enableWarnings: options.enableWarnings ?? true,
    };
  }

  // Main middleware for monitoring database connections
  monitor() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Handle health check endpoint
      if (
        this.options.enableHealthEndpoint &&
        req.path === this.options.healthCheckPath
      ) {
        return this.handleHealthCheck(req, res);
      }

      // Monitor connection before processing request
      const startTime = Date.now();
      const health = this.healthService.getCachedHealth();

      // Check if database is healthy
      if (health && !health.isHealthy) {
        return res.status(503).json({
          error: "Database unavailable",
          message: "Service temporarily unavailable due to database issues",
        });
      }

      // Check connection pool usage
      if (health && health.activeConnections > health.maxConnections * 0.9) {
        if (this.options.enableWarnings) {
          console.warn(
            `High connection pool usage: ${health.activeConnections}/${health.maxConnections}`
          );
        }

        return res.status(503).json({
          error: "Database overloaded",
          message: "Service temporarily unavailable due to high load",
        });
      }

      // Add connection info to request
      req.dbHealth = health;

      // Monitor request processing time
      res.on("finish", () => {
        const duration = Date.now() - startTime;
        if (
          duration > this.options.maxResponseTime &&
          this.options.enableWarnings
        ) {
          console.warn(
            `Slow database request: ${req.method} ${req.path} took ${duration}ms`
          );
        }
      });

      next();
    };
  }

  private async handleHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.healthService.checkHealth();

      const status = health.isHealthy ? 200 : 503;
      res.status(status).json({
        status: health.isHealthy ? "healthy" : "unhealthy",
        database: {
          healthy: health.isHealthy,
          activeConnections: health.activeConnections,
          maxConnections: health.maxConnections,
          responseTime: health.responseTime,
          lastCheck: health.lastCheck,
          error: health.error,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Health check failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Circuit breaker pattern for database operations
  async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const health = await this.healthService.checkHealth();

    if (!health.isHealthy) {
      if (fallback) {
        return fallback();
      }
      throw new Error("Database circuit breaker is open");
    }

    try {
      return await operation();
    } catch (error) {
      // Re-check health after failure
      await this.healthService.checkHealth();
      throw error;
    }
  }
}

// Express middleware factory
export const createConnectionMonitor = (options?: ConnectionMonitorOptions) => {
  const monitor = new ConnectionMonitorMiddleware(options);
  return monitor.monitor();
};

// Helper to start monitoring
export const startConnectionMonitoring = (intervalMs: number = 30000) => {
  const healthService = ConnectionHealthService.getInstance();
  healthService.startHealthMonitoring(intervalMs);
};

// Types for enhanced request object
declare global {
  namespace Express {
    interface Request {
      dbHealth?:
        | import("../services/connection-health.service").ConnectionHealth
        | null;
    }
  }
}
