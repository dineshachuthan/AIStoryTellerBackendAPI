/**
 * Abstract Base Provider with Mandatory Caching
 * Enforces database-first + cache-second pattern for all external integrations
 */

import { ICacheProvider, CacheResult, CacheOptions, CacheError, DatabaseFirstViolationError } from './cache-interfaces';
import { createHash } from 'crypto';

export interface ProviderConfig {
  name: string;
  timeout: number;
  retryCount: number;
  retryDelays: number[]; // [1000, 2000, 4000] for 1s, 2s, 4s
  enableCaching: boolean;
  defaultTtl: number;
}

export interface ExternalApiContext {
  operation: string;
  provider: string;
  attempt: number;
  totalAttempts: number;
  startTime: Date;
}

/**
 * Abstract base class that all external providers must extend
 * Enforces unified caching, retry, timeout, and error handling patterns
 */
export abstract class BaseCachedProvider {
  protected cache: ICacheProvider;
  protected config: ProviderConfig;
  protected stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
    timeouts: 0,
    retries: 0
  };

  constructor(cache: ICacheProvider, config: ProviderConfig) {
    this.cache = cache;
    this.config = config;
  }

  /**
   * Abstract methods that each provider must implement
   */
  protected abstract callExternalApi<T>(context: ExternalApiContext, ...args: any[]): Promise<T>;
  protected abstract writeToDatabaseFirst<T>(key: string, data: T, options: CacheOptions): Promise<void>;
  protected abstract readFromDatabase<T>(key: string): Promise<T | null>;
  protected abstract generateCacheKey(...args: any[]): string;
  protected abstract validateResponse<T>(data: T): boolean;

  /**
   * Main execution method with enforced database-first + cache-second pattern
   */
  protected async executeWithCache<T>(
    operation: string,
    options: CacheOptions,
    ...args: any[]
  ): Promise<T> {
    this.stats.totalRequests++;
    const key = this.generateCacheKey(...args);
    
    try {
      // 1. Check cache first
      const cacheResult = await this.checkCache<T>(key);
      if (cacheResult.hit && cacheResult.data) {
        this.stats.cacheHits++;
        this.logCacheHit(operation, key, cacheResult);
        return cacheResult.data;
      }

      this.stats.cacheMisses++;
      this.logCacheMiss(operation, key);

      // 2. Cache miss - call external API with retry/timeout
      const data = await this.callWithRetryAndTimeout<T>(operation, ...args);

      // 3. ENFORCE: Database write FIRST
      await this.writeToDatabaseFirst(key, data, options);
      
      // 4. Then update cache
      await this.updateCache(key, data, options);

      this.logSuccessfulExecution(operation, key, data);
      return data;

    } catch (error) {
      this.stats.errors++;
      this.handleProviderError(operation, key, error as Error);
      throw error;
    }
  }

  /**
   * Check cache with automatic usage tracking
   */
  private async checkCache<T>(key: string): Promise<CacheResult<T>> {
    try {
      if (!this.config.enableCaching) {
        return { data: null, hit: false, key };
      }
      return await this.cache.read<T>(key);
    } catch (error) {
      this.logCacheError('read', key, error as Error);
      return { data: null, hit: false, key };
    }
  }

  /**
   * Update cache after successful database write
   */
  private async updateCache<T>(key: string, data: T, options: CacheOptions): Promise<void> {
    try {
      if (!this.config.enableCaching) return;
      
      await this.cache.write(key, data, {
        ...options,
        ttl: options.ttl || this.config.defaultTtl
      });
    } catch (error) {
      // Cache write failure is not fatal - log but don't throw
      this.logCacheError('write', key, error as Error);
    }
  }

  /**
   * Call external API with standardized retry and timeout logic
   */
  private async callWithRetryAndTimeout<T>(operation: string, ...args: any[]): Promise<T> {
    const maxAttempts = this.config.retryCount + 1;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const context: ExternalApiContext = {
        operation,
        provider: this.config.name,
        attempt,
        totalAttempts: maxAttempts,
        startTime: new Date()
      };

      try {
        this.logAttemptStart(context);
        
        // Execute with timeout
        const result = await this.withTimeout(
          () => this.callExternalApi<T>(context, ...args),
          this.config.timeout
        );

        // Validate response
        if (!this.validateResponse(result)) {
          throw new Error(`Invalid response from ${this.config.name} API`);
        }

        this.logAttemptSuccess(context, result);
        return result;

      } catch (error) {
        lastError = error as Error;
        this.logAttemptError(context, lastError);

        // Don't retry on final attempt
        if (attempt === maxAttempts) {
          break;
        }

        // Wait before retry with exponential backoff
        const delay = this.config.retryDelays[attempt - 1] || 1000;
        this.stats.retries++;
        this.logRetryDelay(context, delay);
        await this.sleep(delay);
      }
    }

    this.stats.timeouts++;
    throw new Error(`${this.config.name} API failed after ${maxAttempts} attempts. Last error: ${lastError!.message}`);
  }

  /**
   * Execute operation with timeout
   */
  private async withTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate content-based cache key
   */
  protected generateContentHash(content: string): string {
    return createHash('sha256').update(content.toLowerCase().trim()).digest('hex');
  }

  /**
   * Get provider statistics
   */
  getStats() {
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.cacheHits / this.stats.totalRequests) * 100 
      : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      provider: this.config.name
    };
  }

  /**
   * Logging methods for standardized error tracking
   */
  private logCacheHit(operation: string, key: string, result: CacheResult<any>): void {
    console.log(`[${this.config.name}] Cache HIT for ${operation}: ${key.substring(0, 12)}... (usage: ${result.metadata?.usageCount || 0})`);
  }

  private logCacheMiss(operation: string, key: string): void {
    console.log(`[${this.config.name}] Cache MISS for ${operation}: ${key.substring(0, 12)}... - calling external API`);
  }

  private logAttemptStart(context: ExternalApiContext): void {
    console.log(`[${context.provider}] Starting ${context.operation} attempt ${context.attempt}/${context.totalAttempts}`);
  }

  private logAttemptSuccess(context: ExternalApiContext, result: any): void {
    const duration = Date.now() - context.startTime.getTime();
    console.log(`[${context.provider}] ${context.operation} succeeded in ${duration}ms (attempt ${context.attempt})`);
  }

  private logAttemptError(context: ExternalApiContext, error: Error): void {
    const duration = Date.now() - context.startTime.getTime();
    console.error(`[${context.provider}] ${context.operation} failed in ${duration}ms (attempt ${context.attempt}): ${error.message}`);
  }

  private logRetryDelay(context: ExternalApiContext, delay: number): void {
    console.log(`[${context.provider}] Retrying ${context.operation} in ${delay}ms (attempt ${context.attempt + 1}/${context.totalAttempts})`);
  }

  private logSuccessfulExecution(operation: string, key: string, data: any): void {
    console.log(`[${this.config.name}] Successfully executed ${operation} and cached result: ${key.substring(0, 12)}...`);
  }

  private logCacheError(operation: string, key: string, error: Error): void {
    console.warn(`[${this.config.name}] Cache ${operation} error for key ${key.substring(0, 12)}...: ${error.message}`);
  }

  private handleProviderError(operation: string, key: string, error: Error): void {
    console.error(`[${this.config.name}] Provider error in ${operation} for key ${key.substring(0, 12)}...:`);
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
  }
}