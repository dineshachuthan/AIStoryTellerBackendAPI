/**
 * Script to delete ALL cached story narrations for a user
 * Usage: npx tsx delete-story-narration.ts
 */

import { db } from './server/db';
import { storyNarrations } from './shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function deleteAllNarrations(userId: string) {
  try {
    console.log(`\n🗑️  Deleting ALL narrations for user ${userId}...`);
    
    // Get all narrations for the user
    const allNarrations = await db.select()
      .from(storyNarrations)
      .where(eq(storyNarrations.userId, userId));
    
    if (allNarrations.length === 0) {
      console.log(`❌ No narrations found in database for user`);
      return;
    }
    
    console.log(`📊 Found ${allNarrations.length} narrations to delete`);
    
    // Delete each narration
    for (const narration of allNarrations) {
      console.log(`\n📍 Story ${narration.storyId}:`);
      
      // Delete from database
      await db.delete(storyNarrations)
        .where(eq(storyNarrations.id, narration.id));
      
      console.log(`   ✅ Deleted from database`);
      console.log(`   - Segments: ${narration.segments.length}`);
      console.log(`   - Total duration: ${narration.totalDuration}ms`);
      console.log(`   - Narrator voice: ${narration.narratorVoice || 'default'}`);
      
      // Delete audio files
      const audioDir = path.join(process.cwd(), 'stories', 'audio', 'private', userId, narration.storyId.toString());
      if (fs.existsSync(audioDir)) {
        const files = fs.readdirSync(audioDir);
        fs.rmSync(audioDir, { recursive: true, force: true });
        console.log(`   ✅ Deleted ${files.length} audio files`);
      } else {
        console.log(`   📁 No audio files found`);
      }
    }
    
    // Also check for any orphaned audio directories
    const userAudioDir = path.join(process.cwd(), 'stories', 'audio', 'private', userId);
    if (fs.existsSync(userAudioDir)) {
      const storyDirs = fs.readdirSync(userAudioDir);
      console.log(`\n🔍 Checking for orphaned audio directories...`);
      for (const dir of storyDirs) {
        const storyId = parseInt(dir);
        if (!isNaN(storyId) && !allNarrations.find(n => n.storyId === storyId)) {
          const orphanDir = path.join(userAudioDir, dir);
          fs.rmSync(orphanDir, { recursive: true, force: true });
          console.log(`   🧹 Cleaned orphaned directory for story ${storyId}`);
        }
      }
    }
    
    console.log(`\n✨ All narrations deleted successfully!`);
    
  } catch (error) {
    console.error('❌ Error deleting narrations:', error);
    throw error;
  }
}

// Main execution
async function main() {
  // For this script, we'll use your user ID directly
  const userId = 'google_117487073695002443567';
  
  console.log(`🎯 Deleting ALL narrations for user: ${userId}`);
  console.log(`⚠️  This will delete all cached story narrations and audio files`);
  
  try {
    await deleteAllNarrations(userId);
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

main();