// Story genre and emotional tag system
export const STORY_GENRES = {
  ADVENTURE: 'adventure',
  FANTASY: 'fantasy',
  MYSTERY: 'mystery',
  ROMANCE: 'romance',
  SCIENCE_FICTION: 'science_fiction',
  HORROR: 'horror',
  THRILLER: 'thriller',
  DRAMA: 'drama',
  COMEDY: 'comedy',
  HISTORICAL: 'historical',
  BIOGRAPHY: 'biography',
  FAIRY_TALE: 'fairy_tale',
  FABLE: 'fable',
  LEGEND: 'legend',
  MYTHOLOGY: 'mythology',
  CHILDREN: 'children',
  YOUNG_ADULT: 'young_adult',
  ADULT: 'adult'
} as const;

export const GENRE_LABELS = {
  [STORY_GENRES.ADVENTURE]: 'Adventure',
  [STORY_GENRES.FANTASY]: 'Fantasy',
  [STORY_GENRES.MYSTERY]: 'Mystery',
  [STORY_GENRES.ROMANCE]: 'Romance',
  [STORY_GENRES.SCIENCE_FICTION]: 'Science Fiction',
  [STORY_GENRES.HORROR]: 'Horror',
  [STORY_GENRES.THRILLER]: 'Thriller',
  [STORY_GENRES.DRAMA]: 'Drama',
  [STORY_GENRES.COMEDY]: 'Comedy',
  [STORY_GENRES.HISTORICAL]: 'Historical',
  [STORY_GENRES.BIOGRAPHY]: 'Biography',
  [STORY_GENRES.FAIRY_TALE]: 'Fairy Tale',
  [STORY_GENRES.FABLE]: 'Fable',
  [STORY_GENRES.LEGEND]: 'Legend',
  [STORY_GENRES.MYTHOLOGY]: 'Mythology',
  [STORY_GENRES.CHILDREN]: 'Children\'s Story',
  [STORY_GENRES.YOUNG_ADULT]: 'Young Adult',
  [STORY_GENRES.ADULT]: 'Adult'
} as const;

export const EMOTIONAL_TAGS = {
  // Primary emotions
  JOY: 'joy',
  SADNESS: 'sadness',
  ANGER: 'anger',
  FEAR: 'fear',
  SURPRISE: 'surprise',
  DISGUST: 'disgust',
  
  // Secondary emotions
  EXCITEMENT: 'excitement',
  ANTICIPATION: 'anticipation',
  NOSTALGIA: 'nostalgia',
  MELANCHOLY: 'melancholy',
  HOPE: 'hope',
  DESPAIR: 'despair',
  LOVE: 'love',
  HEARTBREAK: 'heartbreak',
  COURAGE: 'courage',
  COWARDICE: 'cowardice',
  PRIDE: 'pride',
  SHAME: 'shame',
  WONDER: 'wonder',
  CONFUSION: 'confusion',
  PEACE: 'peace',
  CHAOS: 'chaos',
  TRIUMPH: 'triumph',
  DEFEAT: 'defeat',
  FRIENDSHIP: 'friendship',
  BETRAYAL: 'betrayal',
  FORGIVENESS: 'forgiveness',
  REVENGE: 'revenge',
  WISDOM: 'wisdom',
  INNOCENCE: 'innocence',
  REDEMPTION: 'redemption',
  SACRIFICE: 'sacrifice'
} as const;

export const EMOTIONAL_TAG_LABELS = {
  [EMOTIONAL_TAGS.JOY]: 'Joy',
  [EMOTIONAL_TAGS.SADNESS]: 'Sadness',
  [EMOTIONAL_TAGS.ANGER]: 'Anger',
  [EMOTIONAL_TAGS.FEAR]: 'Fear',
  [EMOTIONAL_TAGS.SURPRISE]: 'Surprise',
  [EMOTIONAL_TAGS.DISGUST]: 'Disgust',
  [EMOTIONAL_TAGS.EXCITEMENT]: 'Excitement',
  [EMOTIONAL_TAGS.ANTICIPATION]: 'Anticipation',
  [EMOTIONAL_TAGS.NOSTALGIA]: 'Nostalgia',
  [EMOTIONAL_TAGS.MELANCHOLY]: 'Melancholy',
  [EMOTIONAL_TAGS.HOPE]: 'Hope',
  [EMOTIONAL_TAGS.DESPAIR]: 'Despair',
  [EMOTIONAL_TAGS.LOVE]: 'Love',
  [EMOTIONAL_TAGS.HEARTBREAK]: 'Heartbreak',
  [EMOTIONAL_TAGS.COURAGE]: 'Courage',
  [EMOTIONAL_TAGS.COWARDICE]: 'Cowardice',
  [EMOTIONAL_TAGS.PRIDE]: 'Pride',
  [EMOTIONAL_TAGS.SHAME]: 'Shame',
  [EMOTIONAL_TAGS.WONDER]: 'Wonder',
  [EMOTIONAL_TAGS.CONFUSION]: 'Confusion',
  [EMOTIONAL_TAGS.PEACE]: 'Peace',
  [EMOTIONAL_TAGS.CHAOS]: 'Chaos',
  [EMOTIONAL_TAGS.TRIUMPH]: 'Triumph',
  [EMOTIONAL_TAGS.DEFEAT]: 'Defeat',
  [EMOTIONAL_TAGS.FRIENDSHIP]: 'Friendship',
  [EMOTIONAL_TAGS.BETRAYAL]: 'Betrayal',
  [EMOTIONAL_TAGS.FORGIVENESS]: 'Forgiveness',
  [EMOTIONAL_TAGS.REVENGE]: 'Revenge',
  [EMOTIONAL_TAGS.WISDOM]: 'Wisdom',
  [EMOTIONAL_TAGS.INNOCENCE]: 'Innocence',
  [EMOTIONAL_TAGS.REDEMPTION]: 'Redemption',
  [EMOTIONAL_TAGS.SACRIFICE]: 'Sacrifice'
} as const;

export const MOOD_CATEGORIES = {
  UPLIFTING: 'uplifting',
  DARK: 'dark',
  MYSTERIOUS: 'mysterious',
  ROMANTIC: 'romantic',
  ADVENTUROUS: 'adventurous',
  CONTEMPLATIVE: 'contemplative',
  HUMOROUS: 'humorous',
  SUSPENSEFUL: 'suspenseful',
  EMOTIONAL: 'emotional',
  INSPIRING: 'inspiring'
} as const;

export const MOOD_LABELS = {
  [MOOD_CATEGORIES.UPLIFTING]: 'Uplifting',
  [MOOD_CATEGORIES.DARK]: 'Dark',
  [MOOD_CATEGORIES.MYSTERIOUS]: 'Mysterious',
  [MOOD_CATEGORIES.ROMANTIC]: 'Romantic',
  [MOOD_CATEGORIES.ADVENTUROUS]: 'Adventurous',
  [MOOD_CATEGORIES.CONTEMPLATIVE]: 'Contemplative',
  [MOOD_CATEGORIES.HUMOROUS]: 'Humorous',
  [MOOD_CATEGORIES.SUSPENSEFUL]: 'Suspenseful',
  [MOOD_CATEGORIES.EMOTIONAL]: 'Emotional',
  [MOOD_CATEGORIES.INSPIRING]: 'Inspiring'
} as const;

export type StoryGenre = typeof STORY_GENRES[keyof typeof STORY_GENRES];
export type EmotionalTag = typeof EMOTIONAL_TAGS[keyof typeof EMOTIONAL_TAGS];
export type MoodCategory = typeof MOOD_CATEGORIES[keyof typeof MOOD_CATEGORIES];

// Helper functions for genre and tag management
export function getGenreLabel(genre: string): string {
  return GENRE_LABELS[genre as StoryGenre] || genre;
}

export function getEmotionalTagLabel(tag: string): string {
  return EMOTIONAL_TAG_LABELS[tag as EmotionalTag] || tag;
}

export function getMoodLabel(mood: string): string {
  return MOOD_LABELS[mood as MoodCategory] || mood;
}

export function getAllGenres(): Array<{ value: string; label: string }> {
  return Object.entries(GENRE_LABELS).map(([value, label]) => ({ value, label }));
}

export function getAllEmotionalTags(): Array<{ value: string; label: string }> {
  return Object.entries(EMOTIONAL_TAG_LABELS).map(([value, label]) => ({ value, label }));
}

export function getAllMoods(): Array<{ value: string; label: string }> {
  return Object.entries(MOOD_LABELS).map(([value, label]) => ({ value, label }));
}