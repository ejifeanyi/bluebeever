import { prisma, dbConfig } from "../config/database";

export interface ConnectionHealth {
  isHealthy: boolean;
  activeConnections: number;
  maxConnections: number;
  responseTime: number;
  lastCheck: Date;
  error?: string;
}

export class ConnectionHealthService {
  private static instance: ConnectionHealthService;
  private healthCache: ConnectionHealth | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): ConnectionHealthService {
    if (!ConnectionHealthService.instance) {
      ConnectionHealthService.instance = new ConnectionHealthService();
    }
    return ConnectionHealthService.instance;
  }

  async checkHealth(): Promise<ConnectionHealth> {
    const startTime = Date.now();

    try {
      await prisma.$queryRaw`SELECT 1`;

      const responseTime = Date.now() - startTime;
      const health: ConnectionHealth = {
        isHealthy: true,
        activeConnections: await this.getActiveConnections(),
        maxConnections: dbConfig.connectionLimit,
        responseTime,
        lastCheck: new Date(),
      };

      this.healthCache = health;
      return health;
    } catch (error) {
      const health: ConnectionHealth = {
        isHealthy: false,
        activeConnections: 0,
        maxConnections: dbConfig.connectionLimit,
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      };

      this.healthCache = health;
      return health;
    }
  }

  private async getActiveConnections(): Promise<number> {
    try {
      const result = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM pg_stat_activity 
        WHERE state = 'active' AND datname = current_database()
      `;
      return Number(result[0].count);
    } catch {
      return 0;
    }
  }

  startHealthMonitoring(intervalMs: number = 30000): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(async () => {
      const health = await this.checkHealth();

      if (!health.isHealthy) {
        console.error("Database health check failed:", health.error);
      }

      if (health.activeConnections > health.maxConnections * 0.8) {
        console.warn(
          `High connection usage: ${health.activeConnections}/${health.maxConnections}`
        );
      }
    }, intervalMs);
  }

  stopHealthMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  getCachedHealth(): ConnectionHealth | null {
    return this.healthCache;
  }

  async waitForHealthy(timeoutMs: number = 10000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const health = await this.checkHealth();
      if (health.isHealthy) return true;

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return false;
  }
}
