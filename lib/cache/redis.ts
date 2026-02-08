/**
 * Redis 持久缓存层
 * 用于跨请求/跨实例的持久化缓存
 */

import { createClient, type RedisClientType } from "redis";
import { normalizeQuery } from "./memory";

/**
 * 缓存类型对应的 TTL 配置（秒）
 */
export const CACHE_TTL = {
  /** 新闻搜索：1 小时 */
  news: 60 * 60,
  /** 法规搜索：24 小时 */
  regulation: 24 * 60 * 60,
  /** 案例搜索：6 小时 */
  case: 6 * 60 * 60,
  /** 通用搜索：2 小时 */
  general: 2 * 60 * 60,
  /** 默认：1 小时 */
  default: 60 * 60,
} as const;

export type CacheType = keyof typeof CACHE_TTL;

/**
 * Redis 缓存配置
 */
export interface RedisCacheConfig {
  /** 键前缀 */
  keyPrefix: string;
  /** 默认 TTL（秒） */
  defaultTTL: number;
  /** 是否启用 */
  enabled: boolean;
}

const DEFAULT_CONFIG: RedisCacheConfig = {
  keyPrefix: "legal-cache:",
  defaultTTL: CACHE_TTL.default,
  enabled: true,
};

/**
 * Redis 缓存类
 */
export class RedisCache {
  private client: RedisClientType | null = null;
  private readonly config: RedisCacheConfig;
  private connectionPromise: Promise<RedisClientType | null> | null = null;
  private hits = 0;
  private misses = 0;

  constructor(config: Partial<RedisCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 初始化 Redis 连接
   */
  // biome-ignore lint/suspicious/useAwait: async 用于保持 Promise 返回类型一致性
  private async getClient(): Promise<RedisClientType | null> {
    if (this.client) {
      return this.client;
    }
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.connect();
    return this.connectionPromise;
  }

  /**
   * 连接 Redis
   */
  private async connect(): Promise<RedisClientType | null> {
    // 检查是否有 Redis URL
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.log("[RedisCache] No Redis URL configured, cache disabled");
      return null;
    }

    try {
      this.client = createClient({ url: redisUrl });

      this.client.on("error", (err) => {
        console.warn("[RedisCache] Redis client error:", err);
      });

      await this.client.connect();
      console.log("[RedisCache] Connected to Redis");
      return this.client;
    } catch (error) {
      console.warn("[RedisCache] Failed to connect:", error);
      return null;
    }
  }

  /**
   * 生成完整的缓存键
   */
  private buildKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const client = await this.getClient();
      if (!client) {
        return null;
      }

      const fullKey = this.buildKey(key);
      const data = await client.get(fullKey);

      if (!data) {
        this.misses++;
        return null;
      }

      this.hits++;
      return JSON.parse(data) as T;
    } catch (error) {
      console.warn("[RedisCache] Get error:", error);
      this.misses++;
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      const client = await this.getClient();
      if (!client) {
        return false;
      }

      const fullKey = this.buildKey(key);
      const data = JSON.stringify(value);
      const actualTTL = ttl ?? this.config.defaultTTL;

      await client.setEx(fullKey, actualTTL, data);
      return true;
    } catch (error) {
      console.warn("[RedisCache] Set error:", error);
      return false;
    }
  }

  /**
   * 删除缓存值
   */
  async delete(key: string): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      const client = await this.getClient();
      if (!client) {
        return false;
      }

      const fullKey = this.buildKey(key);
      await client.del(fullKey);
      return true;
    } catch (error) {
      console.warn("[RedisCache] Delete error:", error);
      return false;
    }
  }

  /**
   * 获取或设置缓存（常用模式）
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // 先尝试从缓存获取
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 执行工厂函数获取数据
    const value = await factory();

    // 异步写入缓存（不阻塞响应）
    this.set(key, value, ttl).catch((err) => {
      console.warn("[RedisCache] Background set error:", err);
    });

    return value;
  }

  /**
   * 获取缓存统计
   */
  getStats(): {
    hits: number;
    misses: number;
    hitRate: number;
    enabled: boolean;
    connected: boolean;
  } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      enabled: this.config.enabled,
      connected: this.client !== null,
    };
  }

  /**
   * 检查是否可用
   */
  async isAvailable(): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }
    const client = await this.getClient();
    return client !== null;
  }
}

/**
 * 生成搜索缓存键
 */
export function generateSearchCacheKey(
  type: CacheType,
  query: string,
  options?: Record<string, unknown>
): string {
  const normalized = normalizeQuery(query);
  const optionsStr = options ? `:${JSON.stringify(options)}` : "";
  return `search:${type}:${normalized}${optionsStr}`;
}

/**
 * 获取类型对应的 TTL
 */
export function getTTLForType(type: CacheType): number {
  return CACHE_TTL[type] ?? CACHE_TTL.default;
}

// 创建全局 Redis 缓存实例
export const redisCache = new RedisCache();
