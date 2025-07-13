/**
 * Story Service Adapter for Microservices Architecture
 * Manages story-related operations within monolith during migration
 * Follows Adapter Pattern for gradual extraction to independent service
 */

import { BaseMicroserviceAdapter } from './base-microservice-adapter';
import { storage } from '../storage';
import { analyzeStoryContent } from '../ai-analysis';

export class StoryServiceAdapter extends BaseMicroserviceAdapter {
  constructor() {
    // Define owned tables for story service
    const ownedTables = [
      'stories',
      'story_analysis_cache',
      'story_narrations',
      'story_characters',
      'story_scenes',
      'story_modulation_requirements',
      'story_customizations',
      'story_user_confidence',
      'reference_stories',
      'reference_story_analyses'
    ];
    
    super('story', ownedTables);
  }

  /**
   * Initialize story service routes and event handlers
   */
  async initialize(): Promise<void> {
    this.setupEventHandlers();
    
    console.log('[StoryAdapter] Initialized in monolith mode');
  }

  /**
   * Create a new story with subscription limit checking
   */
  async createStory(userId: string, storyData: any): Promise<any> {
    try {
      const { title, content, category, genre } = storyData;
      
      // Check subscription limits
      const canCreate = await this.checkStoryCreationLimit(userId);
      if (!canCreate.allowed) {
        throw new Error(`Story creation limit reached. Limit: ${canCreate.limit}, Used: ${canCreate.used}`);
      }

      // Create story
      const story = await storage.createStory({
        userId,
        title,
        content,
        category,
        genre,
        state: 'draft',
        isPublic: false
      });

      // Analyze story content
      const analysis = await analyzeStoryContent(content, userId);
      if (analysis) {
        await storage.updateStory(story.id, {
          analysisData: analysis,
          category: analysis.category,
          genre: analysis.genre,
          subGenre: analysis.subGenre,
          ageRating: analysis.ageRating,
          isAdultContent: analysis.isAdultContent
        });
      }

      // Publish event
      await this.publishEvent("story.created", {
        userId,
        storyId: story.id,
        category: analysis?.category || category,
        genre: analysis?.genre || genre
      });

      return { ...story, analysis };
    } catch (error) {
      console.error("Failed to create story:", error);
      throw error;
    }
  }

  /**
   * Setup event handlers for cross-service communication
   */
  private setupEventHandlers(): void {
    // Listen for subscription changes to update limits
    this.subscribeToEvent("subscription.created", async (event) => {
      console.log("[StoryAdapter] Subscription created, updating user limits");
      // Track new subscription for story limit enforcement
      await storage.trackUsage?.(event.payload.userId, 'subscription.created', {
        planId: event.payload.planId
      });
    });

    this.subscribeToEvent("subscription.cancelled", async (event) => {
      console.log("[StoryAdapter] Subscription cancelled, updating user limits");
      // Update limits to free tier
      await storage.trackUsage?.(event.payload.userId, 'subscription.cancelled', {});
    });

    // Listen for collaboration events
    this.subscribeToEvent("collaboration.invitation.sent", async (event) => {
      const { templateId } = event.payload;
      console.log("[StoryAdapter] Collaboration invitation sent for template:", templateId);
      // Update story status through template lookup
      const template = await storage.getRoleplayTemplate?.(templateId);
      if (template?.storyId) {
        await this.updateStoryCollaborationStatus(template.storyId, 'invitations_sent');
      }
    });

    this.subscribeToEvent("collaboration.completed", async (event) => {
      const { templateId } = event.payload;
      console.log("[StoryAdapter] Collaboration completed for template:", templateId);
      const template = await storage.getRoleplayTemplate?.(templateId);
      if (template?.storyId) {
        await this.updateStoryCollaborationStatus(template.storyId, 'collaboration_complete');
        // Publish story completion event
        await this.publishEvent("story.collaboration.completed", {
          storyId: template.storyId,
          templateId
        });
      }
    });

    // Listen for user events
    this.subscribeToEvent("user.deleted", async (event) => {
      console.log("[StoryAdapter] User deleted, archiving stories");
      const stories = await storage.getUserStories(event.payload.userId);
      for (const story of stories) {
        await storage.updateStory(story.id, { state: 'archived' });
      }
    });

    // Listen for voice cloning events
    this.subscribeToEvent("voice.cloned", async (event) => {
      console.log("[StoryAdapter] Voice cloned, updating story narration options");
      const { userId, voiceId } = event.payload;
      // Update stories to indicate voice availability
      const stories = await storage.getUserStories(userId);
      for (const story of stories) {
        await this.publishEvent("story.voice.available", {
          storyId: story.id,
          userId,
          voiceId
        });
      }
    });
  }

  /**
   * Check if user can create more stories based on subscription
   */
  private async checkStoryCreationLimit(userId: string): Promise<{
    allowed: boolean;
    limit: number;
    used: number;
  }> {
    // Get user's subscription from subscription service
    const subscriptionAdapter = await this.getSubscriptionAdapter();
    const limits = await subscriptionAdapter.getFeatureLimits(userId);
    
    // Count stories created this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const storiesThisMonth = await storage.countUserStoriesCreatedSince(userId, startOfMonth);
    
    return {
      allowed: limits.storiesPerMonth === -1 || storiesThisMonth < limits.storiesPerMonth,
      limit: limits.storiesPerMonth,
      used: storiesThisMonth
    };
  }

  /**
   * Update story collaboration status
   */
  private async updateStoryCollaborationStatus(storyId: number, status: string): Promise<void> {
    await storage.updateStory(storyId, {
      collaborationStatus: status,
      lastCollaborationUpdate: new Date()
    });
  }

  /**
   * Get subscription adapter instance
   */
  private async getSubscriptionAdapter(): Promise<any> {
    const { subscriptionServiceAdapter } = await import('./subscription-service-adapter');
    return subscriptionServiceAdapter;
  }

  /**
   * Get story statistics for a user
   */
  async getUserStoryStats(userId: string): Promise<any> {
    const totalStories = await storage.countUserStories(userId);
    const publishedStories = await storage.countUserPublishedStories(userId);
    const draftStories = totalStories - publishedStories;
    
    return {
      total: totalStories,
      published: publishedStories,
      drafts: draftStories
    };
  }
}

// Export singleton instance
export const storyServiceAdapter = new StoryServiceAdapter();