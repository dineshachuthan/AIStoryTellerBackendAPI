import { RolePlayAnalysis } from '../roleplay-analysis';
import { ExtractedCharacter, ExtractedEmotion } from '../ai-analysis';

export interface KlingPromptData {
  characters: Array<{
    name: string;
    physicalDescription: string;
    personality: string;
    role: string;
    voiceProfile?: string;
    imageUrls?: string[];
    emotionalState?: string;
  }>;
  scenes: Array<{
    location: string;
    timeOfDay: string;
    atmosphere: string;
    lighting: string;
    visualDetails: string;
    backgroundDescription: string;
    dialogue?: string;
    duration?: number;
  }>;
  storyContext: {
    genre: string;
    mood: string;
    themes: string[];
    narrative: string;
  };
  technicalSpecs: {
    duration: number;
    aspectRatio: string;
    quality: 'std' | 'pro';
    cameraMovement?: string;
  };
}

export class KlingPromptTemplate {
  /**
   * Generate optimized Kling AI prompt from roleplay analysis data
   */
  static generatePrompt(data: KlingPromptData): string {
    let prompt = '';

    // CHARACTER SECTION - Detailed character descriptions
    if (data.characters.length > 0) {
      prompt += 'CHARACTERS: ';
      const characterDescs = data.characters.map(char => {
        let desc = `${char.name}`;
        
        // Physical appearance
        if (char.physicalDescription) {
          desc += ` (${this.sanitizeContent(char.physicalDescription)})`;
        }
        
        // Personality and emotional state
        if (char.personality) {
          desc += ` with ${this.sanitizeContent(char.personality)} personality`;
        }
        
        if (char.emotionalState) {
          desc += `, currently ${this.sanitizeContent(char.emotionalState)}`;
        }
        
        // Role in story
        if (char.role) {
          desc += ` serving as ${char.role}`;
        }

        return desc;
      }).join(', ');
      
      prompt += `${characterDescs}. `;
    }

    // SCENE SECTION - Rich environmental details
    if (data.scenes.length > 0) {
      prompt += 'SCENES: ';
      const sceneDescs = data.scenes.slice(0, 3).map((scene, index) => {
        let desc = `Scene ${index + 1}`;
        
        // Location and setting
        if (scene.location) {
          desc += ` in ${this.sanitizeContent(scene.location)}`;
        }
        
        // Time and atmosphere
        if (scene.timeOfDay) {
          desc += ` during ${scene.timeOfDay}`;
        }
        
        if (scene.atmosphere) {
          desc += ` with ${this.sanitizeContent(scene.atmosphere)} atmosphere`;
        }
        
        // Lighting and visual details
        if (scene.lighting) {
          desc += `, featuring ${scene.lighting} lighting`;
        }
        
        if (scene.visualDetails) {
          desc += `, ${this.sanitizeContent(scene.visualDetails)}`;
        }
        
        // Background description
        if (scene.backgroundDescription) {
          desc += `. ${this.sanitizeContent(scene.backgroundDescription)}`;
        }

        return desc;
      }).join('. ');
      
      prompt += `${sceneDescs}. `;
    }

    // STORY CONTEXT - Narrative and thematic elements
    prompt += 'STORY CONTEXT: ';
    let contextDesc = '';
    
    if (data.storyContext.genre) {
      contextDesc += `${data.storyContext.genre} genre`;
    }
    
    if (data.storyContext.mood) {
      contextDesc += ` with ${data.storyContext.mood} mood`;
    }
    
    if (data.storyContext.themes.length > 0) {
      contextDesc += `, exploring themes of ${data.storyContext.themes.slice(0, 3).join(', ')}`;
    }
    
    if (data.storyContext.narrative) {
      contextDesc += `. ${this.sanitizeContent(data.storyContext.narrative.substring(0, 200))}`;
    }
    
    prompt += `${contextDesc}. `;

    // VISUAL STYLE - Technical and artistic direction
    prompt += 'VISUAL STYLE: ';
    let styleDesc = 'Professional cinematic video with ';
    
    // Camera movement
    if (data.technicalSpecs.cameraMovement) {
      styleDesc += `${data.technicalSpecs.cameraMovement} camera movements, `;
    } else {
      styleDesc += 'dynamic camera movements, ';
    }
    
    // Quality and production values
    if (data.technicalSpecs.quality === 'pro') {
      styleDesc += 'high-end production quality, rich detailed environments, expressive character animations, natural lighting transitions, and immersive storytelling with smooth motion and engaging visual narrative';
    } else {
      styleDesc += 'polished production quality, detailed environments, character expressions, good lighting, and engaging visual storytelling';
    }
    
    prompt += styleDesc;

    // Log prompt details for debugging
    console.log('Generated Kling prompt:', {
      totalLength: prompt.length,
      charactersCount: data.characters.length,
      scenesCount: data.scenes.length,
      duration: data.technicalSpecs.duration,
      quality: data.technicalSpecs.quality
    });

    return prompt;
  }

  /**
   * Extract prompt data from our roleplay analysis
   */
  static extractFromRoleplayAnalysis(
    roleplayAnalysis: RolePlayAnalysis,
    storyContent: string,
    duration: number = 20,
    quality: 'std' | 'pro' = 'std'
  ): KlingPromptData {
    const data: KlingPromptData = {
      characters: [],
      scenes: [],
      storyContext: {
        genre: '',
        mood: '',
        themes: [],
        narrative: ''
      },
      technicalSpecs: {
        duration,
        aspectRatio: '16:9',
        quality,
        cameraMovement: 'smooth cinematic'
      }
    };

    // Extract characters
    if (roleplayAnalysis.characters) {
      data.characters = roleplayAnalysis.characters.map(char => ({
        name: char.name || 'Character',
        physicalDescription: char.description || char.appearance || '',
        personality: Array.isArray(char.traits) ? char.traits.join(', ') : (char.personality || ''),
        role: char.role || 'character',
        voiceProfile: char.assignedVoice,
        imageUrls: char.imageUrl ? [char.imageUrl] : [],
        emotionalState: char.dominantEmotion || ''
      }));
    }

    // Extract scenes
    if (roleplayAnalysis.scenes) {
      data.scenes = roleplayAnalysis.scenes.map(scene => ({
        location: scene.background?.location || scene.title || 'scene location',
        timeOfDay: scene.background?.timeOfDay || 'daytime',
        atmosphere: scene.background?.atmosphere || scene.mood || 'neutral',
        lighting: scene.background?.lighting || 'natural lighting',
        visualDetails: scene.background?.visualDescription || scene.backgroundDescription || '',
        backgroundDescription: scene.backgroundDescription || scene.description || '',
        dialogue: scene.dialogue?.map(d => d.text).join(' ') || '',
        duration: Math.floor(duration / roleplayAnalysis.scenes.length)
      }));
    }

    // Extract story context
    data.storyContext = {
      genre: roleplayAnalysis.genre || 'drama',
      mood: roleplayAnalysis.mood || 'engaging',
      themes: roleplayAnalysis.themes || [],
      narrative: storyContent.substring(0, 300)
    };

    return data;
  }

  /**
   * Content sanitization for Kling AI compliance
   */
  private static sanitizeContent(content: string): string {
    return content
      // Violence and conflict
      .replace(/\b(violence|violent|kill|murder|death|blood|weapon|fight|attack)\b/gi, 'conflict')
      .replace(/\b(steal|stolen|theft|crime|criminal|rob)\b/gi, 'adventure')
      // Inappropriate content
      .replace(/\b(explicit|inappropriate|adult|mature)\b/gi, 'dramatic')
      // Fear and negative emotions
      .replace(/\b(terrified|terror|fear|scary|frightening)\b/gi, 'surprised')
      .replace(/\b(disgusting|revolting|horrible)\b/gi, 'unpleasant')
      // AI/technology themes
      .replace(/\b(AI|artificial intelligence|robot|android|cyborg)\b/gi, 'technology')
      .replace(/\b(control|controlling|manipulation|manipulate)\b/gi, 'influence')
      // Dark themes
      .replace(/\b(dark|darkness|shadow|evil|sinister|menacing)\b/gi, 'mysterious')
      // Medical/disability content
      .replace(/\b(disease|illness|disabled|paralyzed|paralysed)\b/gi, 'challenge')
      // Enhance positive descriptors
      .replace(/\b(beautiful|gorgeous|stunning)\b/gi, 'visually striking')
      .replace(/\b(magical|mystical|enchanting)\b/gi, 'wondrous');
  }
}