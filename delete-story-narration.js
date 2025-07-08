/**
 * Script to delete cached story narration
 * Usage: npx tsx delete-story-narration.js <storyId>
 */

const { db } = require('./server/db');
const { storyNarrations } = require('./shared/schema');
const { eq, and } = require('drizzle-orm');
const fs = require('fs-extra');
const path = require('path');

async function deleteStoryNarration(storyId, userId) {
  try {
    console.log(`\n🗑️  Deleting narration for story ${storyId}...`);
    
    // Delete from database
    const result = await db.delete(storyNarrations)
      .where(and(
        eq(storyNarrations.storyId, storyId),
        eq(storyNarrations.userId, userId)
      ))
      .returning();
    
    if (result.length > 0) {
      console.log(`✅ Deleted narration from database`);
      console.log(`   - Segments: ${result[0].segments.length}`);
      console.log(`   - Total duration: ${result[0].totalDuration}ms`);
      console.log(`   - Narrator voice: ${result[0].narratorVoice || 'default'}`);
    } else {
      console.log(`❌ No narration found in database for story ${storyId}`);
    }
    
    // Delete audio files
    const audioDir = path.join(process.cwd(), 'stories', 'audio', 'private', userId, storyId.toString());
    if (await fs.pathExists(audioDir)) {
      const files = await fs.readdir(audioDir);
      await fs.remove(audioDir);
      console.log(`✅ Deleted ${files.length} audio files from ${audioDir}`);
    } else {
      console.log(`📁 No audio files found at ${audioDir}`);
    }
    
    console.log(`\n✨ Story narration deletion complete!`);
    
  } catch (error) {
    console.error('❌ Error deleting narration:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node delete-story-narration.js <storyId>');
    console.log('Example: node delete-story-narration.js 74');
    process.exit(1);
  }
  
  const storyId = parseInt(args[0]);
  if (isNaN(storyId)) {
    console.error('Error: Story ID must be a number');
    process.exit(1);
  }
  
  // For this script, we'll use your user ID directly
  // In a production script, you might want to make this configurable
  const userId = 'google_117487073695002443567';
  
  console.log(`🎯 Deleting narration for:
  - Story ID: ${storyId}
  - User ID: ${userId}`);
  
  try {
    await deleteStoryNarration(storyId, userId);
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

main();