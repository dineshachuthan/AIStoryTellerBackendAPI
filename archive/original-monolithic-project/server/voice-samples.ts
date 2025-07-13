import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * Voice Samples Service - ESM Reference Data Architecture
 * Pulls emotions/sounds/modulations from new ESM reference tables
 */

export async function getVoiceSamplesByType(type: 'emotions' | 'sounds' | 'descriptions'): Promise<any[]> {
  try {
    const refDataResults: any[] = [];
    let category: number;
    
    // Map type to ESM category
    if (type === 'emotions') {
      category = 1; // Emotions
    } else if (type === 'sounds') {
      category = 2; // Sounds/Voice Traits
    } else {
      category = 3; // Modulations/Descriptions
    }
    
    // Get reference data from ESM tables
    const esmData = await db.execute(
      sql`SELECT esm_ref_id, name, display_name, sample_text, intensity, description, ai_variations
          FROM esm_ref 
          WHERE category = ${category}
          ORDER BY display_name`
    );
    
    console.log(`Found ${esmData.rows.length} ESM reference entries for category ${category} (${type})`);
    
    for (const item of esmData.rows) {
      refDataResults.push({
        emotion: item.name,
        displayName: item.display_name,
        sampleText: item.sample_text,
        category: type,
        intensity: item.intensity || 5,
        description: item.description,
        esmRefId: item.esm_ref_id,
        isReferenceData: true,
        aiVariations: item.ai_variations
      });
    }
    
    console.log(`Returning ${refDataResults.length} ${type} samples from ESM reference data`);
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