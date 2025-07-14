interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  status: "healthy" | "warning" | "critical";
}

interface ServiceHealth {
  name: string;
  status: "up" | "down" | "degraded";
  responseTime: number;
  lastCheck: Date;
  errorRate: number;
  uptime: number;
  details?: Record<string, any>;
}

interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: Date;
  services: ServiceHealth[];
  metrics: HealthMetric[];
  uptime: number;
}

export class HealthMonitorService {
  private metrics: Map<string, HealthMetric[]> = new Map();
  private services: Map<string, ServiceHealth> = new Map();
  private startTime = Date.now();
  private readonly MAX_METRICS_HISTORY = 100;

  // Core system metrics
  async getSystemHealth(): Promise<SystemHealth> {
    const services = Array.from(this.services.values());
    const metrics = this.getAllMetrics();

    const status = this.calculateOverallStatus(services);

    return {
      status,
      timestamp: new Date(),
      services,
      metrics,
      uptime: Date.now() - this.startTime,
    };
  }

  // Service health tracking
  async checkServiceHealth(serviceName: string): Promise<ServiceHealth> {
    const startTime = Date.now();
    let status: ServiceHealth["status"] = "up";
    let details: Record<string, any> = {};

    try {
      switch (serviceName) {
        case "database":
          details = await this.checkDatabase();
          break;
        case "ai-service":
          details = await this.checkAiService();
          break;
        case "email-sync":
          details = await this.checkEmailSync();
          break;
        case "redis":
          details = await this.checkRedis();
          break;
        default:
          throw new Error(`Unknown service: ${serviceName}`);
      }
    } catch (error) {
      status = "down";
      details = {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    const responseTime = Date.now() - startTime;
    const existingService = this.services.get(serviceName);

    const serviceHealth: ServiceHealth = {
      name: serviceName,
      status,
      responseTime,
      lastCheck: new Date(),
      errorRate: this.calculateErrorRate(serviceName, status === "down"),
      uptime: existingService?.uptime || 0,
      details,
    };

    this.services.set(serviceName, serviceHealth);
    return serviceHealth;
  }

  // Metrics collection
  recordMetric(name: string, value: number, unit: string = ""): void {
    const status = this.getMetricStatus(name, value);

    const metric: HealthMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      status,
    };

    const history = this.metrics.get(name) || [];
    history.push(metric);

    // Keep only recent metrics
    if (history.length > this.MAX_METRICS_HISTORY) {
      history.shift();
    }

    this.metrics.set(name, history);
  }

  // Get metrics for monitoring
  getMetrics(name?: string): HealthMetric[] {
    if (name) {
      return this.metrics.get(name) || [];
    }
    return this.getAllMetrics();
  }

  // Performance monitoring
  async measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      const memoryUsed = process.memoryUsage().heapUsed - startMemory;

      this.recordMetric(`${operation}_duration`, duration, "ms");
      this.recordMetric(`${operation}_memory`, memoryUsed, "bytes");
      this.recordMetric(`${operation}_success`, 1, "count");

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordMetric(`${operation}_duration`, duration, "ms");
      this.recordMetric(`${operation}_error`, 1, "count");
      throw error;
    }
  }

  // Auto health checks
  startHealthChecks(intervalMs = 30000): void {
    const services = ["database", "ai-service", "email-sync", "redis"];

    setInterval(async () => {
      for (const service of services) {
        try {
          await this.checkServiceHealth(service);
        } catch (error) {
          console.error(`Health check failed for ${service}:`, error);
        }
      }

      // Record system metrics
      this.recordSystemMetrics();
    }, intervalMs);
  }

  private recordSystemMetrics(): void {
    const memUsage = process.memoryUsage();

    this.recordMetric("memory_heap_used", memUsage.heapUsed, "bytes");
    this.recordMetric("memory_heap_total", memUsage.heapTotal, "bytes");
    this.recordMetric("memory_rss", memUsage.rss, "bytes");
    this.recordMetric("uptime", Date.now() - this.startTime, "ms");
  }

  private async checkDatabase(): Promise<Record<string, any>> {
    // Mock database check - replace with actual DB connection test
    return {
      connections: 5,
      queryTime: Math.random() * 100,
      status: "connected",
    };
  }

  private async checkAiService(): Promise<Record<string, any>> {
    // Mock AI service check
    return {
      queueSize: Math.floor(Math.random() * 50),
      avgResponseTime: Math.random() * 2000,
      status: "operational",
    };
  }

  private async checkEmailSync(): Promise<Record<string, any>> {
    // Mock email sync check
    return {
      lastSync: new Date(),
      syncedCount: Math.floor(Math.random() * 100),
      status: "syncing",
    };
  }

  private async checkRedis(): Promise<Record<string, any>> {
    // Mock Redis check
    return {
      connected: true,
      keyCount: Math.floor(Math.random() * 1000),
      memoryUsage: Math.random() * 100,
    };
  }

  private calculateErrorRate(serviceName: string, isError: boolean): number {
    const history = this.getServiceHistory(serviceName);
    if (history.length === 0) return 0;

    const errors = history.filter((h) => h.status === "down").length;
    return (errors / history.length) * 100;
  }

  private getServiceHistory(serviceName: string): ServiceHealth[] {
    // In a real implementation, this would be stored in a database
    // For now, return mock history
    return [];
  }

  private getMetricStatus(name: string, value: number): HealthMetric["status"] {
    // Define thresholds for different metrics
    const thresholds: Record<string, { warning: number; critical: number }> = {
      memory_heap_used: { warning: 500_000_000, critical: 1_000_000_000 },
      response_time: { warning: 1000, critical: 5000 },
      error_rate: { warning: 5, critical: 10 },
      cpu_usage: { warning: 70, critical: 90 },
    };

    const threshold = thresholds[name];
    if (!threshold) return "healthy";

    if (value >= threshold.critical) return "critical";
    if (value >= threshold.warning) return "warning";
    return "healthy";
  }

  private calculateOverallStatus(
    services: ServiceHealth[]
  ): SystemHealth["status"] {
    if (services.some((s) => s.status === "down")) return "unhealthy";
    if (services.some((s) => s.status === "degraded")) return "degraded";
    return "healthy";
  }

  private getAllMetrics(): HealthMetric[] {
    const allMetrics: HealthMetric[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }
    return allMetrics.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }
}

// Singleton instance
export const healthMonitor = new HealthMonitorService();
