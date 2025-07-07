/**
 * Voice Sample Text Generator Service
 * Generates appropriate 6-second sample texts for emotions using OpenAI
 */

import OpenAI from 'openai';
import { storage } from './storage';
import { VOICE_RECORDING_CONFIG } from '@shared/voice-recording-config';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface GeneratedSampleText {
  emotion: string;
  displayName: string;
  sampleText: string;
  estimatedDuration: number;
  wordCount: number;
  esmRefId: number;
}

export class VoiceSampleTextGenerator {
  /**
   * Generate 6-second sample texts for all emotions in database
   */
  async generateAllEmotionTexts(): Promise<{ updated: number; errors: string[] }> {
    try {
      // Get all emotions from ESM reference data
      const emotions = await storage.getEsmRefsByCategory(1); // Category 1 = emotions
      
      let updated = 0;
      const errors: string[] = [];
      
      console.log(`🎙️ Generating 6-second sample texts for ${emotions.length} emotions...`);
      
      // Process emotions in batches to avoid rate limits
      for (let i = 0; i < emotions.length; i += 5) {
        const batch = emotions.slice(i, i + 5);
        
        try {
          const batchResults = await this.generateBatchTexts(batch);
          
          // Update database with new sample texts
          for (const result of batchResults) {
            try {
              await storage.updateEsmRef(result.esmRefId, { sample_text: result.sampleText });
              updated++;
              console.log(`✅ Updated ${result.displayName}: "${result.sampleText.substring(0, 50)}..."`);
            } catch (error) {
              const errorMsg = `Failed to update ${result.emotion}: ${error instanceof Error ? error.message : String(error)}`;
              errors.push(errorMsg);
              console.error(errorMsg);
            }
          }
          
          // Small delay between batches
          if (i + 5 < emotions.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          const errorMsg = `Failed to generate batch ${i}-${i+5}: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }
      
      return { updated, errors };
    } catch (error) {
      console.error('Error generating emotion texts:', error);
      return { updated: 0, errors: [error instanceof Error ? error.message : String(error)] };
    }
  }

  /**
   * Generate sample texts for a batch of emotions
   */
  private async generateBatchTexts(emotions: any[]): Promise<GeneratedSampleText[]> {
    const emotionList = emotions.map(e => `${e.name} (${e.display_name})`).join(', ');
    
    const prompt = `You are creating voice recording sample texts for emotion voice cloning. Each text must be exactly ${VOICE_RECORDING_CONFIG.MIN_WORDS}-${VOICE_RECORDING_CONFIG.MAX_WORDS} words long to take approximately ${VOICE_RECORDING_CONFIG.MIN_DURATION}-${VOICE_RECORDING_CONFIG.MAX_DURATION} seconds to read aloud at normal speaking speed.

Create engaging, emotionally expressive sample texts for these emotions: ${emotionList}

Requirements:
- Each text must be ${VOICE_RECORDING_CONFIG.MIN_WORDS}-${VOICE_RECORDING_CONFIG.MAX_WORDS} words (for ~${VOICE_RECORDING_CONFIG.MIN_DURATION}-${VOICE_RECORDING_CONFIG.MAX_DURATION} second reading time)
- Must clearly express the specific emotion
- Should be natural dialogue or narrative that someone would enjoy reading
- Avoid character names or complex scenarios
- Make it emotionally engaging so the speaker naturally expresses the emotion
- Include natural pauses and emotional emphasis

Respond with JSON in this format:
{
  "samples": [
    {
      "emotion": "emotion_name",
      "displayName": "Display Name", 
      "sampleText": "Your ${VOICE_RECORDING_CONFIG.MIN_WORDS}-${VOICE_RECORDING_CONFIG.MAX_WORDS} word sample text here...",
      "wordCount": 50
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7 // Slightly creative for variety
    });

    const result = JSON.parse(response.choices[0].message.content || '{"samples": []}');
    
    return result.samples.map((sample: any) => {
      const matchingEmotion = emotions.find(e => e.name === sample.emotion);
      return {
        emotion: sample.emotion,
        displayName: sample.displayName,
        sampleText: sample.sampleText,
        estimatedDuration: Math.round((sample.wordCount / 2.5) * 10) / 10, // ~2.5 words per second
        wordCount: sample.wordCount,
        esmRefId: matchingEmotion?.esm_ref_id || matchingEmotion?.id
      };
    });
  }

  /**
   * Generate sample text for a single emotion
   */
  async generateSingleEmotionText(emotion: string, displayName: string, esmRefId: number): Promise<GeneratedSampleText> {
    const prompt = `Create a voice recording sample text for the emotion "${displayName}" (${emotion}). 

The text must be exactly ${VOICE_RECORDING_CONFIG.MIN_WORDS}-${VOICE_RECORDING_CONFIG.MAX_WORDS} words long to take approximately ${VOICE_RECORDING_CONFIG.MIN_DURATION}-${VOICE_RECORDING_CONFIG.MAX_DURATION} seconds to read aloud at normal speaking speed.

Requirements:
- Must be ${VOICE_RECORDING_CONFIG.MIN_WORDS}-${VOICE_RECORDING_CONFIG.MAX_WORDS} words (for ~${VOICE_RECORDING_CONFIG.MIN_DURATION}-${VOICE_RECORDING_CONFIG.MAX_DURATION} second reading time)
- Must clearly express ${displayName} emotion
- Should be natural dialogue or narrative
- Emotionally engaging so the speaker naturally expresses the emotion
- No character names or complex scenarios

Respond with JSON:
{
  "emotion": "${emotion}",
  "displayName": "${displayName}",
  "sampleText": "Your sample text here...",
  "wordCount": 50
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      emotion: result.emotion,
      displayName: result.displayName,
      sampleText: result.sampleText,
      estimatedDuration: Math.round((result.wordCount / 2.5) * 10) / 10,
      wordCount: result.wordCount,
      esmRefId: esmRefId
    };
  }
}

export const voiceSampleTextGenerator = new VoiceSampleTextGenerator();