/**
 * Database-backed Cache Provider Implementation
 * Implements ICacheProvider with PostgreSQL storage and file system caching
 */

import { ICacheProvider, CacheResult, CacheOptions, CacheStats, CacheError } from './cache-interfaces';
import { storage } from '../storage';
import { getEnvironment } from '../oauth-config';
import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export interface CacheEntry {
  id: number;
  key: string;
  contentHash: string;
  provider: string;
  tags: string[];
  filePath?: string;
  fileSize: number;
  ttl: number;
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
  metadata: any;
}

/**
 * Database-first cache implementation with file system storage
 * Enforces database-first + cache-second pattern
 */
export class DatabaseCacheProvider implements ICacheProvider {
  private cacheDir: string;
  private environment: string;
  private maxSize: number;
  private defaultTtl: number;

  constructor(
    cacheType: string = 'unified-cache',
    maxSize: number = 500 * 1024 * 1024 // 500MB default
  ) {
    this.environment = getEnvironment();
    this.cacheDir = path.join(process.cwd(), 'persistent-cache', this.environment, cacheType);
    this.maxSize = this.environment === 'production' ? 5 * 1024 * 1024 * 1024 : maxSize; // 5GB prod
    this.defaultTtl = 30 * 24 * 60 * 60 * 1000; // 30 days
    this.ensureCacheDirectory();
  }

  /**
   * Read from cache with automatic usage tracking
   */
  async read<T>(key: string): Promise<CacheResult<T>> {
    try {
      const contentHash = this.generateContentHash(key);
      
      // 1. Check database for cache entry
      const entry = await storage.getCacheEntry(contentHash);
      if (!entry) {
        return { data: null, hit: false, key };
      }

      // 2. Check if expired
      if (this.isExpired(entry)) {
        await this.delete(key);
        return { data: null, hit: false, key };
      }

      // 3. Read data (file or database)
      const data = await this.readCacheData<T>(entry);
      if (!data) {
        await this.delete(key);
        return { data: null, hit: false, key };
      }

      // 4. Update usage statistics
      await storage.updateCacheUsage(entry.id);

      return {
        data,
        hit: true,
        key,
        metadata: {
          ttl: entry.ttl,
          createdAt: entry.createdAt,
          lastUsed: new Date(),
          usageCount: entry.usageCount + 1,
          contentHash: entry.contentHash,
          provider: entry.provider,
          fileSize: entry.fileSize,
          tags: entry.tags
        }
      };

    } catch (error) {
      console.error(`[DatabaseCache] Read error for key ${key}:`, error);
      return { data: null, hit: false, key };
    }
  }

  /**
   * Write to cache with enforced database-first pattern
   */
  async write<T>(key: string, value: T, options: CacheOptions): Promise<void> {
    try {
      const contentHash = this.generateContentHash(key);
      const ttl = options.ttl || this.defaultTtl;
      const tags = options.tags || [];
      
      // Serialize data
      const serializedData = JSON.stringify(value);
      const fileSize = Buffer.byteLength(serializedData, 'utf8');
      
      // Check cache size limits
      await this.ensureCacheSpace(fileSize);

      // 1. ENFORCE: Write to database FIRST
      const entry: Partial<CacheEntry> = {
        key,
        contentHash,
        provider: options.metadata?.provider || 'unknown',
        tags,
        fileSize,
        ttl,
        createdAt: new Date(),
        lastUsed: new Date(),
        usageCount: 0,
        metadata: options.metadata || {}
      };

      // Write to database first - this MUST succeed before cache write
      const dbEntry = await storage.createCacheEntry(entry);
      
      // 2. Then write to file cache
      const filePath = this.getFilePath(contentHash);
      entry.filePath = filePath;
      
      await fs.writeFile(filePath, serializedData, 'utf8');
      
      // 3. Update database with file path
      await storage.updateCacheEntry(dbEntry.id, { filePath });

      console.log(`[DatabaseCache] Successfully cached key ${key.substring(0, 12)}... (${fileSize} bytes)`);

    } catch (error) {
      throw new CacheError(`Failed to write cache for key: ${key}`, 'write', key, error as Error);
    }
  }

  /**
   * Delete from cache and database atomically
   */
  async delete(key: string): Promise<boolean> {
    try {
      const contentHash = this.generateContentHash(key);
      const entry = await storage.getCacheEntry(contentHash);
      
      if (!entry) return false;

      // Delete file if exists
      if (entry.filePath) {
        try {
          await fs.unlink(entry.filePath);
        } catch (error) {
          console.warn(`[DatabaseCache] File deletion failed for ${entry.filePath}:`, error);
        }
      }

      // Delete from database
      await storage.deleteCacheEntry(entry.id);
      
      return true;
    } catch (error) {
      console.error(`[DatabaseCache] Delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const contentHash = this.generateContentHash(key);
      const entry = await storage.getCacheEntry(contentHash);
      return entry !== null && !this.isExpired(entry);
    } catch (error) {
      return false;
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidate(pattern: string): Promise<number> {
    try {
      const entries = await storage.getCacheEntriesByPattern(pattern);
      let deletedCount = 0;

      for (const entry of entries) {
        if (await this.delete(entry.key)) {
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error(`[DatabaseCache] Invalidate error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate cache entries by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      const entries = await storage.getCacheEntriesByTags(tags);
      let deletedCount = 0;

      for (const entry of entries) {
        if (await this.delete(entry.key)) {
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error(`[DatabaseCache] Invalidate by tags error:`, error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const stats = await storage.getCacheStats();
      
      return {
        hitRate: stats.totalRequests > 0 ? (stats.totalHits / stats.totalRequests) * 100 : 0,
        totalRequests: stats.totalRequests,
        totalHits: stats.totalHits,
        totalMisses: stats.totalMisses,
        totalSize: stats.totalSize,
        entryCount: stats.entryCount,
        oldestEntry: stats.oldestEntry,
        newestEntry: stats.newestEntry
      };
    } catch (error) {
      console.error('[DatabaseCache] Stats error:', error);
      return {
        hitRate: 0,
        totalRequests: 0,
        totalHits: 0,
        totalMisses: 0,
        totalSize: 0,
        entryCount: 0
      };
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      // Delete all files
      const entries = await storage.getAllCacheEntries();
      for (const entry of entries) {
        if (entry.filePath) {
          try {
            await fs.unlink(entry.filePath);
          } catch (error) {
            console.warn(`[DatabaseCache] File deletion failed: ${error}`);
          }
        }
      }

      // Clear database
      await storage.clearAllCacheEntries();
      
      console.log('[DatabaseCache] All cache entries cleared');
    } catch (error) {
      throw new CacheError('Failed to clear cache', 'clear', undefined, error as Error);
    }
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    try {
      const expiredEntries = await storage.getExpiredCacheEntries();
      let cleanedCount = 0;

      for (const entry of expiredEntries) {
        if (await this.delete(entry.key)) {
          cleanedCount++;
        }
      }

      console.log(`[DatabaseCache] Cleaned up ${cleanedCount} expired entries`);
      return cleanedCount;
    } catch (error) {
      console.error('[DatabaseCache] Cleanup error:', error);
      return 0;
    }
  }

  /**
   * Private helper methods
   */
  private generateContentHash(key: string): string {
    return createHash('sha256').update(key.toLowerCase().trim()).digest('hex');
  }

  private getFilePath(contentHash: string): string {
    return path.join(this.cacheDir, `${contentHash}.cache`);
  }

  private async ensureCacheDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.error(`[DatabaseCache] Failed to create cache directory:`, error);
    }
  }

  private async ensureCacheSpace(requiredSize: number): Promise<void> {
    const stats = await this.getStats();
    
    if (stats.totalSize + requiredSize > this.maxSize) {
      console.log(`[DatabaseCache] Cache size limit reached, cleaning up...`);
      await this.cleanup();
      
      // If still over limit, remove oldest entries
      const remainingStats = await this.getStats();
      if (remainingStats.totalSize + requiredSize > this.maxSize) {
        await this.removeOldestEntries(requiredSize);
      }
    }
  }

  private async removeOldestEntries(requiredSize: number): Promise<void> {
    const oldestEntries = await storage.getOldestCacheEntries(10); // Remove up to 10 oldest
    let freedSpace = 0;

    for (const entry of oldestEntries) {
      if (await this.delete(entry.key)) {
        freedSpace += entry.fileSize;
        if (freedSpace >= requiredSize) break;
      }
    }
  }

  private async readCacheData<T>(entry: CacheEntry): Promise<T | null> {
    try {
      if (entry.filePath) {
        const data = await fs.readFile(entry.filePath, 'utf8');
        return JSON.parse(data) as T;
      } else {
        // Fallback to database storage for small data
        return entry.metadata.data as T;
      }
    } catch (error) {
      console.error(`[DatabaseCache] Failed to read cache data:`, error);
      return null;
    }
  }

  private isExpired(entry: CacheEntry): boolean {
    const now = Date.now();
    const expiryTime = entry.createdAt.getTime() + entry.ttl;
    return now > expiryTime;
  }
}