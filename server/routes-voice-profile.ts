/**
 * Voice Profile Routes - Gamified voice preference collection
 */

import type { Express, Request, Response } from 'express';
import { requireAuth } from './auth';
import { storage } from './storage';
import { voiceOrchestrationService } from './voice-orchestration-service';
import { db } from './db';
import { userVoiceProfiles } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export function registerVoiceProfileRoutes(app: Express) {
  /**
   * Get user's voice profile with gamification progress
   */
  app.get('/api/voice-profile', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;
      
      // Get current profile
      const [profile] = await db
        .select()
        .from(userVoiceProfiles)
        .where(and(
          eq(userVoiceProfiles.userId, userId),
          eq(userVoiceProfiles.isActive, true)
        ))
        .limit(1);
      
      // Calculate gamification progress
      const progress = calculateVoiceProfileProgress(profile);
      
      res.json({
        profile: profile || null,
        progress,
        nextQuest: getNextVoiceQuest(progress)
      });
    } catch (error) {
      console.error('Error fetching voice profile:', error);
      res.status(500).json({ error: 'Failed to fetch voice profile' });
    }
  });

  /**
   * Update voice profile with gamified data collection
   */
  app.post('/api/voice-profile/update', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;
      const updates = req.body;
      
      // Validate updates
      const validUpdates: any = {};
      
      // Age preference (gamified as "Voice Maturity Level")
      if (updates.voiceMaturityLevel) {
        validUpdates.age = mapMaturityToAge(updates.voiceMaturityLevel);
      }
      
      // Storytelling style (gamified as "Narration Style")
      if (updates.narrationStyle) {
        const styleSettings = mapNarrationStyle(updates.narrationStyle);
        Object.assign(validUpdates, styleSettings);
      }
      
      // Language preferences (gamified as "Language Adventure")
      if (updates.languageAdventure) {
        validUpdates.storytellingLanguage = updates.languageAdventure.storytellingLanguage;
        validUpdates.nativeLanguage = updates.languageAdventure.nativeLanguage;
      }
      
      // Voice personality traits (gamified as "Voice Personality Quiz")
      if (updates.personalityTraits) {
        const voiceSettings = mapPersonalityToVoice(updates.personalityTraits);
        Object.assign(validUpdates, voiceSettings);
      }
      
      // Update or create profile
      const existingProfile = await db
        .select()
        .from(userVoiceProfiles)
        .where(eq(userVoiceProfiles.userId, userId))
        .limit(1);
      
      if (existingProfile.length > 0) {
        await db
          .update(userVoiceProfiles)
          .set({
            ...validUpdates,
            updatedAt: new Date()
          })
          .where(eq(userVoiceProfiles.userId, userId));
      } else {
        await db
          .insert(userVoiceProfiles)
          .values({
            userId,
            ...validUpdates
          });
      }
      
      // Build implicit profile from stories
      await voiceOrchestrationService.buildImplicitUserProfile(userId);
      
      // Calculate new progress
      const [updatedProfile] = await db
        .select()
        .from(userVoiceProfiles)
        .where(eq(userVoiceProfiles.userId, userId))
        .limit(1);
      
      const progress = calculateVoiceProfileProgress(updatedProfile);
      
      res.json({
        success: true,
        profile: updatedProfile,
        progress,
        achievement: getAchievementForUpdate(updates),
        nextQuest: getNextVoiceQuest(progress)
      });
    } catch (error) {
      console.error('Error updating voice profile:', error);
      res.status(500).json({ error: 'Failed to update voice profile' });
    }
  });

  /**
   * Get voice personality quiz
   */
  app.get('/api/voice-profile/personality-quiz', requireAuth, async (req: Request, res: Response) => {
    res.json({
      title: "Discover Your Narrator Voice Personality",
      description: "Answer these fun questions to help us create your perfect storytelling voice!",
      questions: [
        {
          id: 'story-mood',
          question: "What kind of stories do you love most?",
          options: [
            { value: 'adventurous', label: "🗺️ Epic adventures with heroes and quests", traits: ['energetic', 'bold'] },
            { value: 'mysterious', label: "🔮 Mysterious tales with secrets to uncover", traits: ['thoughtful', 'intriguing'] },
            { value: 'heartwarming', label: "❤️ Heartwarming stories about friendship", traits: ['warm', 'gentle'] },
            { value: 'dramatic', label: "🎭 Dramatic stories with intense emotions", traits: ['expressive', 'powerful'] }
          ]
        },
        {
          id: 'reading-pace',
          question: "How do you like stories to be told?",
          options: [
            { value: 'quick', label: "⚡ Fast-paced and exciting", settings: { rate: "95%", style: 0.7 } },
            { value: 'steady', label: "🚶 Steady and clear", settings: { rate: "85%", style: 0.5 } },
            { value: 'slow', label: "🐌 Slow and thoughtful", settings: { rate: "75%", style: 0.3 } },
            { value: 'varied', label: "🎢 Mix it up based on the scene", settings: { rate: "85%", style: 0.6 } }
          ]
        },
        {
          id: 'voice-energy',
          question: "What energy should your narrator have?",
          options: [
            { value: 'calm', label: "🧘 Calm and soothing", settings: { stability: 0.85, pitch: "-2%" } },
            { value: 'lively', label: "🎉 Lively and enthusiastic", settings: { stability: 0.6, pitch: "+3%" } },
            { value: 'wise', label: "🦉 Wise and authoritative", settings: { stability: 0.8, pitch: "-1%" } },
            { value: 'playful', label: "🎈 Playful and fun", settings: { stability: 0.65, pitch: "+2%" } }
          ]
        }
      ]
    });
  });

  /**
   * Get voice maturity selector
   */
  app.get('/api/voice-profile/maturity-selector', requireAuth, async (req: Request, res: Response) => {
    res.json({
      title: "Choose Your Voice Maturity Level",
      description: "Select the voice age that feels right for your stories",
      options: [
        {
          level: 'young-adult',
          label: "Young Storyteller",
          description: "Fresh and energetic voice (18-25 years)",
          icon: "🌟",
          ageRange: [18, 25]
        },
        {
          level: 'adult',
          label: "Experienced Narrator",
          description: "Confident and clear voice (26-40 years)",
          icon: "📖",
          ageRange: [26, 40]
        },
        {
          level: 'mature',
          label: "Master Storyteller",
          description: "Wise and measured voice (41-60 years)",
          icon: "🏛️",
          ageRange: [41, 60]
        },
        {
          level: 'elder',
          label: "Sage Narrator",
          description: "Distinguished and thoughtful voice (60+ years)",
          icon: "🧙",
          ageRange: [60, 80]
        }
      ]
    });
  });

  /**
   * Get language adventure options
   */
  app.get('/api/voice-profile/language-adventure', requireAuth, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
    const user = await storage.getUser(userId);
    
    res.json({
      title: "Your Language Adventure",
      description: "Tell us about your language journey!",
      currentLanguage: user?.language || 'en',
      questions: [
        {
          id: 'native-language',
          question: "What's your mother tongue?",
          description: "The language you grew up speaking",
          options: [
            { code: 'en', label: 'English', flag: '🇬🇧' },
            { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
            { code: 'ta', label: 'Tamil', flag: '🇮🇳' },
            { code: 'te', label: 'Telugu', flag: '🇮🇳' },
            { code: 'es', label: 'Spanish', flag: '🇪🇸' },
            { code: 'fr', label: 'French', flag: '🇫🇷' },
            { code: 'de', label: 'German', flag: '🇩🇪' },
            { code: 'zh', label: 'Chinese', flag: '🇨🇳' },
            { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
            { code: 'ko', label: 'Korean', flag: '🇰🇷' }
          ]
        },
        {
          id: 'storytelling-language',
          question: "Which language do you prefer for stories?",
          description: "The language you want your narrator to use",
          options: [
            { code: 'same', label: 'Same as my native language', special: true },
            { code: 'en', label: 'English', flag: '🇬🇧' },
            { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
            { code: 'mixed', label: 'Mix of languages (code-switching)', special: true }
          ]
        }
      ]
    });
  });
}

/**
 * Calculate voice profile completion progress
 */
function calculateVoiceProfileProgress(profile: any): {
  percentage: number;
  level: number;
  badges: string[];
  completedQuests: string[];
} {
  if (!profile) {
    return {
      percentage: 0,
      level: 1,
      badges: [],
      completedQuests: []
    };
  }
  
  const completedQuests: string[] = [];
  let points = 0;
  
  // Check completed quests
  if (profile.age) {
    completedQuests.push('maturity-level');
    points += 25;
  }
  if (profile.stability && profile.similarityBoost && profile.style) {
    completedQuests.push('personality-quiz');
    points += 25;
  }
  if (profile.pitch && profile.rate) {
    completedQuests.push('narration-style');
    points += 25;
  }
  if (profile.nativeLanguage && profile.storytellingLanguage) {
    completedQuests.push('language-adventure');
    points += 25;
  }
  
  // Calculate badges
  const badges: string[] = [];
  if (points >= 25) badges.push('🎯 Voice Explorer');
  if (points >= 50) badges.push('🎨 Style Master');
  if (points >= 75) badges.push('🌍 Language Adventurer');
  if (points >= 100) badges.push('🏆 Voice Virtuoso');
  
  // Calculate level (1-10)
  const level = Math.min(10, Math.floor(points / 10) + 1);
  
  return {
    percentage: points,
    level,
    badges,
    completedQuests
  };
}

/**
 * Get next voice quest based on progress
 */
function getNextVoiceQuest(progress: any): {
  id: string;
  title: string;
  description: string;
  reward: string;
} | null {
  const allQuests = [
    {
      id: 'maturity-level',
      title: 'Choose Your Voice Age',
      description: 'Select the perfect voice maturity for your stories',
      reward: '🎯 Voice Explorer Badge'
    },
    {
      id: 'personality-quiz',
      title: 'Voice Personality Quiz',
      description: 'Discover your narrator personality in 3 fun questions',
      reward: '🎨 Style Master Badge'
    },
    {
      id: 'narration-style',
      title: 'Narration Style Selector',
      description: 'Pick your preferred storytelling pace and energy',
      reward: '📚 Narrator Badge'
    },
    {
      id: 'language-adventure',
      title: 'Language Adventure',
      description: 'Tell us about your language preferences',
      reward: '🌍 Language Adventurer Badge'
    }
  ];
  
  // Find first incomplete quest
  const incompleteQuest = allQuests.find(q => !progress.completedQuests.includes(q.id));
  return incompleteQuest || null;
}

/**
 * Map voice maturity level to age
 */
function mapMaturityToAge(level: string): number {
  const mapping: Record<string, number> = {
    'young-adult': 22,
    'adult': 35,
    'mature': 50,
    'elder': 70
  };
  return mapping[level] || 35;
}

/**
 * Map narration style to voice settings
 */
function mapNarrationStyle(style: string): any {
  const styles: Record<string, any> = {
    'energetic': { pitch: "+3%", rate: "95%", style: 0.7 },
    'calm': { pitch: "-2%", rate: "80%", style: 0.3, stability: 0.85 },
    'dramatic': { pitch: "0%", rate: "85%", style: 0.6, similarityBoost: 0.9 },
    'mysterious': { pitch: "-1%", rate: "75%", style: 0.4, stability: 0.8 }
  };
  return styles[style] || {};
}

/**
 * Map personality traits to voice settings
 */
function mapPersonalityToVoice(traits: string[]): any {
  const settings = {
    stability: 0.75,
    similarityBoost: 0.85,
    style: 0.5
  };
  
  // Adjust based on traits
  if (traits.includes('energetic') || traits.includes('bold')) {
    settings.style = Math.min(settings.style + 0.2, 1);
    settings.stability = Math.max(settings.stability - 0.1, 0);
  }
  if (traits.includes('thoughtful') || traits.includes('wise')) {
    settings.stability = Math.min(settings.stability + 0.1, 1);
    settings.style = Math.max(settings.style - 0.1, 0);
  }
  if (traits.includes('warm') || traits.includes('gentle')) {
    settings.similarityBoost = Math.min(settings.similarityBoost + 0.05, 1);
  }
  
  return settings;
}

/**
 * Get achievement for completing a quest
 */
function getAchievementForUpdate(updates: any): {
  title: string;
  description: string;
  icon: string;
} | null {
  if (updates.voiceMaturityLevel) {
    return {
      title: 'Voice Age Selected!',
      description: 'You\'ve chosen your narrator\'s voice maturity',
      icon: '🎯'
    };
  }
  if (updates.personalityTraits) {
    return {
      title: 'Personality Discovered!',
      description: 'Your unique narrator personality is set',
      icon: '🎨'
    };
  }
  if (updates.languageAdventure) {
    return {
      title: 'Language Journey Begun!',
      description: 'Your language preferences are saved',
      icon: '🌍'
    };
  }
  return null;
}