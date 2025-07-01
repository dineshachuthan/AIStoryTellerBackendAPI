import { createHash } from 'crypto';

/**
 * Content Hash Service
 * Provides SHA256 hashing for story content to enable cache invalidation
 */
export class ContentHashService {
  /**
   * Generate SHA256 hash of story content
   * @param content - Story content to hash
   * @returns SHA256 hash string (64 characters)
   */
  static generateContentHash(content: string): string {
    return createHash('sha256').update(content.trim()).digest('hex');
  }

  /**
   * Compare two content hashes to determine if content has changed
   * @param currentContent - Current story content
   * @param storedHash - Previously stored content hash
   * @returns true if content has changed, false if identical
   */
  static hasContentChanged(currentContent: string, storedHash: string | null): boolean {
    if (!storedHash) {
      return true; // No stored hash means first analysis
    }
    
    const currentHash = this.generateContentHash(currentContent);
    return currentHash !== storedHash;
  }

  /**
   * Validate hash format (64 character hex string)
   * @param hash - Hash to validate
   * @returns true if valid SHA256 hash format
   */
  static isValidHash(hash: string | null): boolean {
    if (!hash) return false;
    return /^[a-f0-9]{64}$/i.test(hash);
  }
}

export const contentHashService = ContentHashService;