/**
 * Test Different Narrator Voice Profiles
 * Usage: node test-narrator-profiles.js <profile>
 * Profiles: grandma, kid, neutral
 */

import { db } from './server/db.js';
import { userVoiceProfiles } from './shared/schema.js';
import { eq } from 'drizzle-orm';

const userId = 'google_117487073695002443567'; // Your user ID

const profiles = {
  grandma: {
    stability: 0.9,          // Very stable, gentle voice
    similarityBoost: 0.7,    // Allow more warmth variation
    style: 0.8,              // Expressive, storytelling style
    pitch: "+10%",           // Slightly higher pitch
    rate: "slow",            // Slower, deliberate pace
    age: 'elderly'
  },
  kid: {
    stability: 0.5,          // More dynamic, energetic
    similarityBoost: 0.6,    // Allow playful variations
    style: 0.9,              // Very expressive
    pitch: "+20%",           // Higher pitch for youthful sound
    rate: "fast",            // Faster, excited pace
    age: 'child'
  },
  neutral: {
    stability: 0.75,
    similarityBoost: 0.85,
    style: 0.5,
    pitch: "0%",
    rate: "medium",
    age: 'adult'
  }
};

async function setNarratorProfile(profileName) {
  try {
    const profile = profiles[profileName];
    if (!profile) {
      console.error('Invalid profile. Choose: grandma, kid, or neutral');
      return;
    }

    // Deactivate existing profiles
    await db.update(userVoiceProfiles)
      .set({ isActive: false })
      .where(eq(userVoiceProfiles.userId, userId));

    // Check if user has any profile
    const existing = await db.select()
      .from(userVoiceProfiles)
      .where(eq(userVoiceProfiles.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing profile
      await db.update(userVoiceProfiles)
        .set({
          ...profile,
          isActive: true,
          updatedAt: new Date()
        })
        .where(eq(userVoiceProfiles.userId, userId));
    } else {
      // Create new profile
      await db.insert(userVoiceProfiles)
        .values({
          userId,
          ...profile,
          storytellingLanguage: 'en',
          nativeLanguage: 'ta',
          onboardingCompleted: true,
          isActive: true
        });
    }

    console.log(`✅ ${profileName} narrator profile activated!`);
    console.log('Profile settings:', profile);
    console.log('\nNow regenerate your story narration to hear the difference.');
    
  } catch (error) {
    console.error('Error setting profile:', error);
  } finally {
    process.exit(0);
  }
}

const profileName = process.argv[2] || 'neutral';
setNarratorProfile(profileName);