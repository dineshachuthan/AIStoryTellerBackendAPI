export interface RoleplayConfiguration {
  /** Target duration for roleplay content in seconds */
  targetDurationSeconds: number;
  
  /** Estimated words per minute for roleplay performance */
  wordsPerMinute: number;
  
  /** Estimated dialogue lines per minute */
  dialoguesPerMinute: number;
  
  /** Maximum number of scenes to generate */
  maxScenes: number;
  
  /** Target dialogues per scene */
  dialoguesPerScene: number;
}

export const defaultRoleplayConfig: RoleplayConfiguration = {
  targetDurationSeconds: 60, // Start with 60 seconds, can be changed to 120 or 240
  wordsPerMinute: 150, // Average speaking pace
  dialoguesPerMinute: 8, // Realistic dialogue exchanges per minute
  maxScenes: 3, // Keep scenes manageable
  dialoguesPerScene: 3, // Average dialogues per scene
};

/**
 * Calculate content targets based on duration
 */
export function calculateContentTargets(config: RoleplayConfiguration) {
  const targetMinutes = config.targetDurationSeconds / 60;
  
  return {
    targetWords: Math.round(targetMinutes * config.wordsPerMinute),
    targetDialogues: Math.round(targetMinutes * config.dialoguesPerMinute),
    scenesCount: Math.min(config.maxScenes, Math.max(1, Math.round(targetMinutes))),
    wordsPerDialogue: Math.round((targetMinutes * config.wordsPerMinute) / (targetMinutes * config.dialoguesPerMinute)),
  };
}

/**
 * Get roleplay configuration with environment overrides
 */
export function getRoleplayConfig(): RoleplayConfiguration {
  return {
    ...defaultRoleplayConfig,
    // Allow environment override
    targetDurationSeconds: process.env.ROLEPLAY_DURATION_SECONDS 
      ? parseInt(process.env.ROLEPLAY_DURATION_SECONDS) 
      : defaultRoleplayConfig.targetDurationSeconds,
  };
}