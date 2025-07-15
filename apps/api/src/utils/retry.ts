export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: readonly string[];
}

export class RetryError extends Error {
  constructor(
    message: string,
    public attempts: number,
    public lastError: Error
  ) {
    super(message);
    this.name = "RetryError";
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    retryableErrors = ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "RATE_LIMIT"],
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (
        attempt === maxAttempts ||
        !isRetryableError(error as Error, retryableErrors)
      ) {
        throw new RetryError(
          `Operation failed after ${attempt} attempts: ${lastError.message}`,
          attempt,
          lastError
        );
      }

      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );
      console.warn(
        `Attempt ${attempt} failed: ${lastError.message}. Retrying in ${delay}ms...`
      );

      await sleep(delay);
    }
  }

  throw lastError!;
}

function isRetryableError(
  error: Error,
  retryableErrors: readonly string[]
): boolean {
  return retryableErrors.some(
    (code) =>
      error.message.includes(code) ||
      error.name.includes(code) ||
      (error as any).code === code
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const RETRY_CONFIGS = {
  database: {
    maxAttempts: 3,
    baseDelay: 500,
    maxDelay: 5000,
    retryableErrors: ["ECONNRESET", "ETIMEDOUT", "CONNECTION_LOST"],
  },

  api: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    retryableErrors: [
      "ECONNRESET",
      "ETIMEDOUT",
      "ENOTFOUND",
      "RATE_LIMIT",
      "500",
      "502",
      "503",
      "504",
    ],
  },

  queue: {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 10000,
    retryableErrors: ["QUEUE_FULL", "CONNECTION_FAILED"],
  },
} as const;
