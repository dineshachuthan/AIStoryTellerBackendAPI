/**
 * Sample Text Core - Unified sample text generation logic
 * Used by both story analysis and primary sample text generator
 */

import OpenAI from 'openai';
import { VOICE_RECORDING_CONFIG } from '@shared/config/voice-recording-config';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SampleTextParams {
  emotion: string;
  displayName?: string;
  context?: string;
  quote?: string;
  storyContent?: string;
  intensity?: number;
}

export interface SampleTextResult {
  sampleText: string;
  wordCount: number;
  estimatedDuration: number;
  source: 'story_quote' | 'story_context' | 'ai_generated';
}

export class SampleTextCore {
  /**
   * Check if text is suitable for voice cloning (45-60 words, 15+ seconds)
   */
  private static isTextSuitable(text: string): boolean {
    if (!text || text.trim().length === 0) return false;
    
    const words = text.trim().split(/\s+/);
    const wordCount = words.length;
    const charCount = text.length;
    
    // Check if within optimal range for voice cloning
    return wordCount >= VOICE_RECORDING_CONFIG.MIN_WORDS && 
           wordCount <= VOICE_RECORDING_CONFIG.MAX_WORDS &&
           charCount >= 80; // Minimum character count for quality
  }

  /**
   * Generate sample text using unified logic and configuration
   */
  static async generateSampleText(params: SampleTextParams): Promise<SampleTextResult> {
    const { emotion, displayName, context, quote, storyContent, intensity } = params;
    
    // Priority 1: Use story quote if suitable length
    if (quote && this.isTextSuitable(quote)) {
      console.log(`✅ Using story quote for ${emotion}: "${quote.substring(0, 50)}..."`);
      return {
        sampleText: quote,
        wordCount: quote.trim().split(/\s+/).length,
        estimatedDuration: Math.round((quote.trim().split(/\s+/).length / 2.5) * 10) / 10,
        source: 'story_quote'
      };
    }

    // Priority 2: Use story context if suitable length
    if (context && this.isTextSuitable(context)) {
      console.log(`✅ Using story context for ${emotion}: "${context.substring(0, 50)}..."`);
      return {
        sampleText: context,
        wordCount: context.trim().split(/\s+/).length,
        estimatedDuration: Math.round((context.trim().split(/\s+/).length / 2.5) * 10) / 10,
        source: 'story_context'
      };
    }

    // Priority 3: Generate contextual text using OpenAI
    return await this.generateAIText(params);
  }

  /**
   * Generate AI-powered sample text with story context
   */
  private static async generateAIText(params: SampleTextParams): Promise<SampleTextResult> {
    const { emotion, displayName, storyContent, intensity } = params;
    
    try {
      console.log(`🤖 Generating contextual sample text for ${emotion}`);
      
      // Build context-aware prompt
      let prompt = `Generate a voice recording sample text for the emotion "${displayName || emotion}".`;
      
      if (storyContent) {
        prompt += ` Consider this story context: "${storyContent.substring(0, 200)}..."`;
      }
      
      if (intensity) {
        prompt += ` The emotion intensity is ${intensity}/10.`;
      }
      
      prompt += `

Requirements:
- Exactly ${VOICE_RECORDING_CONFIG.MIN_WORDS}-${VOICE_RECORDING_CONFIG.MAX_WORDS} words for ${VOICE_RECORDING_CONFIG.MIN_DURATION}-${VOICE_RECORDING_CONFIG.MAX_DURATION} seconds of speech
- Must clearly express ${displayName || emotion} emotion
- Natural conversational language, first person perspective
- Emotionally engaging so speaker naturally expresses the emotion
- No character names or complex story references
- Include natural pauses and emotional emphasis

Respond with just the sample text, no JSON or formatting.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 200
      });

      const sampleText = response.choices[0].message.content?.trim() || 
        `Express the emotion of ${emotion} in your voice with genuine feeling and natural pacing.`;
      
      const wordCount = sampleText.trim().split(/\s+/).length;
      
      console.log(`✅ Generated AI text for ${emotion}: "${sampleText.substring(0, 50)}..." (${wordCount} words)`);
      
      return {
        sampleText,
        wordCount,
        estimatedDuration: Math.round((wordCount / 2.5) * 10) / 10,
        source: 'ai_generated'
      };
      
    } catch (error) {
      console.error(`Error generating AI sample text for ${emotion}:`, error);
      
      // Fallback to professional template
      const fallbackText = `Express the emotion of ${emotion} in your voice with genuine feeling, natural pacing, and clear articulation. Let the ${emotion} come through naturally in your tone, rhythm, and expression as you speak these words with authentic emotional resonance.`;
      
      return {
        sampleText: fallbackText,
        wordCount: fallbackText.trim().split(/\s+/).length,
        estimatedDuration: Math.round((fallbackText.trim().split(/\s+/).length / 2.5) * 10) / 10,
        source: 'ai_generated'
      };
    }
  }

  /**
   * Generate sample texts for multiple emotions/sounds in batch
   */
  static async generateBatchSampleTexts(
    items: SampleTextParams[]
  ): Promise<SampleTextResult[]> {
    const results: SampleTextResult[] = [];
    
    // Process items in batches to avoid rate limits
    for (let i = 0; i < items.length; i += 3) {
      const batch = items.slice(i, i + 3);
      
      const batchPromises = batch.map(item => this.generateSampleText(item));
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults);
      
      // Small delay between batches to respect rate limits
      if (i + 3 < items.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}