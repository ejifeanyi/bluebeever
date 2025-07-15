import { Request, Response, NextFunction } from "express";
import { healthMonitor } from "@/services/health-monitor.service";

interface CircuitBreakerState {
  state: "closed" | "open" | "half-open";
  failures: number;
  lastFailureTime: number;
  successCount: number;
  nextAttempt: number;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitorWindow: number;
  successThreshold: number;
}

export class CircuitBreakerMiddleware {
  private circuits: Map<string, CircuitBreakerState> = new Map();
  private readonly defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitorWindow: 60000,
    successThreshold: 3,
  };

  create(serviceName: string, config?: Partial<CircuitBreakerConfig>) {
    const finalConfig = { ...this.defaultConfig, ...config };

    return async (req: Request, res: Response, next: NextFunction) => {
      const circuit = this.getCircuit(serviceName);

      if (circuit.state === "open") {
        if (Date.now() < circuit.nextAttempt) {
          return this.handleCircuitOpen(res, serviceName);
        }
        circuit.state = "half-open";
        circuit.successCount = 0;
      }

      const originalSend = res.send;
      const originalStatus = res.status;
      const self = this;
      let statusCode = 200;

      res.status = function (code: number) {
        statusCode = code;
        return originalStatus.call(this, code);
      };

      res.send = function (body: any) {
        if (statusCode >= 500) {
          self.recordFailure(serviceName, finalConfig);
        } else {
          self.recordSuccess(serviceName, finalConfig);
        }

        return originalSend.call(this, body);
      };

      next();
    };
  }

  async executeWithCircuitBreaker<T>(
    serviceName: string,
    operation: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const circuit = this.getCircuit(serviceName);

    if (circuit.state === "open") {
      if (Date.now() < circuit.nextAttempt) {
        throw new Error(`Circuit breaker is OPEN for ${serviceName}`);
      }
      circuit.state = "half-open";
      circuit.successCount = 0;
    }

    try {
      const startTime = Date.now();
      const result = await operation();
      const duration = Date.now() - startTime;

      // Record success
      this.recordSuccess(serviceName, finalConfig);
      healthMonitor.recordMetric(`${serviceName}_success`, 1, "count");
      healthMonitor.recordMetric(`${serviceName}_duration`, duration, "ms");

      return result;
    } catch (error) {
      // Record failure
      this.recordFailure(serviceName, finalConfig);
      healthMonitor.recordMetric(`${serviceName}_failure`, 1, "count");

      throw error;
    }
  }

  // Get circuit state for monitoring
  getCircuitState(serviceName: string): CircuitBreakerState {
    return this.getCircuit(serviceName);
  }

  getAllCircuitStates(): Record<string, CircuitBreakerState> {
    const states: Record<string, CircuitBreakerState> = {};
    for (const [name, state] of this.circuits) {
      states[name] = state;
    }
    return states;
  }

  resetCircuit(serviceName: string): void {
    const circuit = this.getCircuit(serviceName);
    circuit.state = "closed";
    circuit.failures = 0;
    circuit.successCount = 0;
    circuit.lastFailureTime = 0;
    circuit.nextAttempt = 0;
  }

  async checkCircuitHealth(): Promise<{
    healthy: boolean;
    circuits: Record<string, any>;
  }> {
    const circuits: Record<string, any> = {};
    let healthy = true;

    for (const [name, circuit] of this.circuits) {
      circuits[name] = {
        state: circuit.state,
        failures: circuit.failures,
        isHealthy: circuit.state !== "open",
      };

      if (circuit.state === "open") {
        healthy = false;
      }
    }

    return { healthy, circuits };
  }

  private getCircuit(serviceName: string): CircuitBreakerState {
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, {
        state: "closed",
        failures: 0,
        lastFailureTime: 0,
        successCount: 0,
        nextAttempt: 0,
      });
    }
    return this.circuits.get(serviceName)!;
  }

  private recordSuccess(
    serviceName: string,
    config: CircuitBreakerConfig
  ): void {
    const circuit = this.getCircuit(serviceName);

    if (circuit.state === "half-open") {
      circuit.successCount++;
      if (circuit.successCount >= config.successThreshold) {
        circuit.state = "closed";
        circuit.failures = 0;
        circuit.successCount = 0;
      }
    } else if (circuit.state === "closed") {
      circuit.failures = Math.max(0, circuit.failures - 1);
    }
  }

  private recordFailure(
    serviceName: string,
    config: CircuitBreakerConfig
  ): void {
    const circuit = this.getCircuit(serviceName);
    const now = Date.now();

    circuit.failures++;
    circuit.lastFailureTime = now;

    if (circuit.failures >= config.failureThreshold) {
      circuit.state = "open";
      circuit.nextAttempt = now + config.recoveryTimeout;
    }
  }

  private handleCircuitOpen(res: Response, serviceName: string): void {
    res.status(503).json({
      error: "Service temporarily unavailable",
      service: serviceName,
      reason: "Circuit breaker is open",
      timestamp: new Date(),
    });
  }
}

export const circuitBreaker = new CircuitBreakerMiddleware();

export const aiServiceCircuitBreaker = circuitBreaker.create("ai-service", {
  failureThreshold: 3,
  recoveryTimeout: 60000,
});

export const emailSyncCircuitBreaker = circuitBreaker.create("email-sync", {
  failureThreshold: 5,
  recoveryTimeout: 30000,
});

export const databaseCircuitBreaker = circuitBreaker.create("database", {
  failureThreshold: 10,
  recoveryTimeout: 15000,
});
