/**
 * Manual script to clear narration for testing
 */

import { db } from './server/db.js';
import { eq } from 'drizzle-orm';
import { storyNarrations } from './shared/schema.js';
import fs from 'fs/promises';
import path from 'path';

const userId = 'google_117487073695002443567';
const storyId = 74;

async function clearNarration() {
  try {
    console.log(`\n🧹 Clearing narration for story ${storyId}, user ${userId}...`);
    
    // Check if narration exists
    const existing = await db.select()
      .from(storyNarrations)
      .where(eq(storyNarrations.storyId, storyId))
      .where(eq(storyNarrations.userId, userId));
    
    if (existing.length > 0) {
      console.log(`📊 Found ${existing.length} narration(s) to delete`);
      
      // Delete from database
      const deleted = await db
        .delete(storyNarrations)
        .where(eq(storyNarrations.storyId, storyId))
        .where(eq(storyNarrations.userId, userId))
        .returning();
      
      console.log(`✅ Deleted ${deleted.length} narration(s) from database`);
      
      // Delete audio files
      const audioDir = path.join(process.cwd(), 'stories', 'audio', 'private', userId, storyId.toString());
      try {
        await fs.rmdir(audioDir, { recursive: true });
        console.log(`✅ Deleted audio directory: ${audioDir}`);
      } catch (error) {
        console.log(`📁 No audio directory found at: ${audioDir}`);
      }
    } else {
      console.log(`❌ No narration found for story ${storyId}`);
    }
    
    // Verify deletion
    const check = await db.select()
      .from(storyNarrations)
      .where(eq(storyNarrations.storyId, storyId))
      .where(eq(storyNarrations.userId, userId));
    
    console.log(`\n✨ Verification: ${check.length} narrations remaining (should be 0)`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

clearNarration();