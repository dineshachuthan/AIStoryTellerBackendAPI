import { db } from "./db";
import { storyAnalyses, voiceModulationTemplates, referenceStoryAnalyses } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Voice Samples Service - Data-driven voice sample management
 * Pulls emotions/sounds/modulations from story analysis results across all users
 */

export async function getVoiceSamplesByType(type: 'emotions' | 'sounds' | 'descriptions'): Promise<any[]> {
  try {
    // Priority 1: Get reference data from voice_modulation_templates table
    const refDataResults: any[] = [];
    let modulationType: string;
    
    if (type === 'emotions') {
      modulationType = 'emotion';
    } else if (type === 'sounds') {
      modulationType = 'sound';
    } else {
      modulationType = 'modulation';
    }
    
    const templates = await db
      .select()
      .from(voiceModulationTemplates)
      .where(eq(voiceModulationTemplates.modulationType, modulationType));
    
    for (const template of templates) {
      refDataResults.push({
        emotion: template.modulationKey,
        displayName: template.displayName,
        sampleText: template.sampleText,
        category: template.category || type,
        intensity: template.voiceSettings?.emotion_intensity || 5,
        storySource: 'reference_data', // Mark as reference data
        targetDuration: template.targetDuration || 8,
        isReferenceData: true
      });
    }
    
    console.log(`Found ${refDataResults.length} reference data templates for ${type}`);
    
    // Priority 2: Get emotions from reference story analyses (shared narrative data)
    const referenceAnalyses = await db.select().from(referenceStoryAnalyses);
    const uniqueItems = new Set<string>(refDataResults.map(r => r.emotion));
    
    for (const analysis of referenceAnalyses) {
      const analysisData = analysis.analysisData as any;
      
      if (type === 'emotions' && analysisData?.emotions) {
        for (const emotion of analysisData.emotions) {
          const emotionKey = emotion.emotion?.toLowerCase();
          if (emotionKey && !uniqueItems.has(emotionKey)) {
            uniqueItems.add(emotionKey);
            refDataResults.push({
              emotion: emotionKey,
              displayName: emotion.emotion,
              sampleText: emotion.context || `Express ${emotion.emotion} emotion`,
              category: 'emotions',
              intensity: emotion.intensity || 5,
              storySource: analysis.referenceStoryId,
              isReferenceData: false
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
                  refDataResults.push({
                    emotion: soundKey,
                    displayName: `${character.name} - ${trait}`,
                    sampleText: `Make the sound of ${character.name}: ${trait}`,
                    category: 'sounds',
                    storySource: analysis.referenceStoryId,
                    isReferenceData: false
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
          refDataResults.push({
            emotion: moodKey,
            displayName: analysisData.moodCategory,
            sampleText: `Narrate in ${analysisData.moodCategory} style`,
            category: 'descriptions',
            storySource: analysis.referenceStoryId,
            isReferenceData: false
          });
        }
      }
    }
    
    console.log(`Found ${refDataResults.length} total ${type} samples (${templates.length} reference data + ${refDataResults.length - templates.length} story analysis)`);
    return refDataResults;
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