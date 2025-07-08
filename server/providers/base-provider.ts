/**
 * Base Provider Architecture
 * Common pattern for all plug-and-play providers (email, voice, video, etc.)
 */

export interface ProviderConfig {
  name: string;
  enabled: boolean;
  priority: number;
  timeout?: number; // Request timeout in milliseconds
  maxRetries?: number; // Max retry attempts for network failures
  retryDelay?: number; // Delay between retries in milliseconds
}

export interface ProviderStatus {
  name: string;
  available: boolean;
  healthy: boolean;
  message?: string;
  lastChecked: Date;
  capabilities?: Record<string, any>;
  metrics?: {
    successRate?: number;
    averageResponseTime?: number;
    totalRequests?: number;
    failedRequests?: number;
  };
}

/**
 * Base abstract class for all providers
 * Implements common functionality like retry logic, timeout handling, etc.
 */
export abstract class BaseProvider<TConfig extends ProviderConfig = ProviderConfig> {
  protected config: TConfig;
  private defaultTimeout = 30000; // 30 seconds
  private defaultMaxRetries = 3;
  private defaultRetryDelay = 1000; // 1 second
  
  // Metrics tracking
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalResponseTime: 0,
    lastRequestTime: new Date(),
  };
  
  // Health check tracking
  private lastHealthCheck: Date = new Date(0);
  private healthCheckInterval = 5 * 60 * 1000; // 5 minutes
  private healthStatus: boolean = false;

  constructor(config: TConfig) {
    this.config = {
      ...config,
      timeout: config.timeout || this.defaultTimeout,
      maxRetries: config.maxRetries || this.defaultMaxRetries,
      retryDelay: config.retryDelay || this.defaultRetryDelay,
    };
    
    // Validate config on construction
    this.validateConfig(config);
  }

  /**
   * Get provider name
   */
  abstract get name(): string;

  /**
   * Check if provider is properly configured and available
   */
  abstract checkAvailability(): Promise<boolean>;

  /**
   * Get provider status with metrics
   */
  async getStatus(): Promise<ProviderStatus> {
    const now = new Date();
    const needsHealthCheck = now.getTime() - this.lastHealthCheck.getTime() > this.healthCheckInterval;
    
    if (needsHealthCheck) {
      try {
        this.healthStatus = await this.checkAvailability();
        this.lastHealthCheck = now;
      } catch (error) {
        this.healthStatus = false;
        this.log('error', 'Health check failed', error);
      }
    }
    
    const avgResponseTime = this.metrics.totalRequests > 0 
      ? this.metrics.totalResponseTime / this.metrics.totalRequests 
      : 0;
    
    const successRate = this.metrics.totalRequests > 0 
      ? this.metrics.successfulRequests / this.metrics.totalRequests 
      : 0;
    
    return {
      name: this.name,
      available: this.config.enabled,
      healthy: this.healthStatus,
      message: this.healthStatus ? 'Provider is healthy' : 'Provider health check failed',
      lastChecked: this.lastHealthCheck,
      metrics: {
        successRate,
        averageResponseTime: avgResponseTime,
        totalRequests: this.metrics.totalRequests,
        failedRequests: this.metrics.failedRequests,
      }
    };
  }
  
  /**
   * Validate provider configuration
   */
  protected abstract validateConfig(config: TConfig): void;

  /**
   * Execute operation with retry logic for network failures
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;
    const startTime = Date.now();
    this.metrics.totalRequests++;
    
    for (let attempt = 1; attempt <= this.config.maxRetries!; attempt++) {
      try {
        // Execute with timeout
        const result = await this.executeWithTimeout(operation, operationName);
        
        // Track successful request
        const responseTime = Date.now() - startTime;
        this.metrics.successfulRequests++;
        this.metrics.totalResponseTime += responseTime;
        this.metrics.lastRequestTime = new Date();
        
        this.log('info', `${operationName} completed successfully`, { responseTime });
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Only retry on network errors
        if (!this.isNetworkError(error)) {
          this.metrics.failedRequests++;
          throw error;
        }

        this.log('warn', 
          `${operationName} attempt ${attempt} failed with network error`, 
          { error: lastError.message, attempt }
        );

        // Don't retry if this was the last attempt
        if (attempt === this.config.maxRetries) {
          break;
        }

        // Wait before retry with exponential backoff
        const delay = this.config.retryDelay! * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }

    this.metrics.failedRequests++;
    throw new Error(
      `${this.name} provider: ${operationName} failed after ${this.config.maxRetries} attempts. Last error: ${lastError?.message}`
    );
  }

  /**
   * Execute operation with timeout
   */
  protected async executeWithTimeout<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${this.name} provider: ${operationName} timed out after ${this.config.timeout}ms`));
      }, this.config.timeout!);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  /**
   * Check if error is a network error that should be retried
   */
  protected isNetworkError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';
    
    // Common network error patterns
    const networkErrors = [
      'econnrefused',
      'econnreset',
      'etimedout',
      'enotfound',
      'enetunreach',
      'econnaborted',
      'timeout',
      'network',
      'fetch failed',
      'socket hang up'
    ];
    
    return networkErrors.some(pattern => 
      errorMessage.includes(pattern) || errorCode.includes(pattern)
    );
  }

  /**
   * Sleep utility for retry delays
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log provider activity
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.name}] ${message}`;
    
    switch (level) {
      case 'info':
        console.log(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'error':
        console.error(logMessage, data || '');
        break;
    }
  }
}

/**
 * Base factory for managing providers
 */
export abstract class BaseProviderFactory<
  TProvider extends BaseProvider,
  TConfig extends ProviderConfig = ProviderConfig
> {
  protected providers: Map<string, TProvider> = new Map();
  protected activeProviderName?: string;

  /**
   * Initialize all configured providers
   */
  abstract initialize(): void;

  /**
   * Get the active provider based on configuration
   */
  getActiveProvider(): TProvider | null {
    if (!this.activeProviderName) {
      this.selectActiveProvider();
    }

    if (!this.activeProviderName) {
      return null;
    }

    return this.providers.get(this.activeProviderName) || null;
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): TProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all providers
   */
  getAllProviders(): TProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get all provider statuses
   */
  async getAllStatuses(): Promise<ProviderStatus[]> {
    const statuses: ProviderStatus[] = [];
    
    for (const provider of this.providers.values()) {
      try {
        const status = await provider.getStatus();
        statuses.push(status);
      } catch (error) {
        statuses.push({
          name: provider.name,
          available: false,
          message: `Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }
    
    return statuses;
  }

  /**
   * Select active provider based on availability and priority
   */
  protected async selectActiveProvider(): Promise<void> {
    const availableProviders: Array<{ name: string; priority: number }> = [];

    for (const [name, provider] of this.providers) {
      try {
        const available = await provider.checkAvailability();
        if (available) {
          availableProviders.push({
            name,
            priority: (provider as any).config.priority || 0
          });
        }
      } catch (error) {
        console.warn(`Provider ${name} availability check failed:`, error);
      }
    }

    // Sort by priority (higher number = higher priority)
    availableProviders.sort((a, b) => b.priority - a.priority);

    if (availableProviders.length > 0) {
      this.activeProviderName = availableProviders[0].name;
      console.log(`Selected ${this.constructor.name} provider: ${this.activeProviderName}`);
    } else {
      console.warn(`No available providers found for ${this.constructor.name}`);
    }
  }
}