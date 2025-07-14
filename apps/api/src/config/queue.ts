import Queue from "bull";
import { env } from "./env";

const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
};

export const emailSyncQueue = new Queue("email sync", {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  },
});

export const emailProcessingQueue = new Queue("email processing", {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 100,
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 },
  },
});

export const emailStorageQueue = new Queue("email storage", {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 500,
    removeOnFail: 100,
    attempts: 3,
    backoff: { type: "exponential", delay: 1500 },
  },
});

export const categorizationQueue = new Queue("categorization", {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 200,
    removeOnFail: 50,
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
  },
});

export const allQueues = [
  emailSyncQueue,
  emailProcessingQueue,
  emailStorageQueue,
  categorizationQueue,
];
