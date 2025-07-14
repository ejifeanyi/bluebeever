export const BATCH_CONFIG = {
  // Gmail API limits
  FETCH_CHUNK_SIZE: 20, // Fetch 20 emails at once
  DB_BATCH_SIZE: 50, // Insert 50 emails per DB batch

  // Sync strategy configs
  SYNC_CONFIGS: {
    quick: {
      maxResults: 100,
      priority: 1,
      delay: 0,
      batchSize: 25,
    },
    full: {
      maxResults: 200,
      priority: 3,
      delay: 1000,
      batchSize: 50,
    },
    incremental: {
      maxResults: 50,
      priority: 2,
      delay: 0,
      batchSize: 20,
    },
  },

  // Performance tuning
  CONCURRENT_WORKERS: 3, // Number of parallel sync workers
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000,

  // Rate limiting
  GMAIL_API_DELAY: 100, // 100ms between Gmail API calls
  BATCH_PROCESSING_DELAY: 500, // 500ms between batch processing

  // Timeouts
  SYNC_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  JOB_TIMEOUT_MS: 10 * 60 * 1000, // 10 minutes
} as const;

export type SyncStrategy = keyof typeof BATCH_CONFIG.SYNC_CONFIGS;
