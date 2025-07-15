interface CacheItem<T> {
  data: T;
  expiry: number;
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000;

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
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
