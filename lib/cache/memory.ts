/**
 * 内存缓存层 - LRU 实现
 * 用于缓存搜索结果，减少 API 调用
 */

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  /** 缓存值 */
  value: T;
  /** 过期时间戳 */
  expiresAt: number;
  /** 最后访问时间 */
  lastAccessed: number;
}

/**
 * LRU 缓存配置
 */
export interface LRUCacheConfig {
  /** 最大条目数 */
  maxSize: number;
  /** 默认 TTL（毫秒） */
  defaultTTL: number;
}

const DEFAULT_CONFIG: LRUCacheConfig = {
  maxSize: 100,
  defaultTTL: 5 * 60 * 1000, // 5 分钟
};

/**
 * LRU 内存缓存
 * 线程安全的 LRU 缓存实现
 */
export class LRUCache<T> {
  private readonly cache: Map<string, CacheEntry<T>> = new Map();
  private readonly config: LRUCacheConfig;
  private hits = 0;
  private misses = 0;

  constructor(config: Partial<LRUCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 获取缓存值
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return;
    }

    // 更新最后访问时间（LRU）
    entry.lastAccessed = Date.now();
    this.hits++;

    // 将条目移到末尾（最近使用）
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * 设置缓存值
   */
  set(key: string, value: T, ttl?: number): void {
    // 如果达到最大容量，删除最久未使用的条目
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + (ttl ?? this.config.defaultTTL),
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
  }

  /**
   * 检查键是否存在且未过期
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除缓存条目
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 获取缓存统计
   */
  getStats(): {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * 清理过期条目
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 删除最久未使用的条目
   */
  private evictLRU(): void {
    // Map 保持插入顺序，第一个就是最旧的
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.cache.delete(firstKey);
    }
  }
}

/**
 * 查询归一化函数
 * 将查询字符串标准化以提高缓存命中率
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .sort()
    .join(" ");
}

/**
 * 生成缓存键
 */
export function generateCacheKey(
  prefix: string,
  query: string,
  params?: Record<string, unknown>
): string {
  const normalizedQuery = normalizeQuery(query);
  const paramsStr = params ? JSON.stringify(params) : "";
  return `${prefix}:${normalizedQuery}:${paramsStr}`;
}

// 创建全局搜索缓存实例
export const searchCache = new LRUCache<unknown>({
  maxSize: 100,
  defaultTTL: 5 * 60 * 1000, // 5 分钟
});

// 定期清理过期条目（每 5 分钟）
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const cleaned = searchCache.cleanup();
      if (cleaned > 0) {
        console.log(`[Cache] Cleaned ${cleaned} expired entries`);
      }
    },
    5 * 60 * 1000
  );
}
