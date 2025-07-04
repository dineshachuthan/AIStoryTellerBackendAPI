/**
 * Unified Cache Interface Architecture
 * Enforces consistent caching patterns across all external integrations
 */

export interface CacheMetadata {
  ttl: number;
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
  contentHash?: string;
  provider?: string;
  fileSize?: number;
  duration?: number;
  tags?: string[];
}

export interface CacheResult<T> {
  data: T | null;
  hit: boolean;
  metadata?: CacheMetadata;
  key: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  tags?: string[]; // For cache invalidation by tags
  contentHash?: string; // For content-based cache keys
  metadata?: Partial<CacheMetadata>; // Additional metadata
}

export interface CacheStats {
  hitRate: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  totalSize: number; // in bytes
  entryCount: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}

/**
 * Unified cache interface that all caching implementations must follow
 */
export interface ICacheProvider<T = any> {
  /**
   * Read from cache with automatic usage tracking
   */
  read(key: string): Promise<CacheResult<T>>;

  /**
   * Write to cache with enforced database-first pattern
   * Database write MUST complete before cache update
   */
  write(key: string, value: T, options: CacheOptions): Promise<void>;

  /**
   * Delete from cache and database atomically
   */
  delete(key: string): Promise<boolean>;

  /**
   * Check if key exists in cache
   */
  exists(key: string): Promise<boolean>;

  /**
   * Invalidate cache entries by pattern or tags
   */
  invalidate(pattern: string): Promise<number>;

  /**
   * Invalidate cache entries by tags
   */
  invalidateByTags(tags: string[]): Promise<number>;

  /**
   * Get cache statistics
   */
  getStats(): Promise<CacheStats>;

  /**
   * Clear all cache entries
   */
  clear(): Promise<void>;

  /**
   * Cleanup expired entries
   */
  cleanup(): Promise<number>;
}

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  name: string;
  maxSize: number; // in bytes
  defaultTtl: number; // in milliseconds
  cleanupInterval: number; // in milliseconds
  environment: 'development' | 'staging' | 'production';
  storageType: 'database' | 'file' | 'hybrid';
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

/**
 * Standard cache error types
 */
export class CacheError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly key?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'CacheError';
  }
}

export class CacheMissError extends CacheError {
  constructor(key: string) {
    super(`Cache miss for key: ${key}`, 'read', key);
    this.name = 'CacheMissError';
  }
}

export class CacheWriteError extends CacheError {
  constructor(key: string, cause?: Error) {
    super(`Failed to write cache for key: ${key}`, 'write', key, cause);
    this.name = 'CacheWriteError';
  }
}

export class DatabaseFirstViolationError extends CacheError {
  constructor(operation: string) {
    super(`Database-first pattern violated in operation: ${operation}`, operation);
    this.name = 'DatabaseFirstViolationError';
  }
}