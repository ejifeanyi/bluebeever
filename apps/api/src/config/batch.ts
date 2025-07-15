// Tuned for 100 users, 30k-50k emails/day. Batch sizes balance throughput and latency. Increase CONCURRENT_WORKERS for more parallelism if needed.
export const BATCH_CONFIG = {
  FETCH_CHUNK_SIZE: 25, // Increased for better throughput
  DB_BATCH_SIZE: 50,    // Good balance for Postgres

  SYNC_CONFIGS: {
    quick: {
      maxResults: 100,
      priority: 1,
      delay: 0,
      batchSize: 25, // Moderate batch for quick sync
    },
    full: {
      maxResults: 200,
      priority: 3,
      delay: 1000,
      batchSize: 50, // Larger batch for full sync
    },
    incremental: {
      maxResults: 50,
      priority: 2,
      delay: 0,
      batchSize: 20, // Smaller batch for frequent incremental
    },
  },

  CONCURRENT_WORKERS: 10, // Increased for higher throughput
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000,

  GMAIL_API_DELAY: 100,
  BATCH_PROCESSING_DELAY: 500,

  SYNC_TIMEOUT_MS: 30 * 60 * 1000,
  JOB_TIMEOUT_MS: 10 * 60 * 1000, 
} as const;

export type SyncStrategy = keyof typeof BATCH_CONFIG.SYNC_CONFIGS;
