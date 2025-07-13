/**
 * Unified Cache Service
 * Provides high-level caching functionality using the DatabaseCacheProvider
 */

import { DatabaseCacheProvider } from './database-cache-provider.ts';
import { storage } from '../storage.ts';
import crypto from 'crypto';

export class CacheService {
  private static instance: CacheService;
  private cacheProvider: DatabaseCacheProvider;

  private constructor() {
    this.cacheProvider = new DatabaseCacheProvider(
      'unified-cache',
      process.env.NODE_ENV === 'production' ? 2 * 1024 * 1024 * 1024 : 500 * 1024 * 1024
    );
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Story Analysis Caching
  async getCachedAnalysis(content: string): Promise<any | null> {
    const key = `story-analysis:${this.generateContentHash(content)}`;
    const result = await this.cacheProvider.read(key);
    return result.hit ? result.data : null;
  }

  async cacheAnalysis(content: string, analysis: any): Promise<void> {
    const key = `story-analysis:${this.generateContentHash(content)}`;
    await this.cacheProvider.write(key, analysis, {
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
      tags: ['story-analysis']
    });
  }

  // Audio Caching
  async getCachedAudio(text: string, options: any): Promise<any | null> {
    const key = `audio:${this.generateContentHash(text + JSON.stringify(options))}`;
    const result = await this.cacheProvider.read(key);
    return result.hit ? result.data : null;
  }

  async cacheAudio(text: string, options: any, audioData: any): Promise<void> {
    const key = `audio:${this.generateContentHash(text + JSON.stringify(options))}`;
    await this.cacheProvider.write(key, audioData, {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      tags: ['audio', options.provider || 'openai']
    });
  }

  // Character Image Caching
  async getCachedCharacterImage(characterData: any): Promise<string | null> {
    const key = `character-image:${this.generateContentHash(JSON.stringify(characterData))}`;
    const result = await this.cacheProvider.read(key);
    return result.hit ? (result.data as string) : null;
  }

  async cacheCharacterImage(characterData: any, imageUrl: string): Promise<void> {
    const key = `character-image:${this.generateContentHash(JSON.stringify(characterData))}`;
    await this.cacheProvider.write(key, imageUrl, {
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
      tags: ['character-image', 'openai']
    });
  }

  // Cache Management
  async getAllCacheStats(): Promise<any> {
    return await this.cacheProvider.getStats();
  }

  async cleanOldCacheFiles(): Promise<number> {
    return await this.cacheProvider.cleanup();
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    return await this.cacheProvider.invalidateByTags(tags);
  }

  async clear(): Promise<void> {
    await this.cacheProvider.clear();
  }

  // Content Hash Generation
  private generateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();

// Legacy function exports for compatibility during migration
export async function getCachedAnalysis(content: string): Promise<any | null> {
  return await cacheService.getCachedAnalysis(content);
}

export async function cacheAnalysis(content: string, analysis: any): Promise<void> {
  await cacheService.cacheAnalysis(content, analysis);
}

export async function getCachedAudio(text: string, options: any = {}): Promise<any | null> {
  return await cacheService.getCachedAudio(text, options);
}

export async function cacheAudio(text: string, options: any, audioData: any): Promise<void> {
  await cacheService.cacheAudio(text, options, audioData);
}

export async function getCachedCharacterImage(characterData: any): Promise<string | null> {
  return await cacheService.getCachedCharacterImage(characterData);
}

export async function cacheCharacterImage(characterData: any, imageUrl: string): Promise<void> {
  await cacheService.cacheCharacterImage(characterData, imageUrl);
}

export async function getAllCacheStats(): Promise<any> {
  return await cacheService.getAllCacheStats();
}

export async function cleanOldCacheFiles(): Promise<number> {
  return await cacheService.cleanOldCacheFiles();
}