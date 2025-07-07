/**
 * External ID Service
 * Generates and manages anonymous external IDs for privacy protection
 * when communicating with external services (ElevenLabs, Kling, RunwayML, etc.)
 */

import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class ExternalIdService {
  /**
   * Generate anonymous external ID for a user
   * Format: "anon_" + 10 random alphanumeric characters
   * @returns Anonymous external ID
   */
  generateExternalId(): string {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'anon_';
    for (let i = 0; i < 10; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  /**
   * Get or create external ID for a user
   * @param userId - Actual user ID (e.g., google_117487073695002443567)
   * @returns Anonymous external ID
   */
  async getOrCreateExternalId(userId: string): Promise<string> {
    try {
      // First check if user already has an external ID
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      if (user?.externalId) {
        return user.externalId;
      }

      // Generate new external ID
      let externalId: string;
      let isUnique = false;

      // Keep generating until we get a unique ID
      while (!isUnique) {
        externalId = this.generateExternalId();
        const [existing] = await db.select().from(users).where(eq(users.externalId, externalId));
        if (!existing) {
          isUnique = true;
        }
      }

      // Update user with new external ID
      await db.update(users)
        .set({ externalId: externalId! })
        .where(eq(users.id, userId));

      console.log(`[ExternalIdService] Generated anonymous ID for user: ${externalId}`);
      return externalId!;
    } catch (error) {
      console.error('[ExternalIdService] Error generating external ID:', error);
      // Fallback to hashed version of user ID if database update fails
      return this.hashUserId(userId);
    }
  }

  /**
   * Create a simple hash of user ID as fallback
   * @param userId - Actual user ID
   * @returns Hashed anonymous ID
   */
  private hashUserId(userId: string): string {
    // Simple hash to anonymize the user ID
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `anon_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Migrate existing users to have external IDs
   * This should be run once during deployment
   */
  async migrateExistingUsers(): Promise<void> {
    try {
      const allUsers = await db.select().from(users);
      
      for (const user of allUsers) {
        if (!user.externalId) {
          await this.getOrCreateExternalId(user.id);
        }
      }
      
      console.log(`[ExternalIdService] Migration complete. Updated ${allUsers.filter(u => !u.externalId).length} users with external IDs.`);
    } catch (error) {
      console.error('[ExternalIdService] Migration failed:', error);
    }
  }
}

export const externalIdService = new ExternalIdService();