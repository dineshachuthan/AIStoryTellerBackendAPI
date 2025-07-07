/**
 * Audio Storage Provider System
 * Plug-and-play architecture for different storage backends
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { SignedUrlOptions, AUDIO_STORAGE_PROVIDERS, AudioStorageProviderConfig } from './audio-storage-config';

/**
 * Base Audio Storage Provider Abstract Class
 */
export abstract class BaseAudioStorageProvider {
  protected config: AudioStorageProviderConfig;
  
  constructor(config: AudioStorageProviderConfig) {
    this.config = config;
  }

  abstract get name(): string;
  abstract generateSignedUrl(relativePath: string, options: SignedUrlOptions): Promise<string>;
  abstract uploadAudio(buffer: Buffer, relativePath: string): Promise<string>;
  abstract deleteAudio(relativePath: string): Promise<void>;
  abstract validateAccess(relativePath: string): Promise<boolean>;
  abstract getStatus(): Promise<{
    name: string;
    available: boolean;
    baseUrl: string;
    message?: string;
  }>;
}

/**
 * Replit Audio Storage Provider
 * Serves files through Express with JWT token authentication
 */
export class ReplitAudioStorageProvider extends BaseAudioStorageProvider {
  get name(): string {
    return 'Replit';
  }

  async generateSignedUrl(relativePath: string, options: SignedUrlOptions): Promise<string> {
    console.log(`[JWTSecure] generateSignedUrl called with relativePath:`, relativePath, 'options:', options);
    
    // Check if relativePath is valid
    if (!relativePath) {
      throw new Error('relativePath is required for generating signed URL');
    }
    
    // Get external ID for privacy
    const { externalIdService } = await import('./external-id-service');
    const externalId = await externalIdService.getOrCreateExternalId(options.userId);
    
    // Create JWT token payload with correct field names
    const payload = {
      relativePath: relativePath, // JWT endpoint expects 'relativePath'
      userId: options.userId,
      externalId: externalId, // Anonymous ID for external service logging
      purpose: 'external_api_access', // Valid purpose for ElevenLabs
      exp: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes expiry
    };
    
    // Sign the token
    const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
    const token = jwt.sign(payload, JWT_SECRET);
    
    // Return signed URL using the JWT endpoint
    const signedUrl = `${this.config.baseUrl}/api/audio/serve/${token}`;
    console.log(`[JWTSecure] Generated signed URL for ${relativePath} with JWT token`);
    
    return signedUrl;
  }

  async uploadAudio(buffer: Buffer, relativePath: string): Promise<string> {
    // For Replit, files are already stored locally
    // This method would be used for cloud providers
    return relativePath;
  }

  async deleteAudio(relativePath: string): Promise<void> {
    try {
      const fullPath = path.join(process.cwd(), relativePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (error) {
      console.error(`Failed to delete audio file: ${relativePath}`, error);
      // Don't throw - non-critical operation
    }
  }

  async validateAccess(relativePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(process.cwd(), relativePath);
      return fs.existsSync(fullPath);
    } catch (error) {
      return false;
    }
  }

  async getStatus(): Promise<{
    name: string;
    available: boolean;
    baseUrl: string;
    message?: string;
  }> {
    return {
      name: this.name,
      available: true,
      baseUrl: this.config.baseUrl,
      message: 'Replit file system storage operational'
    };
  }
}

/**
 * S3 Audio Storage Provider (Future Implementation)
 */
export class S3AudioStorageProvider extends BaseAudioStorageProvider {
  get name(): string {
    return 'Amazon S3';
  }

  async generateSignedUrl(relativePath: string, options: SignedUrlOptions): Promise<string> {
    throw new Error('S3 Audio Storage Provider not yet implemented');
  }

  async uploadAudio(buffer: Buffer, relativePath: string): Promise<string> {
    throw new Error('S3 Audio Storage Provider not yet implemented');
  }

  async deleteAudio(relativePath: string): Promise<void> {
    throw new Error('S3 Audio Storage Provider not yet implemented');
  }

  async validateAccess(relativePath: string): Promise<boolean> {
    throw new Error('S3 Audio Storage Provider not yet implemented');
  }

  async getStatus(): Promise<{
    name: string;
    available: boolean;
    baseUrl: string;
    message?: string;
  }> {
    return {
      name: this.name,
      available: false,
      baseUrl: this.config.baseUrl,
      message: 'S3 provider not yet implemented'
    };
  }
}

/**
 * Azure Audio Storage Provider (Future Implementation)
 */
export class AzureAudioStorageProvider extends BaseAudioStorageProvider {
  get name(): string {
    return 'Azure Blob Storage';
  }

  async generateSignedUrl(relativePath: string, options: SignedUrlOptions): Promise<string> {
    throw new Error('Azure Audio Storage Provider not yet implemented');
  }

  async uploadAudio(buffer: Buffer, relativePath: string): Promise<string> {
    throw new Error('Azure Audio Storage Provider not yet implemented');
  }

  async deleteAudio(relativePath: string): Promise<void> {
    throw new Error('Azure Audio Storage Provider not yet implemented');
  }

  async validateAccess(relativePath: string): Promise<boolean> {
    throw new Error('Azure Audio Storage Provider not yet implemented');
  }

  async getStatus(): Promise<{
    name: string;
    available: boolean;
    baseUrl: string;
    message?: string;
  }> {
    return {
      name: this.name,
      available: false,
      baseUrl: this.config.baseUrl,
      message: 'Azure provider not yet implemented'
    };
  }
}

/**
 * Audio Storage Factory
 * Creates and manages audio storage providers
 */
export class AudioStorageFactory {
  private providers: Map<string, BaseAudioStorageProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize Replit provider
    console.log(`[AudioStorage] Initializing Replit provider with baseUrl: ${AUDIO_STORAGE_PROVIDERS.replit.baseUrl}`);
    this.providers.set('replit', new ReplitAudioStorageProvider(AUDIO_STORAGE_PROVIDERS.replit));

    // Initialize S3 provider (if configured)
    if (AUDIO_STORAGE_PROVIDERS.s3.enabled) {
      this.providers.set('s3', new S3AudioStorageProvider(AUDIO_STORAGE_PROVIDERS.s3));
    }

    // Initialize Azure provider (if configured)
    if (AUDIO_STORAGE_PROVIDERS.azure.enabled) {
      this.providers.set('azure', new AzureAudioStorageProvider(AUDIO_STORAGE_PROVIDERS.azure));
    }
  }

  /**
   * Get the active audio storage provider based on configuration
   * @returns Active provider instance
   */
  getActiveProvider(): BaseAudioStorageProvider {
    const sortedProviders = Object.entries(AUDIO_STORAGE_PROVIDERS)
      .filter(([_, config]) => config.enabled)
      .sort((a, b) => a[1].priority - b[1].priority);

    if (sortedProviders.length === 0) {
      throw new Error('No audio storage providers are enabled');
    }

    const [activeProviderName] = sortedProviders[0];
    const provider = this.providers.get(activeProviderName);

    if (!provider) {
      throw new Error(`Audio storage provider ${activeProviderName} not found`);
    }

    return provider;
  }

  /**
   * Get all available providers
   * @returns Array of all provider instances
   */
  getAllProviders(): BaseAudioStorageProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider by name
   * @param name Provider name
   * @returns Provider instance or undefined
   */
  getProvider(name: string): BaseAudioStorageProvider | undefined {
    return this.providers.get(name);
  }
}

// Create singleton instance
export const audioStorageFactory = new AudioStorageFactory();