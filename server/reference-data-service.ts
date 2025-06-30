import { db } from "./db";
import { voiceModulationTemplates } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { StoryAnalysis } from "./ai-analysis";

/**
 * Reference Data Service - Stores extracted emotions, sounds, and modulations
 * as permanent reference data for the voice samples system
 */

export class ReferenceDataService {
  /**
   * Store emotions from story analysis as permanent reference data
   */
  async storeEmotionsFromAnalysis(analysis: StoryAnalysis, storyId: number): Promise<void> {
    if (!analysis.emotions || analysis.emotions.length === 0) {
      console.log("No emotions found in analysis to store as reference data");
      return;
    }

    for (const emotion of analysis.emotions) {
      if (!emotion.emotion) continue;
      
      const emotionKey = emotion.emotion.toLowerCase().replace(/\s+/g, '_');
      
      try {
        // Check if this emotion already exists as reference data
        const existing = await db
          .select()
          .from(voiceModulationTemplates)
          .where(
            and(
              eq(voiceModulationTemplates.modulationType, 'emotion'),
              eq(voiceModulationTemplates.modulationKey, emotionKey)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          // Store new emotion as reference data
          await db.insert(voiceModulationTemplates).values({
            modulationType: 'emotion',
            modulationKey: emotionKey,
            displayName: emotion.emotion,
            description: `Express ${emotion.emotion} emotion`,
            sampleText: emotion.context || emotion.quote || `Express ${emotion.emotion} with feeling`,
            targetDuration: Math.max(5, Math.min(15, (emotion.intensity || 5) * 2)), // 5-15 seconds based on intensity
            category: 'emotions',
            voiceSettings: {
              speed_modifier: emotion.intensity >= 7 ? 1.1 : emotion.intensity <= 3 ? 0.9 : 1.0,
              emotion_intensity: emotion.intensity || 5
            },
            isActive: true,
            sortOrder: emotion.intensity || 5
          });
          
          console.log(`✅ Stored new emotion reference data: ${emotion.emotion} (intensity: ${emotion.intensity})`);
        } else {
          console.log(`📝 Emotion already exists as reference data: ${emotion.emotion}`);
        }
      } catch (error) {
        console.error(`❌ Failed to store emotion reference data for ${emotion.emotion}:`, error);
      }
    }
  }

  /**
   * Store character sounds from story analysis as permanent reference data
   */
  async storeSoundsFromAnalysis(analysis: StoryAnalysis, storyId: number): Promise<void> {
    if (!analysis.characters || analysis.characters.length === 0) {
      console.log("No characters found in analysis to extract sounds");
      return;
    }

    for (const character of analysis.characters) {
      if (!character.traits || character.traits.length === 0) continue;
      
      for (const trait of character.traits) {
        const traitLower = trait.toLowerCase();
        
        // Extract sound-related traits
        if (traitLower.includes('sound') || traitLower.includes('voice') || 
            traitLower.includes('growl') || traitLower.includes('whisper') ||
            traitLower.includes('shout') || traitLower.includes('sing') ||
            traitLower.includes('mumble') || traitLower.includes('roar')) {
          
          const soundKey = `${character.name.toLowerCase().replace(/\s+/g, '_')}_${trait.toLowerCase().replace(/\s+/g, '_')}`;
          
          try {
            // Check if this sound already exists as reference data
            const existing = await db
              .select()
              .from(voiceModulationTemplates)
              .where(
                and(
                  eq(voiceModulationTemplates.modulationType, 'sound'),
                  eq(voiceModulationTemplates.modulationKey, soundKey)
                )
              )
              .limit(1);

            if (existing.length === 0) {
              // Store new sound as reference data
              await db.insert(voiceModulationTemplates).values({
                modulationType: 'sound',
                modulationKey: soundKey,
                displayName: `${character.name} - ${trait}`,
                description: `Make the sound characteristic of ${character.name}`,
                sampleText: `Imitate ${character.name}: ${trait}`,
                targetDuration: 6,
                category: 'character_sounds',
                voiceSettings: {
                  character_type: character.role,
                  sound_trait: trait
                },
                isActive: true,
                sortOrder: 100
              });
              
              console.log(`✅ Stored new sound reference data: ${character.name} - ${trait}`);
            } else {
              console.log(`📝 Sound already exists as reference data: ${character.name} - ${trait}`);
            }
          } catch (error) {
            console.error(`❌ Failed to store sound reference data for ${character.name} - ${trait}:`, error);
          }
        }
      }
    }
  }

  /**
   * Store mood/style modulations from story analysis as permanent reference data
   */
  async storeModulationsFromAnalysis(analysis: StoryAnalysis, storyId: number): Promise<void> {
    const modulations: Array<{key: string, display: string, description: string, sample: string}> = [];
    
    // Extract mood category
    if (analysis.moodCategory) {
      modulations.push({
        key: analysis.moodCategory.toLowerCase().replace(/\s+/g, '_'),
        display: `${analysis.moodCategory} Mood`,
        description: `Narrate in ${analysis.moodCategory} style`,
        sample: `Read this story with a ${analysis.moodCategory.toLowerCase()} mood`
      });
    }
    
    // Extract genre-based modulations
    if (analysis.genre) {
      modulations.push({
        key: `${analysis.genre.toLowerCase().replace(/\s+/g, '_')}_genre`,
        display: `${analysis.genre} Style`,
        description: `Narrate in ${analysis.genre} genre style`,
        sample: `Tell this ${analysis.genre.toLowerCase()} story with appropriate dramatic flair`
      });
    }
    
    // Extract theme-based modulations
    if (analysis.themes && analysis.themes.length > 0) {
      for (const theme of analysis.themes.slice(0, 2)) { // Limit to first 2 themes
        modulations.push({
          key: `${theme.toLowerCase().replace(/\s+/g, '_')}_theme`,
          display: `${theme} Theme`,
          description: `Emphasize ${theme} thematic elements`,
          sample: `Narrate with emphasis on the theme of ${theme.toLowerCase()}`
        });
      }
    }

    for (const modulation of modulations) {
      try {
        // Check if this modulation already exists as reference data
        const existing = await db
          .select()
          .from(voiceModulationTemplates)
          .where(
            and(
              eq(voiceModulationTemplates.modulationType, 'modulation'),
              eq(voiceModulationTemplates.modulationKey, modulation.key)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          // Store new modulation as reference data
          await db.insert(voiceModulationTemplates).values({
            modulationType: 'modulation',
            modulationKey: modulation.key,
            displayName: modulation.display,
            description: modulation.description,
            sampleText: modulation.sample,
            targetDuration: 8,
            category: 'narrative_styles',
            voiceSettings: {
              narrative_style: modulation.key
            },
            isActive: true,
            sortOrder: 200
          });
          
          console.log(`✅ Stored new modulation reference data: ${modulation.display}`);
        } else {
          console.log(`📝 Modulation already exists as reference data: ${modulation.display}`);
        }
      } catch (error) {
        console.error(`❌ Failed to store modulation reference data for ${modulation.display}:`, error);
      }
    }
  }

  /**
   * Process complete story analysis and store all reference data
   */
  async processAnalysisForReferenceData(analysis: StoryAnalysis, storyId: number): Promise<void> {
    console.log(`🔄 Processing story ${storyId} analysis for reference data extraction...`);
    
    try {
      // Store all types of reference data in parallel
      await Promise.all([
        this.storeEmotionsFromAnalysis(analysis, storyId),
        this.storeSoundsFromAnalysis(analysis, storyId),
        this.storeModulationsFromAnalysis(analysis, storyId)
      ]);
      
      console.log(`✅ Completed reference data processing for story ${storyId}`);
    } catch (error) {
      console.error(`❌ Failed to process reference data for story ${storyId}:`, error);
    }
  }

  /**
   * Get statistics about reference data in the system
   */
  async getReferenceDataStats(): Promise<{
    emotions: number;
    sounds: number;
    modulations: number;
    total: number;
  }> {
    try {
      const [emotions, sounds, modulations] = await Promise.all([
        db.select().from(voiceModulationTemplates).where(eq(voiceModulationTemplates.modulationType, 'emotion')),
        db.select().from(voiceModulationTemplates).where(eq(voiceModulationTemplates.modulationType, 'sound')),
        db.select().from(voiceModulationTemplates).where(eq(voiceModulationTemplates.modulationType, 'modulation'))
      ]);

      return {
        emotions: emotions.length,
        sounds: sounds.length,
        modulations: modulations.length,
        total: emotions.length + sounds.length + modulations.length
      };
    } catch (error) {
      console.error("Failed to get reference data stats:", error);
      return { emotions: 0, sounds: 0, modulations: 0, total: 0 };
    }
  }
}

export const referenceDataService = new ReferenceDataService();