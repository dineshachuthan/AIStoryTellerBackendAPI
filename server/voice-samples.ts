import { db } from "./db";
import { storyAnalyses } from "@shared/schema";

/**
 * Voice Samples Service - Data-driven voice sample management
 * Pulls emotions/sounds/modulations from story analysis results across all users
 */

export async function getVoiceSamplesByType(type: 'emotions' | 'sounds' | 'descriptions'): Promise<any[]> {
  try {
    // Query all story analyses to extract emotions/sounds/modulations
    const analyses = await db.select().from(storyAnalyses);
    
    const uniqueItems = new Set<string>();
    const results: any[] = [];
    
    for (const analysis of analyses) {
      const analysisData = analysis.analysisData as any;
      
      if (type === 'emotions' && analysisData?.emotions) {
        for (const emotion of analysisData.emotions) {
          const emotionKey = emotion.emotion?.toLowerCase();
          if (emotionKey && !uniqueItems.has(emotionKey)) {
            uniqueItems.add(emotionKey);
            results.push({
              emotion: emotionKey,
              displayName: emotion.emotion,
              sampleText: emotion.context || `Express ${emotion.emotion} emotion`,
              category: 'emotions',
              intensity: emotion.intensity || 5,
              storySource: analysis.storyId
            });
          }
        }
      }
      
      if (type === 'sounds' && analysisData?.characters) {
        for (const character of analysisData.characters) {
          if (character.traits) {
            for (const trait of character.traits) {
              const traitLower = trait.toLowerCase();
              if (traitLower.includes('sound') || traitLower.includes('voice')) {
                const soundKey = `${character.name}_${trait}`.toLowerCase().replace(/\s+/g, '_');
                if (!uniqueItems.has(soundKey)) {
                  uniqueItems.add(soundKey);
                  results.push({
                    emotion: soundKey,
                    displayName: `${character.name} - ${trait}`,
                    sampleText: `Make the sound of ${character.name}: ${trait}`,
                    category: 'sounds',
                    storySource: analysis.storyId
                  });
                }
              }
            }
          }
        }
      }
      
      if (type === 'descriptions' && analysisData?.moodCategory) {
        const moodKey = analysisData.moodCategory.toLowerCase().replace(/\s+/g, '_');
        if (!uniqueItems.has(moodKey)) {
          uniqueItems.add(moodKey);
          results.push({
            emotion: moodKey,
            displayName: analysisData.moodCategory,
            sampleText: `Narrate in ${analysisData.moodCategory} style`,
            category: 'descriptions',
            storySource: analysis.storyId
          });
        }
      }
    }
    
    console.log(`Found ${results.length} unique ${type} from story analyses`);
    return results;
  } catch (error) {
    console.error(`Error getting voice samples for type ${type}:`, error);
    return [];
  }
}

export async function getAllVoiceSamples(): Promise<any[]> {
  try {
    const [emotions, sounds, descriptions] = await Promise.all([
      getVoiceSamplesByType('emotions'),
      getVoiceSamplesByType('sounds'),
      getVoiceSamplesByType('descriptions')
    ]);
    
    const allSamples = [...emotions, ...sounds, ...descriptions];
    console.log(`Found ${allSamples.length} total voice samples from story analyses`);
    return allSamples;
  } catch (error) {
    console.error("Error getting all voice samples:", error);
    return [];
  }
}

export async function getVoiceSampleProgress(completedSamples: string[]): Promise<{
  completed: number;
  total: number;
  percentage: number;
  remaining: number;
  isComplete: boolean;
}> {
  try {
    // Get total available samples from story analyses
    const allSamples = await getAllVoiceSamples();
    const total = allSamples.length;
    const completed = completedSamples.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      completed,
      total,
      percentage,
      remaining: Math.max(0, total - completed),
      isComplete: completed >= total && total > 0,
    };
  } catch (error) {
    console.error("Error calculating voice sample progress:", error);
    return {
      completed: completedSamples.length,
      total: 0,
      percentage: 0,
      remaining: 0,
      isComplete: false,
    };
  }
}