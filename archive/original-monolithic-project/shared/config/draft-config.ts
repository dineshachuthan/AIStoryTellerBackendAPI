/**
 * Draft Stories Configuration
 * Contains limits and settings for draft story management
 */

export interface DraftStoriesConfig {
  maxDraftStories: number;
  allowedStoryTypes: string[];
  autoDeleteOldestWhenLimitReached: boolean;
}

export const DRAFT_STORIES_CONFIG: DraftStoriesConfig = {
  maxDraftStories: 5,
  allowedStoryTypes: ['personal', 'fictional', 'educational', 'creative'],
  autoDeleteOldestWhenLimitReached: false
};

// Export individual values for easy access
export const MAX_DRAFT_STORIES = DRAFT_STORIES_CONFIG.maxDraftStories;