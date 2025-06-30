/**
 * User Content Storage Service
 * Manages hierarchical storage of user audio and video files
 * Structure: user-data/{userId}/{contentType}/{category}/{filename}
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface UserContentPaths {
  userId: string;
  contentType: 'audio' | 'video';
  category: string;
  filename: string;
}

export interface StoredContent {
  filePath: string;
  url: string;
  metadata: {
    userId: string;
    contentType: string;
    category: string;
    filename: string;
    fileSize: number;
    createdAt: Date;
    mimeType: string;
  };
}

export class UserContentStorage {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'user-data');
    this.ensureBaseDirectory();
  }

  /**
   * Ensure base directory exists
   */
  private async ensureBaseDirectory(): Promise<void> {
    try {
      await fs.promises.mkdir(this.baseDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create user-data directory:', error);
    }
  }

  /**
   * Get user directory path
   */
  private getUserDir(userId: string): string {
    return path.join(this.baseDir, userId);
  }

  /**
   * Get category directory path
   */
  private getCategoryDir(userId: string, contentType: 'audio' | 'video', category: string): string {
    return path.join(this.getUserDir(userId), contentType, category);
  }

  /**
   * Ensure user directory structure exists
   */
  private async ensureUserDirectories(userId: string): Promise<void> {
    const userDir = this.getUserDir(userId);
    
    // Create user directories
    const directories = [
      userDir,
      path.join(userDir, 'audio'),
      path.join(userDir, 'audio', 'emotions'),
      path.join(userDir, 'audio', 'sounds'),
      path.join(userDir, 'audio', 'modulations'),
      path.join(userDir, 'video'),
      path.join(userDir, 'video', 'stories'),
      path.join(userDir, 'video', 'characters')
    ];

    for (const dir of directories) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Generate filename with timestamp
   */
  private generateFilename(category: string, identifier: string, extension: string): string {
    const timestamp = Date.now();
    return `${identifier}-${timestamp}.${extension}`;
  }

  /**
   * Store audio content (emotion, sound, or modulation)
   */
  async storeAudioContent(
    userId: string,
    category: 'emotions' | 'sounds' | 'modulations',
    identifier: string,
    audioBuffer: Buffer,
    originalMimeType: string
  ): Promise<StoredContent> {
    await this.ensureUserDirectories(userId);

    // ENFORCE MP3-ONLY: Convert all audio to MP3
    const filename = this.generateFilename(category, identifier, 'mp3');
    const categoryDir = this.getCategoryDir(userId, 'audio', category);
    const finalPath = path.join(categoryDir, filename);

    // Convert to MP3 if needed
    if (originalMimeType !== 'audio/mpeg') {
      const tempInputFile = path.join(categoryDir, `temp_${filename}`);
      const tempExtension = this.getExtensionFromMimeType(originalMimeType);
      const tempInputPath = path.join(categoryDir, `temp_${identifier}.${tempExtension}`);
      
      // Write original file
      await fs.promises.writeFile(tempInputPath, audioBuffer);
      
      // Convert to MP3
      await execAsync(`ffmpeg -i "${tempInputPath}" -acodec libmp3lame -b:a 192k -ar 44100 -af "volume=40dB" -y "${finalPath}"`);
      
      // Clean up temp file
      await fs.promises.unlink(tempInputPath);
    } else {
      // Already MP3, write directly
      await fs.promises.writeFile(finalPath, audioBuffer);
    }

    // Get file stats
    const stats = await fs.promises.stat(finalPath);

    return {
      filePath: finalPath,
      url: `/api/user-content/${userId}/audio/${category}/${filename}`,
      metadata: {
        userId,
        contentType: 'audio',
        category,
        filename,
        fileSize: stats.size,
        createdAt: new Date(),
        mimeType: 'audio/mpeg'
      }
    };
  }

  /**
   * Store video content (stories or characters)
   */
  async storeVideoContent(
    userId: string,
    category: 'stories' | 'characters',
    identifier: string,
    videoBuffer: Buffer,
    originalMimeType: string
  ): Promise<StoredContent> {
    await this.ensureUserDirectories(userId);

    // ENFORCE MP4-ONLY: Convert all video to MP4
    const filename = this.generateFilename(category, identifier, 'mp4');
    const categoryDir = this.getCategoryDir(userId, 'video', category);
    const finalPath = path.join(categoryDir, filename);

    // Convert to MP4 if needed (similar to audio conversion)
    if (originalMimeType !== 'video/mp4') {
      const tempExtension = this.getExtensionFromMimeType(originalMimeType);
      const tempInputPath = path.join(categoryDir, `temp_${identifier}.${tempExtension}`);
      
      // Write original file
      await fs.promises.writeFile(tempInputPath, videoBuffer);
      
      // Convert to MP4
      await execAsync(`ffmpeg -i "${tempInputPath}" -c:v libx264 -c:a aac -movflags +faststart -y "${finalPath}"`);
      
      // Clean up temp file
      await fs.promises.unlink(tempInputPath);
    } else {
      // Already MP4, write directly
      await fs.promises.writeFile(finalPath, videoBuffer);
    }

    // Get file stats
    const stats = await fs.promises.stat(finalPath);

    return {
      filePath: finalPath,
      url: `/api/user-content/${userId}/video/${category}/${filename}`,
      metadata: {
        userId,
        contentType: 'video',
        category,
        filename,
        fileSize: stats.size,
        createdAt: new Date(),
        mimeType: 'video/mp4'
      }
    };
  }

  /**
   * Get content by URL path
   */
  async getContent(userId: string, contentType: 'audio' | 'video', category: string, filename: string): Promise<string> {
    const filePath = path.join(this.getCategoryDir(userId, contentType, category), filename);
    
    // Verify file exists
    try {
      await fs.promises.access(filePath);
      return filePath;
    } catch {
      throw new Error(`Content not found: ${userId}/${contentType}/${category}/${filename}`);
    }
  }

  /**
   * List user content by category
   */
  async listUserContent(userId: string, contentType: 'audio' | 'video', category: string): Promise<string[]> {
    const categoryDir = this.getCategoryDir(userId, contentType, category);
    
    try {
      const files = await fs.promises.readdir(categoryDir);
      return files.filter(file => !file.startsWith('temp_'));
    } catch {
      return [];
    }
  }

  /**
   * Delete content
   */
  async deleteContent(userId: string, contentType: 'audio' | 'video', category: string, filename: string): Promise<void> {
    const filePath = path.join(this.getCategoryDir(userId, contentType, category), filename);
    
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete content: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/wav': 'wav',
      'audio/mp4': 'm4a',
      'audio/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'video/webm': 'webm',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/avi': 'avi'
    };
    
    return mimeMap[mimeType] || 'unknown';
  }

  /**
   * Get storage statistics for user
   */
  async getUserStorageStats(userId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    audioFiles: number;
    videoFiles: number;
    categories: Record<string, number>;
  }> {
    const userDir = this.getUserDir(userId);
    
    try {
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        audioFiles: 0,
        videoFiles: 0,
        categories: {} as Record<string, number>
      };

      // Count audio files
      const audioCategories = ['emotions', 'sounds', 'modulations'];
      for (const category of audioCategories) {
        const files = await this.listUserContent(userId, 'audio', category);
        stats.audioFiles += files.length;
        stats.totalFiles += files.length;
        stats.categories[`audio-${category}`] = files.length;
      }

      // Count video files
      const videoCategories = ['stories', 'characters'];
      for (const category of videoCategories) {
        const files = await this.listUserContent(userId, 'video', category);
        stats.videoFiles += files.length;
        stats.totalFiles += files.length;
        stats.categories[`video-${category}`] = files.length;
      }

      return stats;
    } catch {
      return {
        totalFiles: 0,
        totalSize: 0,
        audioFiles: 0,
        videoFiles: 0,
        categories: {}
      };
    }
  }
}

export const userContentStorage = new UserContentStorage();