import { Router, Request, Response } from "express";
import { healthMonitor } from "@/services/health-monitor.service";

const router = Router();

// Basic health check
router.get("/", async (req: Request, res: Response) => {
  try {
    const health = await healthMonitor.getSystemHealth();
    const statusCode =
      health.status === "healthy"
        ? 200
        : health.status === "degraded"
          ? 206
          : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    });
  }
});

// Detailed health check
router.get("/detailed", async (req: Request, res: Response) => {
  try {
    const health = await healthMonitor.getSystemHealth();
    const metrics = healthMonitor.getMetrics();

    res.json({
      ...health,
      detailedMetrics: metrics,
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Individual service health
router.get("/service/:name", async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const serviceHealth = await healthMonitor.checkServiceHealth(name);

    const statusCode =
      serviceHealth.status === "up"
        ? 200
        : serviceHealth.status === "degraded"
          ? 206
          : 503;

    res.status(statusCode).json(serviceHealth);
  } catch (error) {
    res.status(404).json({
      status: "unknown",
      error: error instanceof Error ? error.message : "Service not found",
    });
  }
});

// Get specific metrics
router.get("/metrics/:name?", (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const metrics = healthMonitor.getMetrics(name);

    res.json({
      metrics,
      count: metrics.length,
      latest: metrics[0] || null,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Performance test endpoint
router.post("/performance/:operation", async (req: Request, res: Response) => {
  try {
    const { operation } = req.params;
    const { duration = 100 } = req.body;

    const result = await healthMonitor.measurePerformance(
      `test_${operation}`,
      () => new Promise((resolve) => setTimeout(resolve, duration))
    );

    res.json({
      operation,
      duration,
      measured: true,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Performance test failed",
    });
  }
});

// Ready check (for load balancers)
router.get("/ready", async (req: Request, res: Response) => {
  try {
    const health = await healthMonitor.getSystemHealth();

    if (health.status === "unhealthy") {
      return res.status(503).json({ ready: false, reason: "System unhealthy" });
    }

    res.json({ ready: true, timestamp: new Date() });
  } catch (error) {
    res.status(503).json({
      ready: false,
      reason: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Live check (for Kubernetes)
router.get("/live", (req: Request, res: Response) => {
  res.json({
    live: true,
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

export default router;
