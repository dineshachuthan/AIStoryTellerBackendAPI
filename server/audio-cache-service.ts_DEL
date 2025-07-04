import { storage } from './storage';
import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { getEnvironment } from './oauth-config';

export interface AudioCacheEntry {
  id: number;
  contentHash: string;
  audioUrl: string;
  voiceId: string;
  emotion: string;
  text: string;
  generatedAt: Date;
  lastUsed: Date;
  usageCount: number;
  fileSize: number;
  duration: number;
  provider: string;
  metadata: any;
}

export interface AudioGenerationRequest {
  text: string;
  voiceId: string;
  emotion: string;
  provider: string;
  metadata?: any;
}

export class AudioCacheService {
  private cacheDir: string;
  private maxCacheSize: number;
  private maxCacheAge: number;

  constructor() {
    const env = getEnvironment();
    this.cacheDir = path.join(process.cwd(), 'persistent-cache', 'audio-cache', env);
    this.maxCacheSize = env === 'production' ? 5 * 1024 * 1024 * 1024 : 500 * 1024 * 1024; // 5GB prod, 500MB dev
    this.maxCacheAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  }

  /**
   * Generate content hash for cache key
   */
  private generateContentHash(text: string, voiceId: string, emotion: string): string {
    const content = `${text}:${voiceId}:${emotion}`.toLowerCase();
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Check if audio is cached and return cached entry
   */
  async getCachedAudio(request: AudioGenerationRequest): Promise<AudioCacheEntry | null> {
    try {
      const contentHash = this.generateContentHash(request.text, request.voiceId, request.emotion);
      
      // Check database for cache entry
      const cacheEntry = await storage.getAudioCacheEntry(contentHash);
      
      if (!cacheEntry) {
        return null;
      }

      // Verify file exists
      const filePath = path.join(this.cacheDir, `${contentHash}.mp3`);
      try {
        await fs.access(filePath);
        
        // Update last used timestamp
        await storage.updateAudioCacheUsage(cacheEntry.id);
        
        return cacheEntry;
      } catch {
        // File missing, remove from cache
        await storage.deleteAudioCacheEntry(cacheEntry.id);
        return null;
      }
    } catch (error) {
      console.error('Error checking audio cache:', error);
      return null;
    }
  }

  /**
   * Cache generated audio with metadata
   */
  async cacheAudio(
    request: AudioGenerationRequest, 
    audioBuffer: Buffer, 
    duration: number
  ): Promise<AudioCacheEntry> {
    try {
      const contentHash = this.generateContentHash(request.text, request.voiceId, request.emotion);
      
      // Ensure cache directory exists
      await fs.mkdir(this.cacheDir, { recursive: true });
      
      // Save audio file
      const fileName = `${contentHash}.mp3`;
      const filePath = path.join(this.cacheDir, fileName);
      await fs.writeFile(filePath, audioBuffer);
      
      // Create cache entry in database
      const cacheEntry = await storage.createAudioCacheEntry({
        contentHash,
        audioUrl: `/api/audio-cache/${fileName}`,
        voiceId: request.voiceId,
        emotion: request.emotion,
        text: request.text,
        generatedAt: new Date(),
        lastUsed: new Date(),
        usageCount: 1,
        fileSize: audioBuffer.length,
        duration,
        provider: request.provider,
        metadata: request.metadata || {}
      });

      // Trigger cleanup if needed
      this.scheduleCleanup();
      
      return cacheEntry;
    } catch (error) {
      console.error('Error caching audio:', error);
      throw error;
    }
  }

  /**
   * Cache-first audio generation
   */
  async generateOrGetCachedAudio(
    request: AudioGenerationRequest,
    generateFn: () => Promise<{ buffer: Buffer; duration: number }>
  ): Promise<{ audioUrl: string; cached: boolean; cacheEntry: AudioCacheEntry }> {
    // Check cache first
    const cached = await this.getCachedAudio(request);
    
    if (cached) {
      console.log(`[AudioCache] Cache hit for ${request.emotion} voice ${request.voiceId}`);
      return {
        audioUrl: cached.audioUrl,
        cached: true,
        cacheEntry: cached
      };
    }

    // Generate new audio
    console.log(`[AudioCache] Cache miss, generating new audio for ${request.emotion}`);
    const { buffer, duration } = await generateFn();
    
    // Cache the result
    const cacheEntry = await this.cacheAudio(request, buffer, duration);
    
    return {
      audioUrl: cacheEntry.audioUrl,
      cached: false,
      cacheEntry
    };
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    hitRate: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    return await storage.getAudioCacheStats();
  }

  /**
   * Schedule cache cleanup (non-blocking)
   */
  private scheduleCleanup(): void {
    // Run cleanup in background
    setTimeout(() => {
      this.cleanupCache().catch(error => {
        console.error('Background cache cleanup failed:', error);
      });
    }, 1000);
  }

  /**
   * Clean up expired and oversized cache
   */
  async cleanupCache(): Promise<{
    deletedEntries: number;
    freedSpace: number;
  }> {
    try {
      const stats = await this.getCacheStats();
      let deletedEntries = 0;
      let freedSpace = 0;

      // Delete expired entries
      const expiredEntries = await storage.getExpiredAudioCacheEntries(this.maxCacheAge);
      
      for (const entry of expiredEntries) {
        try {
          const filePath = path.join(this.cacheDir, `${entry.contentHash}.mp3`);
          await fs.unlink(filePath);
          await storage.deleteAudioCacheEntry(entry.id);
          
          deletedEntries++;
          freedSpace += entry.fileSize;
        } catch (error) {
          console.error(`Error deleting cache entry ${entry.id}:`, error);
        }
      }

      // If still over size limit, delete least recently used
      if (stats.totalSize > this.maxCacheSize) {
        const lruEntries = await storage.getLeastRecentlyUsedAudioCache(
          Math.ceil((stats.totalSize - this.maxCacheSize) / (1024 * 1024)) // Convert to MB
        );

        for (const entry of lruEntries) {
          try {
            const filePath = path.join(this.cacheDir, `${entry.contentHash}.mp3`);
            await fs.unlink(filePath);
            await storage.deleteAudioCacheEntry(entry.id);
            
            deletedEntries++;
            freedSpace += entry.fileSize;
          } catch (error) {
            console.error(`Error deleting LRU cache entry ${entry.id}:`, error);
          }
        }
      }

      console.log(`[AudioCache] Cleanup completed: ${deletedEntries} entries deleted, ${Math.round(freedSpace / 1024)} KB freed`);
      
      return { deletedEntries, freedSpace };
    } catch (error) {
      console.error('Error during cache cleanup:', error);
      return { deletedEntries: 0, freedSpace: 0 };
    }
  }

  /**
   * Clear all cache entries
   */
  async clearCache(): Promise<void> {
    try {
      await storage.clearAudioCache();
      
      // Remove all files
      try {
        const files = await fs.readdir(this.cacheDir);
        for (const file of files) {
          if (file.endsWith('.mp3')) {
            await fs.unlink(path.join(this.cacheDir, file));
          }
        }
      } catch (error) {
        console.error('Error clearing cache files:', error);
      }
      
      console.log('[AudioCache] All cache entries cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }
}

export const audioCacheService = new AudioCacheService();