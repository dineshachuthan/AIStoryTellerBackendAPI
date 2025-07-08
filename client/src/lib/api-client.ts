/**
 * Centralized API Client
 * All backend API communication goes through this client
 * Handles standardized response format and error handling
 */

import { ApiResponse, ApiSuccessResponse, ApiErrorResponse, ErrorObject } from '@shared/api-response';
import { queryClient } from './queryClient';

export class ApiError extends Error {
  code: number;
  messageKey: string;
  details?: any;
  
  constructor(error: ErrorObject) {
    super(error.message);
    this.code = error.code;
    this.messageKey = error.messageKey;
    this.details = error.details;
  }
}

export class ApiClient {
  private baseUrl = '';
  
  /**
   * Make API request with standardized error handling
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      method,
      headers: {
        ...options?.headers,
      },
      credentials: 'include',
      ...options,
    };
    
    if (data && method !== 'GET') {
      if (data instanceof FormData) {
        // Don't set Content-Type for FormData, let browser set it
        config.body = data;
      } else {
        // Set JSON content type and stringify data
        config.headers = {
          'Content-Type': 'application/json',
          ...config.headers,
        };
        config.body = JSON.stringify(data);
      }
    }
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiError(errorData.message || errorData.error || 'Request failed');
    }
    
    const result = await response.json();
    
    // Handle both wrapped and unwrapped responses
    if (result && typeof result === 'object' && 'success' in result) {
      // Wrapped response format { success: true, data: ... }
      if (!result.success) {
        throw new ApiError(result.error);
      }
      return result.data;
    }
    
    // Direct response format
    return result;
  }
  
  // Auth endpoints
  auth = {
    getUser: () => this.request<any>('GET', '/api/auth/user'),
    login: (credentials: { email: string; password: string }) => 
      this.request<any>('POST', '/api/auth/login', credentials),
    logout: () => this.request<void>('POST', '/api/auth/logout'),
    register: (data: { email: string; password: string; name?: string }) =>
      this.request<any>('POST', '/api/auth/register', data),
    updateProfile: (data: any) => this.request<any>('PATCH', '/api/auth/profile', data),
    updateLanguage: (language: string) => 
      this.request<any>('PUT', '/api/auth/user/language', { language }),
  };
  
  // Story endpoints
  stories = {
    list: (filters?: Record<string, any>) => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else if (value !== undefined && value !== '') {
            params.append(key, value);
          }
        });
      }
      const queryString = params.toString();
      return this.request<any[]>('GET', `/api/stories${queryString ? `?${queryString}` : ''}`);
    },
    get: (id: number) => this.request<any>('GET', `/api/stories/${id}`),
    create: (data: any) => this.request<any>('POST', '/api/stories', data),
    update: (id: number, data: any) => this.request<any>('PATCH', `/api/stories/${id}`, data),
    delete: (id: number) => this.request<void>('DELETE', `/api/stories/${id}`),
    analyze: (id: number) => this.request<any>('POST', `/api/stories/${id}/analyze`),
    generateNarration: (id: number) => this.request<any>('POST', `/api/stories/${id}/generate-narration`),
    playNarration: (id: number) => this.request<any>('GET', `/api/stories/${id}/play`),
    // New narration endpoints (based on routes.ts)
    createNarration: (id: number) => this.request<any>('POST', `/api/stories/${id}/narration`),
    generateNarrativeAudio: (id: number, data: { emotion: string; intensity: number; text: string }) =>
      this.request<any>('POST', `/api/stories/${id}/narrative/audio`, data),
    getFilters: () => this.request<any>('GET', '/api/stories/filters'),
    uploadAudio: (formData: FormData) => 
      this.request<any>('POST', '/api/upload-audio', formData, {
        headers: {} // Let browser set Content-Type for FormData
      }),
    // Narrative analysis endpoints
    getNarrative: (id: number) => this.request<any>('GET', `/api/stories/${id}/narrative`),
    createNarrative: (id: number) => this.request<any>('POST', `/api/stories/${id}/narrative`),
    // Roleplay analysis endpoints
    getRoleplay: (id: number) => this.request<any>('GET', `/api/stories/${id}/roleplay`),
    createRoleplay: (id: number) => this.request<any>('POST', `/api/stories/${id}/roleplay`),
  };
  
  // Character endpoints
  characters = {
    list: () => this.request<any[]>('GET', '/api/characters'),
    get: (id: number) => this.request<any>('GET', `/api/characters/${id}`),
    create: (data: any) => this.request<any>('POST', '/api/characters', data),
    update: (id: number, data: any) => this.request<any>('PATCH', `/api/characters/${id}`, data),
    delete: (id: number) => this.request<void>('DELETE', `/api/characters/${id}`),
  };
  
  // Emotion endpoints
  emotions = {
    generateSample: (data: { emotion: string; intensity: number; text: string }) =>
      this.request<any>('POST', '/api/emotions/generate-sample', data),
  };
  
  // Voice endpoints
  voice = {
    getSamples: () => this.request<any[]>('GET', '/api/voice/samples'),
    recordSample: (data: FormData) =>
      this.request<any>('POST', '/api/voice/record', data, {
        headers: {} // Let browser set Content-Type for FormData
      }),
    generateNarratorVoice: () => this.request<any>('POST', '/api/voice/generate-narrator'),
    getEsmRecordings: () => this.request<any[]>('GET', '/api/user/esm-recordings'),
    getEsmTemplates: (storyId: number) => this.request<any>('GET', `/api/voice/esm-templates/${storyId}`),
    getUserVoiceEmotions: (userId: string, emotion: string) => 
      this.request<any>('GET', `/api/user-voice-emotions/${userId}?emotion=${emotion}`),
  };
  
  // Collaborative roleplay endpoints
  roleplay = {
    getTemplates: () => this.request<any[]>('GET', '/api/roleplay-templates'),
    createTemplate: (storyId: number, makePublic: boolean = true) => 
      this.request<any>('POST', `/api/stories/${storyId}/convert-to-template`, { makePublic }),
    getTemplate: (id: number) => this.request<any>('GET', `/api/roleplay-templates/${id}`),
    createInvitation: (templateId: number, data: any) =>
      this.request<any>('POST', `/api/roleplay/templates/${templateId}/invitations`, data),
    submitRecording: (invitationId: string, data: FormData) =>
      this.request<any>('POST', `/api/roleplay/invitations/${invitationId}/submit`, data, {
        headers: {} // Let browser set Content-Type for FormData
      }),
  };
  
  // Video endpoints
  video = {
    generate: (templateId: number, options?: any) =>
      this.request<any>('POST', `/api/video/generate/${templateId}`, options),
    getStatus: (jobId: number) => this.request<any>('GET', `/api/video/status/${jobId}`),
    list: () => this.request<any[]>('GET', '/api/video/generations'),
  };
  
  // Reference data endpoints
  referenceData = {
    getEmotions: () => this.request<any[]>('GET', '/api/reference-data/emotions'),
    getSounds: () => this.request<any[]>('GET', '/api/reference-data/sounds'),
    getModulations: () => this.request<any[]>('GET', '/api/reference-data/modulations'),
  };
  
  // Subscription endpoints
  subscription = {
    getPlans: () => this.request<any[]>('GET', '/api/subscription/plans'),
    getCurrentSubscription: () => this.request<any>('GET', '/api/subscription/current'),
    subscribe: (planId: string) => this.request<any>('POST', '/api/subscription/subscribe', { planId }),
    cancel: () => this.request<any>('POST', '/api/subscription/cancel'),
    getUsage: () => this.request<any>('GET', '/api/subscription/usage'),
  };
  
  // Admin endpoints (if user has admin role)
  admin = {
    getUsers: () => this.request<any[]>('GET', '/api/admin/users'),
    updateUserRole: (userId: string, role: string) =>
      this.request<any>('PATCH', `/api/admin/users/${userId}/role`, { role }),
    getSystemStats: () => this.request<any>('GET', '/api/admin/stats'),
  };
  
  // Collaboration endpoints
  sendStoryInvitations = (data: {
    storyId: number;
    invitations: Array<{
      email?: string;
      phone?: string;
      characterId?: number;
    }>;
    message?: string;
  }) => this.request<any>('POST', `/api/stories/${data.storyId}/invitations`, data);
  
  // Helper method to invalidate queries
  invalidateQueries(keys: string[]) {
    keys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
  }
}

// Export singleton instance
export const apiClient = new ApiClient();