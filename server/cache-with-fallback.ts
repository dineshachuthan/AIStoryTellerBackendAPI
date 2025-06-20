import * as fs from 'fs/promises';
import * as path from 'path';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  retryAttempts?: number;
  cleanupOnError?: boolean;
}

export class CacheWithFallback<T> {
  private cacheDir: string;
  private defaultOptions: CacheOptions = {
    ttl: 24 * 60 * 60 * 1000, // 24 hours default
    retryAttempts: 3,
    cleanupOnError: true
  };

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
    this.ensureCacheDir();
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create cache directory:', error);
    }
  }

  /**
   * Universal cache-with-fallback method
   * @param key - Unique cache key
   * @param sourceFunction - Function to call if cache misses/fails
   * @param options - Cache options
   */
  async getOrSet(
    key: string, 
    sourceFunction: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    const cacheFilePath = path.join(this.cacheDir, `${key}.json`);
    const metadataPath = path.join(this.cacheDir, `${key}.meta.json`);

    // Try to get from cache first
    try {
      const cachedData = await this.getFromCache(cacheFilePath, metadataPath, opts.ttl!);
      if (cachedData !== null) {
        console.log(`Cache hit for key: ${key}`);
        return cachedData;
      }
    } catch (error) {
      console.warn(`Cache read failed for key ${key}:`, error);
      // Clean up corrupted cache files
      if (opts.cleanupOnError) {
        await this.cleanupCorruptedCache(cacheFilePath, metadataPath);
      }
    }

    // Cache miss or error - go to source
    console.log(`Cache miss for key: ${key}, fetching from source`);
    
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= opts.retryAttempts!; attempt++) {
      try {
        const sourceData = await sourceFunction();
        
        // Cache the result for future use
        await this.setCache(cacheFilePath, metadataPath, sourceData);
        console.log(`Successfully cached data for key: ${key}`);
        
        return sourceData;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Source function failed for key ${key}, attempt ${attempt}/${opts.retryAttempts}:`, error);
        
        if (attempt < opts.retryAttempts!) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // All retries failed
    throw new Error(`Failed to get data for key ${key} after ${opts.retryAttempts} attempts. Last error: ${lastError?.message}`);
  }

  private async getFromCache(cacheFilePath: string, metadataPath: string, ttl: number): Promise<T | null> {
    try {
      // Check if both cache file and metadata exist
      const [cacheExists, metaExists] = await Promise.all([
        this.fileExists(cacheFilePath),
        this.fileExists(metadataPath)
      ]);

      if (!cacheExists || !metaExists) {
        return null;
      }

      // Read metadata to check TTL
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);
      
      const now = Date.now();
      if (now - metadata.timestamp > ttl) {
        console.log(`Cache expired for ${path.basename(cacheFilePath)}`);
        return null;
      }

      // Read and return cached data
      const cacheContent = await fs.readFile(cacheFilePath, 'utf8');
      return JSON.parse(cacheContent);
    } catch (error) {
      throw new Error(`Cache read error: ${error}`);
    }
  }

  private async setCache(cacheFilePath: string, metadataPath: string, data: T): Promise<void> {
    try {
      await this.ensureCacheDir();
      
      // Write data and metadata atomically
      const metadata = {
        timestamp: Date.now(),
        key: path.basename(cacheFilePath, '.json')
      };

      await Promise.all([
        fs.writeFile(cacheFilePath, JSON.stringify(data, null, 2)),
        fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
      ]);
    } catch (error) {
      console.error(`Failed to cache data:`, error);
      // Don't throw - cache failure shouldn't break the main flow
    }
  }

  private async cleanupCorruptedCache(cacheFilePath: string, metadataPath: string): Promise<void> {
    try {
      await Promise.all([
        this.safeDelete(cacheFilePath),
        this.safeDelete(metadataPath)
      ]);
      console.log(`Cleaned up corrupted cache files for ${path.basename(cacheFilePath)}`);
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async safeDelete(filePath: string): Promise<void> {
    try {
      if (await this.fileExists(filePath)) {
        await fs.unlink(filePath);
      }
    } catch (error) {
      console.warn(`Could not delete ${filePath}:`, error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      await Promise.all(
        files.map(file => this.safeDelete(path.join(this.cacheDir, file)))
      );
      console.log(`Cleared all cache entries from ${this.cacheDir}`);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Remove expired cache entries
   */
  async cleanupExpired(ttl: number = this.defaultOptions.ttl!): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      const metaFiles = files.filter(f => f.endsWith('.meta.json'));
      
      const now = Date.now();
      const expiredFiles: string[] = [];

      for (const metaFile of metaFiles) {
        try {
          const metaPath = path.join(this.cacheDir, metaFile);
          const metaContent = await fs.readFile(metaPath, 'utf8');
          const metadata = JSON.parse(metaContent);
          
          if (now - metadata.timestamp > ttl) {
            const baseKey = metaFile.replace('.meta.json', '');
            expiredFiles.push(`${baseKey}.json`, metaFile);
          }
        } catch (error) {
          // Corrupted metadata - mark for deletion
          expiredFiles.push(metaFile);
        }
      }

      await Promise.all(
        expiredFiles.map(file => this.safeDelete(path.join(this.cacheDir, file)))
      );

      if (expiredFiles.length > 0) {
        console.log(`Cleaned up ${expiredFiles.length} expired cache files`);
      }
    } catch (error) {
      console.error('Error during expired cache cleanup:', error);
    }
  }
}

// Create singleton instances for different cache types
const cacheDir = path.join(process.cwd(), 'persistent-cache', 'data');
export const audioCache = new CacheWithFallback<any>(path.join(cacheDir, 'audio'));
export const imageCache = new CacheWithFallback<any>(path.join(cacheDir, 'images'));
export const analysisCache = new CacheWithFallback<any>(path.join(cacheDir, 'analysis'));
export const storyCache = new CacheWithFallback<any>(path.join(cacheDir, 'stories'));