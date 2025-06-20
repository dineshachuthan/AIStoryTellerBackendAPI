// Centralized API client for consistent request handling across all components

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AudioGenerationRequest {
  emotion: string;
  intensity: number;
  text: string;
  userId?: string;
  storyId?: number;
  characters?: any[];
  voice?: string;
}

export interface AudioGenerationResponse {
  audioUrl: string;
  isUserGenerated?: boolean;
  voice?: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Authentication methods
  async getCurrentUser() {
    return this.request('/api/auth/user');
  }

  // Story methods
  async getStories() {
    return this.request('/api/stories');
  }

  async getStory(id: number) {
    return this.request(`/api/stories/${id}`);
  }

  async createStory(story: any) {
    return this.request('/api/stories', {
      method: 'POST',
      body: JSON.stringify(story),
    });
  }

  async updateStory(id: number, story: any) {
    return this.request(`/api/stories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(story),
    });
  }

  async analyzeStory(content: string, title?: string) {
    return this.request('/api/stories/analyze', {
      method: 'POST',
      body: JSON.stringify({ content, title }),
    });
  }

  // Character methods
  async getStoryCharacters(storyId: number) {
    return this.request(`/api/stories/${storyId}/characters`);
  }

  async getStoryEmotions(storyId: number) {
    return this.request(`/api/stories/${storyId}/emotions`);
  }

  // Audio methods
  async generateEmotionSample(request: AudioGenerationRequest): Promise<ApiResponse<AudioGenerationResponse>> {
    return this.request('/api/emotions/generate-sample', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getStoryNarration(storyId: number) {
    return this.request(`/api/stories/${storyId}/narration`);
  }

  async generateCharacterNarration(storyId: number, userId: string) {
    return this.request(`/api/stories/${storyId}/character-narration`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  // Voice sample methods
  async saveVoiceSample(formData: FormData) {
    return this.request('/api/emotions/save-voice-sample', {
      method: 'POST',
      headers: {}, // Don't set Content-Type for FormData
      body: formData,
    });
  }

  async getUserVoiceSamples(userId: string) {
    return this.request(`/api/emotions/user-voice-samples/${userId}`);
  }

  // Character voice assignments
  async getVoiceAssignments(storyId: number) {
    return this.request(`/api/stories/${storyId}/voice-assignments`);
  }

  async assignCharacterVoices(storyId: number, assignments: any[]) {
    return this.request(`/api/stories/${storyId}/assign-voices`, {
      method: 'POST',
      body: JSON.stringify({ assignments }),
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();