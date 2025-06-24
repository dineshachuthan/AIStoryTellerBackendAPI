import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { db } from './db';
import { characterAssets } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface ImageAssetInfo {
  id: string;
  originalUrl: string;
  localPath: string;
  publicUrl: string;
  mimeType: string;
  size: number;
  expiresAt?: Date;
  createdAt: Date;
}

export class ImageAssetService {
  private readonly ASSETS_DIR = path.join(process.cwd(), 'public', 'cached-images');
  private readonly MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB max
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    this.ensureAssetsDirectory();
  }

  private async ensureAssetsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.ASSETS_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to create assets directory:', error);
    }
  }

  /**
   * Download and cache an image locally, returning a stable public URL
   */
  async cacheImage(originalUrl: string, context: string = 'general'): Promise<ImageAssetInfo> {
    const urlHash = crypto.createHash('sha256').update(originalUrl).digest('hex');
    const assetId = `${context}-${urlHash}`;

    // Check if already cached and valid
    const existing = await this.getAssetInfo(assetId);
    if (existing && await this.isAssetValid(existing)) {
      console.log(`Using cached image asset: ${assetId}`);
      return existing;
    }

    try {
      console.log(`Downloading and caching image: ${originalUrl}`);
      
      // Download the image
      const response = await fetch(originalUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const buffer = await response.arrayBuffer();
      
      if (buffer.byteLength > this.MAX_FILE_SIZE) {
        throw new Error(`Image too large: ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB > 16MB`);
      }

      // Determine file extension
      const extension = this.getExtensionFromMimeType(contentType);
      const filename = `${assetId}.${extension}`;
      const localPath = path.join(this.ASSETS_DIR, filename);
      
      // Save to disk
      await fs.writeFile(localPath, Buffer.from(buffer));
      
      // Create asset info
      const assetInfo: ImageAssetInfo = {
        id: assetId,
        originalUrl,
        localPath,
        publicUrl: `/cached-images/${filename}`,
        mimeType: contentType,
        size: buffer.byteLength,
        expiresAt: new Date(Date.now() + this.CACHE_DURATION),
        createdAt: new Date()
      };

      // Store in database for tracking
      await this.saveAssetInfo(assetInfo);
      
      console.log(`Cached image successfully: ${filename} (${(buffer.byteLength / 1024).toFixed(1)}KB)`);
      return assetInfo;

    } catch (error) {
      console.error(`Failed to cache image ${originalUrl}:`, error);
      throw new Error(`Image caching failed: ${error.message}`);
    }
  }

  /**
   * Get cached asset info by ID
   */
  private async getAssetInfo(assetId: string): Promise<ImageAssetInfo | null> {
    try {
      const [asset] = await db
        .select()
        .from(characterAssets)
        .where(eq(characterAssets.id, assetId))
        .limit(1);

      if (!asset) return null;

      return {
        id: asset.id,
        originalUrl: asset.originalImageUrl || '',
        localPath: asset.cachedImagePath || '',
        publicUrl: asset.publicImageUrl || '',
        mimeType: asset.metadata?.mimeType || 'image/jpeg',
        size: asset.metadata?.size || 0,
        expiresAt: asset.metadata?.expiresAt ? new Date(asset.metadata.expiresAt) : undefined,
        createdAt: asset.createdAt
      };
    } catch (error) {
      console.error('Failed to get asset info:', error);
      return null;
    }
  }

  /**
   * Save asset info to database
   */
  private async saveAssetInfo(assetInfo: ImageAssetInfo): Promise<void> {
    try {
      await db.insert(characterAssets).values({
        id: assetInfo.id,
        storyId: 0, // Generic cache entry
        characterName: 'cached-image',
        originalImageUrl: assetInfo.originalUrl,
        cachedImagePath: assetInfo.localPath,
        publicImageUrl: assetInfo.publicUrl,
        metadata: {
          mimeType: assetInfo.mimeType,
          size: assetInfo.size,
          expiresAt: assetInfo.expiresAt?.toISOString(),
          cached: true
        }
      }).onConflictDoUpdate({
        target: characterAssets.id,
        set: {
          originalImageUrl: assetInfo.originalUrl,
          cachedImagePath: assetInfo.localPath,
          publicImageUrl: assetInfo.publicUrl,
          metadata: {
            mimeType: assetInfo.mimeType,
            size: assetInfo.size,
            expiresAt: assetInfo.expiresAt?.toISOString(),
            cached: true
          },
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to save asset info:', error);
    }
  }

  /**
   * Check if cached asset is still valid
   */
  private async isAssetValid(assetInfo: ImageAssetInfo): Promise<boolean> {
    try {
      // Check if file exists
      await fs.access(assetInfo.localPath);
      
      // Check if expired
      if (assetInfo.expiresAt && assetInfo.expiresAt < new Date()) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const typeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif'
    };
    
    return typeMap[mimeType.toLowerCase()] || 'jpg';
  }

  /**
   * Clean up expired cached images
   */
  async cleanupExpiredAssets(): Promise<void> {
    try {
      const expiredAssets = await db
        .select()
        .from(characterAssets)
        .where(eq(characterAssets.characterName, 'cached-image'));

      for (const asset of expiredAssets) {
        const expiresAt = asset.metadata?.expiresAt ? new Date(asset.metadata.expiresAt) : null;
        
        if (expiresAt && expiresAt < new Date()) {
          // Delete file
          if (asset.cachedImagePath) {
            try {
              await fs.unlink(asset.cachedImagePath);
            } catch (error) {
              console.error(`Failed to delete cached file ${asset.cachedImagePath}:`, error);
            }
          }
          
          // Delete database record
          await db.delete(characterAssets).where(eq(characterAssets.id, asset.id));
          console.log(`Cleaned up expired asset: ${asset.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup expired assets:', error);
    }
  }

  /**
   * Get absolute URL for serving cached images
   */
  getAbsoluteUrl(publicUrl: string, baseUrl: string = ''): string {
    if (publicUrl.startsWith('http')) {
      return publicUrl;
    }
    
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const cleanPublicUrl = publicUrl.startsWith('/') ? publicUrl : `/${publicUrl}`;
    
    return `${cleanBaseUrl}${cleanPublicUrl}`;
  }
}

export const imageAssetService = new ImageAssetService();