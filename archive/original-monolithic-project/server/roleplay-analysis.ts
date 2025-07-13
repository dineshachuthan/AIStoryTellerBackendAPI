import OpenAI from "openai";
import { withRetry } from "./db";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface DialogueLine {
  characterName: string;
  dialogue: string;
  emotion: string;
  intensity: number;
  action?: string; // Stage direction/action
}

export interface SceneBackground {
  location: string;
  timeOfDay: string;
  atmosphere: string;
  visualDescription: string;
  soundscape?: string;
  lighting?: string;
}

export interface RolePlayScene {
  sceneNumber: number;
  title: string;
  background: SceneBackground;
  dialogueSequence: DialogueLine[];
  stageDirections: string[];
  estimatedDuration: number; // in seconds
  emotionalTone: string;
}

export interface RolePlayAnalysis {
  title: string;
  genre: string;
  overallTone: string;
  totalScenes: number;
  estimatedPlaytime: number; // in minutes
  scenes: RolePlayScene[];
  characters: Array<{
    name: string;
    role: string;
    personality: string;
    voiceProfile: string;
    description?: string;
    traits?: string[];
    costumeSuggestion?: string;
    assignedVoice?: string;
    voiceSampleId?: number;
    appearance?: string;
  }>;
  productionNotes: string[];
}

export async function generateRolePlayAnalysis(
  storyContent: string,
  existingCharacters: any[] = [],
  targetDurationSeconds: number = 60
): Promise<RolePlayAnalysis> {
  // Calculate content targets based on duration
  const targetMinutes = targetDurationSeconds / 60;
  const targetWords = Math.round(targetMinutes * 150); // 150 words per minute
  const targetDialogues = Math.round(targetMinutes * 8); // 8 dialogues per minute
  const scenesCount = Math.min(4, Math.max(2, Math.round(targetMinutes)));
  const dialoguesPerScene = Math.round(targetDialogues / scenesCount);

  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  const prompt = `
You are a professional screenplay writer and director. Analyze the following story and create a complete role-play analysis that breaks it down into scenes with dialogues, backgrounds, and stage directions.

TARGET SPECIFICATIONS:
- Target duration: ${targetDurationSeconds} seconds (${targetMinutes.toFixed(1)} minutes)
- Target word count: ${targetWords} words total
- Target scenes: ${scenesCount} scenes
- Target dialogues: ${targetDialogues} total dialogues (${dialoguesPerScene} per scene)
- Each dialogue should be 15-25 words for natural pacing

For voice assignments, assign appropriate character voices based on role characteristics:
- Male characters: Use "onyx" or "echo" OpenAI voices
- Female characters: Use "nova" or "shimmer" OpenAI voices  
- Children: Use "alloy" with higher pitch
- Animals (dogs, cats, etc.): Use "fable" with appropriate modulation
- Elderly characters: Use "echo" with slower speed
- Narrator: Use "alloy" as neutral voice

Story Content:
${storyContent}

Generate a comprehensive role-play analysis in the following JSON format:

{
  "title": "Creative title for the role-play adaptation",
  "genre": "Genre classification",
  "overallTone": "Overall emotional tone",
  "totalScenes": "Number of scenes",
  "estimatedPlaytime": "Total estimated minutes",
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Scene title",
      "background": {
        "location": "Specific location setting",
        "timeOfDay": "Time of day",
        "atmosphere": "Atmospheric description",
        "visualDescription": "Detailed visual setting description",
        "soundscape": "Background sounds and audio environment",
        "lighting": "Lighting description"
      },
      "dialogueSequence": [
        {
          "characterName": "Character speaking",
          "dialogue": "What they say",
          "emotion": "Emotion being expressed",
          "intensity": 7,
          "action": "Physical action or stage direction"
        }
      ],
      "stageDirections": ["Stage direction 1", "Stage direction 2"],
      "estimatedDuration": 120,
      "emotionalTone": "Scene's emotional tone"
    }
  ],
  "characters": [
    {
      "name": "Character name",
      "role": "protagonist/antagonist/supporting",
      "personality": "Personality description",
      "voiceProfile": "Voice characteristics",
      "costumeSuggestion": "Costume/appearance suggestion"
    }
  ],
  "productionNotes": ["Production note 1", "Production note 2"]
}

Guidelines:
1. Create exactly ${scenesCount} scenes with ${dialoguesPerScene} dialogues each
2. Each dialogue should be 15-25 words for natural speaking pace
3. Total content should target ${targetWords} words across all scenes
4. Estimated duration per scene: ${Math.round(targetDurationSeconds / scenesCount)} seconds
5. Create natural, engaging dialogue that captures each character's voice
6. Provide detailed background descriptions for immersive settings
7. Include stage directions and actions to guide performance
8. Assign emotions and intensity levels (1-10) for voice modulation
9. Ensure dialogues flow naturally and advance the story
10. Create vivid, cinematic scene descriptions that fit the target duration

Respond only with valid JSON.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 4000,
  });

  const analysisText = response.choices[0].message.content;
  if (!analysisText) {
    throw new Error("Failed to generate role-play analysis");
  }

  try {
    const analysis: RolePlayAnalysis = JSON.parse(analysisText);
    
    // Validate and enhance the analysis
    if (!analysis.scenes || analysis.scenes.length === 0) {
      throw new Error("No scenes generated in role-play analysis");
    }

    // Ensure all required fields are present
    analysis.scenes.forEach((scene, index) => {
      if (!scene.background) {
        scene.background = {
          location: "Generic setting",
          timeOfDay: "Day",
          atmosphere: "Neutral",
          visualDescription: "A simple setting for the scene",
        };
      }
      
      if (!scene.dialogueSequence) {
        scene.dialogueSequence = [];
      }
      
      if (!scene.stageDirections) {
        scene.stageDirections = [];
      }
      
      scene.sceneNumber = index + 1;
    });

    return analysis;
  } catch (error) {
    console.error("Failed to parse role-play analysis:", error);
    throw new Error("Invalid role-play analysis format");
  }
}

export async function enhanceExistingRolePlay(
  originalAnalysis: RolePlayAnalysis,
  modifications: Partial<RolePlayAnalysis>
): Promise<RolePlayAnalysis> {
  // Merge modifications with original analysis
  const enhanced = { ...originalAnalysis, ...modifications };
  
  if (modifications.scenes) {
    enhanced.scenes = modifications.scenes;
  }
  
  return enhanced;
}

export async function generateSceneDialogue(
  sceneContext: string,
  characters: string[],
  emotionalTone: string
): Promise<DialogueLine[]> {
  const prompt = `
Create natural dialogue for a scene with the following context:

Scene Context: ${sceneContext}
Characters: ${characters.join(', ')}
Emotional Tone: ${emotionalTone}

Generate dialogue as JSON array:
[
  {
    "characterName": "Character name",
    "dialogue": "What they say",
    "emotion": "Emotion",
    "intensity": 5,
    "action": "Stage direction"
  }
]

Make the dialogue natural, character-appropriate, and emotionally engaging.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.8,
  });

  const dialogueText = response.choices[0].message.content;
  if (!dialogueText) {
    throw new Error("Failed to generate scene dialogue");
  }

  return JSON.parse(dialogueText);
}