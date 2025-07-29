import Redis from "redis";
import { env } from "@/config/env";

interface CacheItem<T> {
  data: T;
  expiry: number;
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000;
  private redisClient: ReturnType<typeof Redis.createClient> | null = null;
  private useRedis: boolean;

  constructor() {
    this.useRedis = !!env.REDIS_HOST && process.env.CACHE_BACKEND !== 'memory';
    if (this.useRedis) {
      this.redisClient = Redis.createClient({
        socket: {
          host: env.REDIS_HOST,
          port: env.REDIS_PORT,
        },
        password: env.REDIS_PASSWORD,
      });
      this.redisClient.connect().catch(console.error);
    }
  }

  async set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    if (this.useRedis && this.redisClient) {
      await this.redisClient.set(key, JSON.stringify(data), { PX: ttl });
    } else {
      this.cache.set(key, {
        data,
        expiry: Date.now() + ttl,
      });
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.useRedis && this.redisClient) {
      const val = await this.redisClient.get(key);
      return val ? JSON.parse(val) : null;
    } else {
      const item = this.cache.get(key);
      if (!item) return null;
      if (Date.now() > item.expiry) {
        this.cache.delete(key);
        return null;
      }
      return item.data;
    }
  }

  async delete(key: string): Promise<void> {
    if (this.useRedis && this.redisClient) {
      await this.redisClient.del(key);
    } else {
      this.cache.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  emailsKey(
    userId: string,
    page: number,
    limit: number,
    search?: string,
    filters?: any
  ): string {
    const filterStr = filters ? JSON.stringify(filters) : "";
    return `emails:${userId}:${page}:${limit}:${search || ""}:${filterStr}`;
  }

  emailKey(userId: string, id: string): string {
    return `email:${userId}:${id}`;
  }

  statsKey(userId: string): string {
    return `stats:${userId}`;
  }

  syncStatusKey(userId: string): string {
    return `sync:${userId}`;
  }

  recentEmailsKey(userId: string, limit: number): string {
    return `recent:${userId}:${limit}`;
  }

  invalidateUserCache(userId: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(userId)) {
        this.cache.delete(key);
      }
    }
  }

  categoryResultKey(emailId: string): string {
    return `category:result:${emailId}`;
  }
  categoryContentHashKey(hash: string): string {
    return `category:hash:${hash}`;
  }

  async getCategoryResult(emailId: string): Promise<any | null> {
    return this.get(this.categoryResultKey(emailId));
  }
  async setCategoryResult(emailId: string, result: any, ttl?: number): Promise<void> {
    return this.set(this.categoryResultKey(emailId), result, ttl);
  }

  async getCategoryBatchResults(emailIds: string[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    for (const id of emailIds) {
      const res = await this.getCategoryResult(id);
      if (res) results[id] = res;
    }
    return results;
  }
  async setCategoryBatchResults(results: Record<string, any>, ttl?: number): Promise<void> {
    await Promise.all(Object.entries(results).map(([id, res]) => this.setCategoryResult(id, res, ttl)));
  }

  async getDeduplicationKey(hash: string): Promise<any | null> {
    return this.get(this.categoryContentHashKey(hash));
  }
  async setDeduplicationKey(hash: string, value: any, ttl?: number): Promise<void> {
    return this.set(this.categoryContentHashKey(hash), value, ttl);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  startCleanup(interval: number = 60000): void {
    setInterval(() => this.cleanup(), interval);
  }
}

export const cacheService = new CacheService();

cacheService.startCleanup();
