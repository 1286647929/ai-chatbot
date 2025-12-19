/**
 * 缓存模块索引
 */

// 内存缓存
export {
  generateCacheKey,
  LRUCache,
  type LRUCacheConfig,
  normalizeQuery,
  searchCache,
} from "./memory";

// Redis 缓存
export {
  CACHE_TTL,
  type CacheType,
  generateSearchCacheKey,
  getTTLForType,
  RedisCache,
  type RedisCacheConfig,
  redisCache,
} from "./redis";

// 统一缓存接口
import { generateCacheKey, searchCache } from "./memory";
import { type CacheType, getTTLForType, redisCache } from "./redis";

/**
 * 分层缓存
 * L1: 内存缓存（快速，容量小）
 * L2: Redis 缓存（较慢，持久化）
 */
export class TieredCache {
  /**
   * 获取缓存（先查 L1，再查 L2）
   */
  async get<T>(key: string): Promise<T | null> {
    // L1: 内存缓存
    const memoryResult = searchCache.get(key);
    if (memoryResult !== undefined) {
      return memoryResult as T;
    }

    // L2: Redis 缓存
    const redisResult = await redisCache.get<T>(key);
    if (redisResult !== null) {
      // 回填 L1
      searchCache.set(key, redisResult);
      return redisResult;
    }

    return null;
  }

  /**
   * 设置缓存（同时写入 L1 和 L2）
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // L1: 内存缓存（使用更短的 TTL）
    searchCache.set(key, value, ttl ? Math.min(ttl * 1000, 5 * 60 * 1000) : undefined);

    // L2: Redis 缓存（异步）
    redisCache.set(key, value, ttl).catch((err) => {
      console.warn("[TieredCache] Redis set error:", err);
    });
  }

  /**
   * 获取或设置缓存
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    searchCache.delete(key);
    await redisCache.delete(key);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      memory: searchCache.getStats(),
      redis: redisCache.getStats(),
    };
  }
}

// 全局分层缓存实例
export const tieredCache = new TieredCache();

/**
 * 缓存包装器 - 用于包装搜索函数
 */
export function withCache<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: {
    keyGenerator: (...args: TArgs) => string;
    type?: CacheType;
    ttl?: number;
  }
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const key = options.keyGenerator(...args);
    const ttl = options.ttl ?? getTTLForType(options.type ?? "default");

    return tieredCache.getOrSet(key, () => fn(...args), ttl);
  };
}
