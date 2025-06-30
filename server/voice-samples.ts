// Voice system is now completely data-driven - no hardcoded templates
// Users create their own voice samples through recording

export function getVoiceSamplesByType(type: 'emotions' | 'sounds' | 'descriptions') {
  // No hardcoded templates - return empty array for all types
  return [];
}

export function getAllVoiceSamples() {
  // No hardcoded samples - system is completely data-driven
  return [];
}

export function getVoiceSampleProgress(completedSamples: string[]) {
  // Progress based only on user recordings, no hardcoded targets
  const completed = completedSamples.length;
  const total = 0; // No hardcoded total - users define their own goals
  const percentage = Math.round((completed / total) * 100);
  
  return {
    completed,
    total,
    percentage,
    remaining: total - completed,
    isComplete: completed === total,
  };
}