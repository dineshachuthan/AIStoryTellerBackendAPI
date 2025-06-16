// Voice sample templates for user registration
export const VOICE_SAMPLE_TEMPLATES = {
  emotions: [
    { label: 'happy', prompt: 'Say "I am so happy today!" with genuine joy and excitement' },
    { label: 'sad', prompt: 'Say "I feel really sad about this" with a melancholic tone' },
    { label: 'angry', prompt: 'Say "This makes me so angry!" with frustration and intensity' },
    { label: 'excited', prompt: 'Say "This is so exciting!" with high energy and enthusiasm' },
    { label: 'scared', prompt: 'Say "I am really scared" with fear and trembling in your voice' },
    { label: 'surprised', prompt: 'Say "Oh wow, I cannot believe this!" with genuine surprise' },
    { label: 'disappointed', prompt: 'Say "I am so disappointed" with a dejected tone' },
    { label: 'confused', prompt: 'Say "I do not understand this at all" with uncertainty' },
  ],
  sounds: [
    { label: 'cat_sound', prompt: 'Make a realistic cat meowing sound - "meow meow"' },
    { label: 'dog_bark', prompt: 'Make a realistic dog barking sound - "woof woof"' },
    { label: 'train_sound', prompt: 'Make a train sound - "choo choo" or "whooo whooo"' },
    { label: 'airplane_sound', prompt: 'Make an airplane flying sound - "whoooosh" or engine noise' },
    { label: 'threat_sound', prompt: 'Make a threatening growling sound - "grrrrr"' },
    { label: 'ghost_sound', prompt: 'Make a spooky ghost sound - "oooooh" or "boooo"' },
    { label: 'wind_sound', prompt: 'Make a wind blowing sound - "whoooosh"' },
    { label: 'water_sound', prompt: 'Make a water flowing sound - "splash" or "glub glub"' },
  ],
  descriptions: [
    { label: 'slow_description', prompt: 'Say "This is moving very very slowly" in a slow, deliberate pace' },
    { label: 'fast_description', prompt: 'Say "This is moving super fast" in a quick, rapid pace' },
    { label: 'loud_description', prompt: 'Say "This is very loud" in a loud, booming voice' },
    { label: 'quiet_description', prompt: 'Say "This is very quiet" in a soft, whispered voice' },
    { label: 'big_description', prompt: 'Say "This is enormous and huge" with a deep, grand voice' },
    { label: 'small_description', prompt: 'Say "This is tiny and small" with a high, delicate voice' },
    { label: 'smooth_description', prompt: 'Say "This is smooth and silky" with a smooth, flowing delivery' },
    { label: 'rough_description', prompt: 'Say "This is rough and bumpy" with a harsh, jagged delivery' },
  ],
};

export function getVoiceSamplesByType(type: 'emotions' | 'sounds' | 'descriptions') {
  return VOICE_SAMPLE_TEMPLATES[type];
}

export function getAllVoiceSamples() {
  return [
    ...VOICE_SAMPLE_TEMPLATES.emotions.map(s => ({ ...s, sampleType: 'emotion' })),
    ...VOICE_SAMPLE_TEMPLATES.sounds.map(s => ({ ...s, sampleType: 'sound' })),
    ...VOICE_SAMPLE_TEMPLATES.descriptions.map(s => ({ ...s, sampleType: 'description' })),
  ];
}

export function getVoiceSampleProgress(completedSamples: string[]) {
  const allSamples = getAllVoiceSamples();
  const completed = completedSamples.length;
  const total = allSamples.length;
  const percentage = Math.round((completed / total) * 100);
  
  return {
    completed,
    total,
    percentage,
    remaining: total - completed,
    isComplete: completed === total,
  };
}