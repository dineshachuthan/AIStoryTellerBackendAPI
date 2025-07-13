import { db } from "../../server/db";
import { conversationStyles, type ConversationStyle, type InsertConversationStyle } from "../schema/schema";
import { eq } from "drizzle-orm";

/**
 * Voice parameter structure for conversation styles
 */
interface VoiceParameters {
  stability: { mean: number; range: [number, number] };
  similarity_boost: { mean: number; range: [number, number] };
  style: { mean: number; range: [number, number] };
  prosody: {
    pitch: { base: string; range: [number, number] };
    rate: { base: string; range: [number, number] };
    volume: string;
  };
}

/**
 * Conversation style definition from JSON
 */
interface ConversationStyleDefinition {
  displayName: string;
  description: string;
  relationshipContext: string;
  voiceParameters: VoiceParameters;
  sortOrder: number;
}

/**
 * Default conversation styles from configuration
 */
const DEFAULT_CONVERSATION_STYLES: Record<string, ConversationStyleDefinition> = {
  respectful: {
    displayName: "Respectful",
    description: "Formal, polite tone for authority figures and elders",
    relationshipContext: "parent_to_child",
    sortOrder: 1,
    voiceParameters: {
      stability: { mean: 0.85, range: [0.8, 0.9] },
      similarity_boost: { mean: 0.9, range: [0.85, 0.95] },
      style: { mean: 0.4, range: [0.3, 0.5] },
      prosody: {
        pitch: { base: "-2%", range: [-1, 1] },
        rate: { base: "85%", range: [80, 90] },
        volume: "medium"
      }
    }
  },
  business: {
    displayName: "Business",
    description: "Professional, confident tone for workplace relationships",
    relationshipContext: "professional",
    sortOrder: 2,
    voiceParameters: {
      stability: { mean: 0.9, range: [0.85, 0.95] },
      similarity_boost: { mean: 0.92, range: [0.88, 0.96] },
      style: { mean: 0.3, range: [0.2, 0.4] },
      prosody: {
        pitch: { base: "0%", range: [-2, 2] },
        rate: { base: "90%", range: [85, 95] },
        volume: "medium"
      }
    }
  },
  jovial: {
    displayName: "Jovial",
    description: "Cheerful, upbeat tone for celebrations and happy occasions",
    relationshipContext: "casual",
    sortOrder: 3,
    voiceParameters: {
      stability: { mean: 0.75, range: [0.7, 0.8] },
      similarity_boost: { mean: 0.85, range: [0.8, 0.9] },
      style: { mean: 0.6, range: [0.5, 0.7] },
      prosody: {
        pitch: { base: "+5%", range: [3, 7] },
        rate: { base: "100%", range: [95, 105] },
        volume: "loud"
      }
    }
  },
  playful: {
    displayName: "Playful",
    description: "Fun, energetic tone for casual interactions and entertainment",
    relationshipContext: "casual",
    sortOrder: 4,
    voiceParameters: {
      stability: { mean: 0.7, range: [0.65, 0.75] },
      similarity_boost: { mean: 0.83, range: [0.8, 0.88] },
      style: { mean: 0.7, range: [0.6, 0.8] },
      prosody: {
        pitch: { base: "+8%", range: [5, 10] },
        rate: { base: "105%", range: [100, 110] },
        volume: "medium"
      }
    }
  },
  close_friends: {
    displayName: "Close Friends",
    description: "Warm, intimate tone for close personal relationships",
    relationshipContext: "intimate",
    sortOrder: 5,
    voiceParameters: {
      stability: { mean: 0.8, range: [0.75, 0.85] },
      similarity_boost: { mean: 0.87, range: [0.82, 0.9] },
      style: { mean: 0.65, range: [0.55, 0.75] },
      prosody: {
        pitch: { base: "+3%", range: [0, 5] },
        rate: { base: "95%", range: [90, 100] },
        volume: "medium"
      }
    }
  },
  parent_to_child: {
    displayName: "Parent to Child",
    description: "Nurturing, caring tone for parent-child relationships",
    relationshipContext: "parent_to_child",
    sortOrder: 6,
    voiceParameters: {
      stability: { mean: 0.85, range: [0.8, 0.9] },
      similarity_boost: { mean: 0.88, range: [0.85, 0.92] },
      style: { mean: 0.5, range: [0.4, 0.6] },
      prosody: {
        pitch: { base: "-2%", range: [-2, 2] },
        rate: { base: "85%", range: [80, 90] },
        volume: "medium"
      }
    }
  },
  child_to_parent: {
    displayName: "Child to Parent",
    description: "Respectful yet affectionate tone for child-parent relationships",
    relationshipContext: "child_to_parent",
    sortOrder: 7,
    voiceParameters: {
      stability: { mean: 0.75, range: [0.7, 0.8] },
      similarity_boost: { mean: 0.83, range: [0.8, 0.87] },
      style: { mean: 0.65, range: [0.55, 0.75] },
      prosody: {
        pitch: { base: "+6%", range: [3, 8] },
        rate: { base: "95%", range: [90, 100] },
        volume: "medium"
      }
    }
  },
  siblings: {
    displayName: "Siblings",
    description: "Familiar, comfortable tone for sibling relationships",
    relationshipContext: "sibling",
    sortOrder: 8,
    voiceParameters: {
      stability: { mean: 0.78, range: [0.73, 0.83] },
      similarity_boost: { mean: 0.86, range: [0.82, 0.9] },
      style: { mean: 0.7, range: [0.6, 0.8] },
      prosody: {
        pitch: { base: "+4%", range: [2, 6] },
        rate: { base: "98%", range: [92, 105] },
        volume: "medium"
      }
    }
  }
};

/**
 * Singleton class for managing conversation styles
 */
class ConversationStylesManager {
  private static instance: ConversationStylesManager;
  private stylesCache: Map<string, ConversationStyle> = new Map();
  private initialized = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ConversationStylesManager {
    if (!ConversationStylesManager.instance) {
      ConversationStylesManager.instance = new ConversationStylesManager();
    }
    return ConversationStylesManager.instance;
  }

  /**
   * Initialize conversation styles from database or create defaults
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load existing styles from database
      const existingStyles = await db.select().from(conversationStyles);
      
      // Cache existing styles
      for (const style of existingStyles) {
        this.stylesCache.set(style.styleKey, style);
      }

      // Create missing default styles
      const missingStyles: InsertConversationStyle[] = [];
      
      for (const [styleKey, definition] of Object.entries(DEFAULT_CONVERSATION_STYLES)) {
        if (!this.stylesCache.has(styleKey)) {
          missingStyles.push({
            styleKey,
            displayName: definition.displayName,
            description: definition.description,
            voiceParameters: definition.voiceParameters,
            relationshipContext: definition.relationshipContext,
            sortOrder: definition.sortOrder,
            isActive: true
          });
        }
      }

      // Insert missing styles
      if (missingStyles.length > 0) {
        const insertedStyles = await db
          .insert(conversationStyles)
          .values(missingStyles)
          .returning();

        // Cache the new styles
        for (const style of insertedStyles) {
          this.stylesCache.set(style.styleKey, style);
        }

        console.log(`[ConversationStylesManager] Created ${missingStyles.length} default conversation styles`);
      }

      this.initialized = true;
      console.log(`[ConversationStylesManager] Initialized with ${this.stylesCache.size} conversation styles`);
    } catch (error) {
      console.error('[ConversationStylesManager] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Get all active conversation styles
   */
  async getActiveStyles(): Promise<ConversationStyle[]> {
    await this.initialize();
    return Array.from(this.stylesCache.values())
      .filter(style => style.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Get conversation style by key
   */
  async getStyle(styleKey: string): Promise<ConversationStyle | null> {
    await this.initialize();
    return this.stylesCache.get(styleKey) || null;
  }

  /**
   * Get voice parameters for a conversation style
   */
  async getVoiceParameters(styleKey: string): Promise<VoiceParameters | null> {
    const style = await this.getStyle(styleKey);
    return style ? style.voiceParameters as VoiceParameters : null;
  }

  /**
   * Create or update a conversation style
   */
  async upsertStyle(styleKey: string, definition: Partial<ConversationStyleDefinition>): Promise<ConversationStyle> {
    await this.initialize();

    const existingStyle = this.stylesCache.get(styleKey);
    
    if (existingStyle) {
      // Update existing style
      const updateData = {
        displayName: definition.displayName || existingStyle.displayName,
        description: definition.description || existingStyle.description,
        voiceParameters: definition.voiceParameters || existingStyle.voiceParameters,
        relationshipContext: definition.relationshipContext || existingStyle.relationshipContext,
        sortOrder: definition.sortOrder ?? existingStyle.sortOrder,
        updatedAt: new Date()
      };

      await db
        .update(conversationStyles)
        .set(updateData)
        .where(eq(conversationStyles.styleKey, styleKey));

      const updatedStyle = { ...existingStyle, ...updateData };
      this.stylesCache.set(styleKey, updatedStyle);
      return updatedStyle;
    } else {
      // Create new style
      const insertData: InsertConversationStyle = {
        styleKey,
        displayName: definition.displayName || styleKey,
        description: definition.description || '',
        voiceParameters: definition.voiceParameters || DEFAULT_CONVERSATION_STYLES.respectful.voiceParameters,
        relationshipContext: definition.relationshipContext || 'casual',
        sortOrder: definition.sortOrder || 999,
        isActive: true
      };

      const [newStyle] = await db
        .insert(conversationStyles)
        .values(insertData)
        .returning();

      this.stylesCache.set(styleKey, newStyle);
      return newStyle;
    }
  }

  /**
   * Deactivate a conversation style
   */
  async deactivateStyle(styleKey: string): Promise<void> {
    await this.initialize();
    
    const style = this.stylesCache.get(styleKey);
    if (style) {
      await db
        .update(conversationStyles)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(conversationStyles.styleKey, styleKey));

      this.stylesCache.set(styleKey, { ...style, isActive: false });
    }
  }

  /**
   * Get conversation styles for a relationship context
   */
  async getStylesForContext(relationshipContext: string): Promise<ConversationStyle[]> {
    await this.initialize();
    return Array.from(this.stylesCache.values())
      .filter(style => style.isActive && style.relationshipContext === relationshipContext)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Clear cache and reinitialize
   */
  async refresh(): Promise<void> {
    this.stylesCache.clear();
    this.initialized = false;
    await this.initialize();
  }
}

// Export singleton instance
export const conversationStylesManager = ConversationStylesManager.getInstance();

// Export types for external use
export type { VoiceParameters, ConversationStyleDefinition };