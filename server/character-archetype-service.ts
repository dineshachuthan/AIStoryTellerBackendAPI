// Service to initialize and manage reusable character archetypes for consistent voice assignment
import { db } from './db';
import { characterArchetypes, userCharacterPreferences } from '@shared/schema';
import type { InsertCharacterArchetype } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

// Comprehensive character archetypes with voice assignments
const DEFAULT_CHARACTER_ARCHETYPES: InsertCharacterArchetype[] = [
  // Authority Figures
  {
    name: "King",
    category: "authority",
    gender: "male",
    ageGroup: "adult",
    personality: "authoritative",
    recommendedVoice: "onyx",
    description: "Royal male authority figure with commanding presence",
    keywords: ["king", "monarch", "ruler", "sovereign", "royal", "majesty"]
  },
  {
    name: "Queen",
    category: "authority", 
    gender: "female",
    ageGroup: "adult",
    personality: "authoritative",
    recommendedVoice: "nova",
    description: "Royal female authority figure with regal bearing",
    keywords: ["queen", "monarch", "ruler", "sovereign", "royal", "majesty", "empress"]
  },
  {
    name: "President",
    category: "authority",
    gender: "male",
    ageGroup: "adult", 
    personality: "authoritative",
    recommendedVoice: "onyx",
    description: "Political leader with commanding voice",
    keywords: ["president", "leader", "politician", "commander in chief"]
  },
  {
    name: "Judge",
    category: "authority",
    gender: "male",
    ageGroup: "adult",
    personality: "wise",
    recommendedVoice: "onyx",
    description: "Legal authority figure with gravitas",
    keywords: ["judge", "justice", "court", "legal", "magistrate"]
  },

  // Military
  {
    name: "General",
    category: "military",
    gender: "male", 
    ageGroup: "adult",
    personality: "authoritative",
    recommendedVoice: "onyx",
    description: "High-ranking military officer",
    keywords: ["general", "commander", "military", "officer", "war"]
  },
  {
    name: "Soldier", 
    category: "military",
    gender: "male",
    ageGroup: "young",
    personality: "authoritative",
    recommendedVoice: "echo",
    description: "Military personnel with disciplined bearing",
    keywords: ["soldier", "warrior", "fighter", "trooper", "military"]
  },
  {
    name: "Captain",
    category: "military",
    gender: "male",
    ageGroup: "adult",
    personality: "authoritative", 
    recommendedVoice: "fable",
    description: "Mid-level military officer",
    keywords: ["captain", "officer", "leader", "ship", "military"]
  },

  // Religious Figures
  {
    name: "Priest",
    category: "religious",
    gender: "male",
    ageGroup: "adult",
    personality: "wise",
    recommendedVoice: "fable",
    description: "Religious leader with spiritual authority",
    keywords: ["priest", "father", "cleric", "minister", "pastor", "chaplain"]
  },
  {
    name: "Bishop",
    category: "religious", 
    gender: "male",
    ageGroup: "adult",
    personality: "authoritative",
    recommendedVoice: "onyx",
    description: "High-ranking religious authority",
    keywords: ["bishop", "archbishop", "religious", "church", "holy"]
  },
  {
    name: "Monk",
    category: "religious",
    gender: "male",
    ageGroup: "adult", 
    personality: "wise",
    recommendedVoice: "fable",
    description: "Contemplative religious figure",
    keywords: ["monk", "brother", "monastery", "meditation", "wise"]
  },

  // Family Figures
  {
    name: "Mother",
    category: "family",
    gender: "female",
    ageGroup: "adult",
    personality: "gentle",
    recommendedVoice: "nova",
    description: "Caring maternal figure",
    keywords: ["mother", "mom", "mama", "parent", "maternal"]
  },
  {
    name: "Father", 
    category: "family",
    gender: "male",
    ageGroup: "adult",
    personality: "authoritative",
    recommendedVoice: "fable",
    description: "Protective paternal figure",
    keywords: ["father", "dad", "papa", "parent", "paternal"]
  },
  {
    name: "Grandmother",
    category: "family",
    gender: "female",
    ageGroup: "elderly",
    personality: "wise",
    recommendedVoice: "nova",
    description: "Wise elderly maternal figure",
    keywords: ["grandmother", "grandma", "nana", "granny", "elderly", "wise"]
  },

  // Antagonists
  {
    name: "Terrorist",
    category: "antagonist",
    gender: "male", 
    ageGroup: "adult",
    personality: "dramatic",
    recommendedVoice: "onyx",
    description: "Threatening antagonist figure",
    keywords: ["terrorist", "villain", "enemy", "threat", "dangerous"]
  },
  {
    name: "Witch",
    category: "antagonist",
    gender: "female",
    ageGroup: "adult",
    personality: "dramatic", 
    recommendedVoice: "nova",
    description: "Magical antagonist with mysterious powers",
    keywords: ["witch", "sorceress", "magic", "spell", "evil", "dark"]
  },
  {
    name: "Dragon",
    category: "fantasy",
    gender: "unknown",
    ageGroup: "adult",
    personality: "dramatic",
    recommendedVoice: "onyx", 
    description: "Powerful mythical creature",
    keywords: ["dragon", "beast", "creature", "fire", "powerful", "ancient"]
  },

  // Animals
  {
    name: "Dog",
    category: "animal",
    gender: "unknown",
    ageGroup: "adult",
    personality: "energetic",
    recommendedVoice: "echo",
    description: "Loyal canine companion",
    keywords: ["dog", "puppy", "canine", "loyal", "pet", "companion"]
  },
  {
    name: "Cat",
    category: "animal", 
    gender: "unknown",
    ageGroup: "adult",
    personality: "gentle",
    recommendedVoice: "shimmer",
    description: "Independent feline character",
    keywords: ["cat", "kitten", "feline", "independent", "pet", "graceful"]
  },
  {
    name: "Lion",
    category: "animal",
    gender: "male",
    ageGroup: "adult",
    personality: "authoritative",
    recommendedVoice: "onyx",
    description: "Majestic king of beasts",
    keywords: ["lion", "king", "beast", "roar", "powerful", "mane"]
  },
  {
    name: "Horse",
    category: "animal",
    gender: "unknown", 
    ageGroup: "adult",
    personality: "gentle",
    recommendedVoice: "fable",
    description: "Noble and loyal steed",
    keywords: ["horse", "steed", "stallion", "mare", "noble", "gallop"]
  },

  // Children and Youth
  {
    name: "Child",
    category: "family",
    gender: "unknown",
    ageGroup: "child",
    personality: "energetic",
    recommendedVoice: "shimmer",
    description: "Young energetic character",
    keywords: ["child", "kid", "young", "little", "boy", "girl"]
  },
  {
    name: "Princess",
    category: "authority",
    gender: "female",
    ageGroup: "young", 
    personality: "gentle",
    recommendedVoice: "shimmer",
    description: "Young royal female character",
    keywords: ["princess", "royal", "young", "noble", "castle", "crown"]
  },

  // Wise Figures
  {
    name: "Sage",
    category: "wise",
    gender: "male",
    ageGroup: "elderly",
    personality: "wise",
    recommendedVoice: "fable",
    description: "Ancient wise advisor",
    keywords: ["sage", "wise", "ancient", "advisor", "knowledge", "counsel"]
  },
  {
    name: "Oracle",
    category: "wise", 
    gender: "female",
    ageGroup: "adult",
    personality: "wise",
    recommendedVoice: "nova",
    description: "Mystical prophet with divine knowledge",
    keywords: ["oracle", "prophet", "seer", "divine", "prophecy", "future"]
  }
];

// Voice cloning emotion profiles temporarily disabled
// const DEFAULT_EMOTION_PROFILES: InsertEmotionVoiceProfile[] = [
//   {
//     emotion: "wisdom",
//     characterType: null,
//     baseVoice: "fable",
//     speedModifier: 0.8,
//     styleInstructions: "speak slowly and thoughtfully with natural pauses",
//     usageCount: 0,
//     successRate: 1.0
//   },
//   {
//     emotion: "anger",
//     characterType: "male",
//     baseVoice: "onyx", 
//     speedModifier: 1.2,
//     styleInstructions: "speak with intensity and force",
//     usageCount: 0,
//     successRate: 1.0
//   },
//   {
//     emotion: "anger",
//     characterType: "female",
//     baseVoice: "nova",
//     speedModifier: 1.2,
//     styleInstructions: "speak with sharp intensity",
//     usageCount: 0,
//     successRate: 1.0
//   },
//   {
//     emotion: "joy",
//     characterType: null,
//     baseVoice: "shimmer",
//     speedModifier: 1.1,
//     styleInstructions: "speak with warmth and brightness",
//     usageCount: 0,
//     successRate: 1.0
//   },
//   {
//     emotion: "sadness", 
//     characterType: null,
//     baseVoice: "nova",
//     speedModifier: 0.9,
//     styleInstructions: "speak softly with gentle melancholy",
//     usageCount: 0,
//     successRate: 1.0
//   },
//   {
//     emotion: "fear",
//     characterType: null,
//     baseVoice: "echo",
//     speedModifier: 1.3,
//     styleInstructions: "speak with nervous energy and urgency",
//     usageCount: 0,
//     successRate: 1.0
//   },
//   {
//     emotion: "authority",
//     characterType: "king",
//     baseVoice: "onyx",
//     speedModifier: 0.9,
//     styleInstructions: "speak with commanding authority and gravitas",
//     usageCount: 0,
//     successRate: 1.0
//   },
//   {
//     emotion: "authority",
//     characterType: "queen", 
//     baseVoice: "nova",
//     speedModifier: 0.9,
//     styleInstructions: "speak with regal authority and dignity",
//     usageCount: 0,
//     successRate: 1.0
//   }
// ];

export class CharacterArchetypeService {
  
  async initializeDefaultArchetypes(): Promise<void> {
    try {
      // Use retry mechanism for database operations
      const { withRetry } = await import('./db');
      
      // Check if archetypes already exist
      const existingCount = await withRetry(async () => 
        db.select({ count: sql<number>`count(*)` }).from(characterArchetypes)
      );
      
      if (existingCount[0].count > 0) {
        console.log('Character archetypes already initialized');
        return;
      }

      // Insert default character archetypes with retry
      await withRetry(async () => 
        db.insert(characterArchetypes).values(DEFAULT_CHARACTER_ARCHETYPES)
      );
      console.log(`Initialized ${DEFAULT_CHARACTER_ARCHETYPES.length} character archetypes`);

      // Voice cloning emotion profiles temporarily disabled
      // await withRetry(async () => 
      //   db.insert(emotionVoiceProfiles).values(DEFAULT_EMOTION_PROFILES)
      // );
      // console.log(`Initialized ${DEFAULT_EMOTION_PROFILES.length} emotion voice profiles`);

    } catch (error) {
      console.error('Failed to initialize character archetypes:', error);
    }
  }

  async findMatchingArchetype(characterName: string, description: string, traits: string[]): Promise<any | null> {
    const searchText = `${characterName} ${description} ${traits.join(' ')}`.toLowerCase();
    
    // Get all archetypes and find best match based on keywords
    const archetypes = await db.select().from(characterArchetypes);
    
    let bestMatch = null;
    let bestScore = 0;
    
    for (const archetype of archetypes) {
      let score = 0;
      const keywords = archetype.keywords || [];
      
      // Check keyword matches
      for (const keyword of keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          score += 2;
        }
      }
      
      // Check name matches
      if (searchText.includes(archetype.name.toLowerCase())) {
        score += 5;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = archetype;
      }
    }
    
    return bestScore > 0 ? bestMatch : null;
  }

  async getUserPreferredVoice(userId: string, characterPattern: string): Promise<string | null> {
    const [preference] = await db.select()
      .from(userCharacterPreferences)
      .where(and(
        eq(userCharacterPreferences.userId, userId),
        eq(userCharacterPreferences.characterPattern, characterPattern.toLowerCase())
      ));
    
    return preference?.preferredVoice || null;
  }

  async saveUserPreference(userId: string, characterPattern: string, preferredVoice: string, reason?: string): Promise<void> {
    await db.insert(userCharacterPreferences)
      .values({
        userId,
        characterPattern: characterPattern.toLowerCase(),
        preferredVoice,
        reasonForPreference: reason,
        timesUsed: 1,
        lastUsedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [userCharacterPreferences.userId, userCharacterPreferences.characterPattern],
        set: {
          preferredVoice,
          reasonForPreference: reason,
          timesUsed: sql`${userCharacterPreferences.timesUsed} + 1`,
          lastUsedAt: new Date()
        }
      });
  }

  // Voice cloning profile method temporarily disabled
  // async getEmotionVoiceProfile(emotion: string, characterType?: string): Promise<any | null> {
  //   const [profile] = await db.select()
  //     .from(emotionVoiceProfiles)
  //     .where(and(
  //       eq(emotionVoiceProfiles.emotion, emotion),
  //       characterType 
  //         ? eq(emotionVoiceProfiles.characterType, characterType)
  //         : sql`${emotionVoiceProfiles.characterType} IS NULL`
  //     ));
  //   
  //   return profile || null;
  // }

  async updateArchetypeUsage(archetypeId: number): Promise<void> {
    await db.update(characterArchetypes)
      .set({
        usageCount: sql`${characterArchetypes.usageCount} + 1`
      })
      .where(eq(characterArchetypes.id, archetypeId));
  }
}

export const archetypeService = new CharacterArchetypeService();