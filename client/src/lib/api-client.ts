/**
 * Centralized API Client
 * All backend API communication goes through this client
 * Handles standardized response format and error handling
 */

import { ApiResponse, ApiSuccessResponse, ApiErrorResponse, ErrorObject } from '@shared/types/api-response';
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
    register: (data: { email: string; password: string; name?: string; passwordHint?: string }) =>
      this.request<any>('POST', '/api/auth/register', data),
    updateProfile: (data: any) => this.request<any>('PATCH', '/api/auth/profile', data),
    updateLanguage: (language: string) => 
      this.request<any>('PUT', '/api/auth/user/language', { language }),
    // Password recovery
    checkEmail: (email: string) => 
      this.request<{ exists: boolean }>('GET', `/api/auth/check-email?email=${encodeURIComponent(email)}`),
    forgotPassword: (email: string) => 
      this.request<void>('POST', '/api/auth/forgot-password', { email }),
    resetPassword: (data: { token: string; password: string }) =>
      this.request<void>('POST', '/api/auth/reset-password', data),
    getSecurityQuestions: () =>
      this.request<any[]>('GET', '/api/auth/security-questions'),
    verifySecurityAnswers: (data: { questionId: number; answer: string }[]) =>
      this.request<{ token: string }>('POST', '/api/auth/verify-security', { answers: data }),
    updatePasswordHint: (hint: string) =>
      this.request<void>('POST', '/api/auth/update-password-hint', { hint }),
    // Email verification
    verifyEmail: (token: string) =>
      this.request<void>('POST', '/api/auth/verify-email', { token }),
    resendVerification: (email: string) =>
      this.request<void>('POST', '/api/auth/resend-verification', { email }),
    // 2FA
    setup2FA: (method: 'sms' | 'email' | 'authenticator') =>
      this.request<any>('POST', '/api/auth/2fa/setup', { method }),
    verify2FA: (code: string) =>
      this.request<void>('POST', '/api/auth/2fa/verify', { code }),
    disable2FA: () =>
      this.request<void>('POST', '/api/auth/2fa/disable'),
    getBackupCodes: () =>
      this.request<{ codes: string[] }>('GET', '/api/auth/2fa/backup-codes'),
    regenerateBackupCodes: () =>
      this.request<{ codes: string[] }>('POST', '/api/auth/2fa/regenerate'),
    send2FACode: () =>
      this.request<void>('POST', '/api/auth/2fa/send-code'),
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
    createDraft: (data: { title: string; storyType?: string; content?: string; uploadType?: string; originalAudioUrl?: string }) => 
      this.request<any>('POST', '/api/stories/draft', data),
    uploadAudio: (formData: FormData) => 
      this.request<any>('POST', '/api/stories/upload-audio', formData),
    update: (id: number, data: any) => this.request<any>('PATCH', `/api/stories/${id}`, data),
    archive: (id: number) => this.request<any>('PUT', `/api/stories/${id}/archive`, {}),
    updateContent: (id: number, data: { title: string; content: string; language: string }) =>
      this.request<any>('PUT', `/api/stories/${id}/content`, data),
    delete: (id: number) => this.request<void>('DELETE', `/api/stories/${id}`),
    analyze: (id: number) => this.request<any>('POST', `/api/stories/${id}/analyze`),
    generateNarration: (id: number) => this.request<any>('POST', `/api/stories/${id}/generate-narration`),
    playNarration: (id: number) => this.request<any>('GET', `/api/stories/${id}/play`),
    // New narration endpoints (based on routes.ts)
    createNarration: (id: number) => this.request<any>('POST', `/api/stories/${id}/narration`),
    generateNarrativeAudio: (id: number, data: { emotion: string; intensity: number; text: string }) =>
      this.request<any>('POST', `/api/stories/${id}/narrative/audio`, data),
    getFilters: () => this.request<any>('GET', '/api/stories/filters'),
    // Narrative analysis endpoints
    getNarrative: (id: number) => this.request<any>('GET', `/api/stories/${id}/narrative`),
    createNarrative: async (id: number) => {
      const result = await this.request<any>('POST', `/api/stories/${id}/narrative`);
      // Invalidate story cache after successful narrative analysis (may have updated title)
      queryClient.invalidateQueries({ queryKey: ['/api/stories', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/stories'] });
      return result;
    },
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
    // Multi-voice recordings
    getRecordings: () => this.request<any[]>('GET', '/api/user/esm-recordings'),
    uploadRecording: (data: FormData) =>
      this.request<any>('POST', '/api/user/esm-recordings', data, {
        headers: {} // Let browser set Content-Type for FormData
      }),
    deleteRecording: (id: number) => this.request<void>('DELETE', `/api/user/esm-recordings/${id}`),
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
  
  // Audio endpoints
  audio = {
    transcribe: (formData: FormData) =>
      this.request<any>('POST', '/api/audio/transcribe', formData, {
        headers: {} // Let browser set Content-Type for FormData
      }),
  };

  // User profile endpoints
  user = {
    getNarratorProfile: () => this.request<any>('GET', '/api/user/narrator-profile'),
    saveNarratorProfile: (profile: any) => this.request<any>('POST', '/api/user/narrator-profile', profile),
    // User emotion tracking
    getCurrentEmotion: () => this.request<{ emotion: string; detectionMethod: string }>('GET', '/api/user/current-emotion'),
    updateEmotion: (emotion: string, context?: string) => 
      this.request<void>('POST', '/api/user/update-emotion', { emotion, context }),
    getEmotionHistory: () => this.request<any[]>('GET', '/api/user/emotion-history'),
    getLoginHistory: () => this.request<any[]>('GET', '/api/user/login-history'),
  };

  // Invitations endpoints
  invitations = {
    get: (token: string) => this.request<any>('GET', `/api/invitations/${token}`),
    getSampleText: (storyId: number, emotion: string) => 
      this.request<any>('POST', `/api/stories/${storyId}/sample-text`, { emotion }),
    getSavedNarration: (storyId: number, token: string) =>
      this.request<any>('GET', `/api/stories/${storyId}/narration/saved?invitationToken=${token}`),
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
  
  // SMS endpoints
  sms = {
    send: (data: { to: string; message: string }) =>
      this.request<{ success: boolean; messageId?: string; error?: string }>('POST', '/api/send-sms', data),
  };

  // WhatsApp endpoints
  whatsapp = {
    send: (data: { to: string; message: string }) =>
      this.request<{ success: boolean; messageId?: string; status?: string; error?: string }>('POST', '/api/send-whatsapp', data),
  };

  // Unified messaging endpoint (provider-agnostic)
  messaging = {
    send: (data: { to: string; message: string; channel: 'sms' | 'whatsapp' }) =>
      this.request<{ success: boolean; messageId?: string; status?: string; error?: string }>('POST', '/api/send-message', data),
  };

  // Payment endpoints
  payment = {
    getConfig: () => this.request<any>('GET', '/api/payment/config'),
    getStatus: () => this.request<any[]>('GET', '/api/payment/status'),
    createCheckoutSession: (data: { priceId: string; successUrl?: string; cancelUrl?: string }) =>
      this.request<any>('POST', '/api/create-checkout-session', data),
  };

  // External Provider Management endpoints
  externalProviders = {
    // Get all providers with optional filtering
    getAll: (filters?: { serviceType?: string; status?: string; isHealthy?: boolean }) => {
      const params = new URLSearchParams();
      if (filters?.serviceType) params.append('serviceType', filters.serviceType);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.isHealthy !== undefined) params.append('isHealthy', String(filters.isHealthy));
      const queryString = params.toString();
      return this.request<any[]>('GET', `/api/external-providers${queryString ? `?${queryString}` : ''}`);
    },

    // Get provider by ID
    get: (id: number) => 
      this.request<any>('GET', `/api/external-providers/${id}`),

    // Create new provider
    create: (data: {
      providerName: string;
      serviceType: string;
      providerKey?: string;
      priority?: number;
      isActive?: boolean;
      healthCheckEndpoint?: string;
      configuration?: any;
      rateLimits?: any;
      costPerRequest?: number;
      monthlyCostLimit?: number;
      apiKeyLastFour?: string;
    }) => this.request<any>('POST', '/api/external-providers', data),

    // Update provider
    update: (id: number, data: any) => 
      this.request<any>('PUT', `/api/external-providers/${id}`, data),

    // Activate provider
    activate: (id: number, reason?: string) => 
      this.request<any>('POST', `/api/external-providers/${id}/activate`, { reason }),

    // Deactivate provider
    deactivate: (id: number, reason?: string) => 
      this.request<any>('POST', `/api/external-providers/${id}/deactivate`, { reason }),

    // Get provider transactions
    getTransactions: (id: number, options?: { startDate?: Date; endDate?: Date; limit?: number }) => {
      const params = new URLSearchParams();
      if (options?.startDate) params.append('startDate', options.startDate.toISOString());
      if (options?.endDate) params.append('endDate', options.endDate.toISOString());
      if (options?.limit) params.append('limit', String(options.limit));
      const queryString = params.toString();
      return this.request<any[]>('GET', `/api/external-providers/${id}/transactions${queryString ? `?${queryString}` : ''}`);
    },

    // Get provider performance stats
    getPerformance: (id: number, options?: { startDate?: Date; endDate?: Date }) => {
      const params = new URLSearchParams();
      if (options?.startDate) params.append('startDate', options.startDate.toISOString());
      if (options?.endDate) params.append('endDate', options.endDate.toISOString());
      const queryString = params.toString();
      return this.request<any>('GET', `/api/external-providers/${id}/performance${queryString ? `?${queryString}` : ''}`);
    },

    // Get provider health history
    getHealthHistory: (id: number, hours: number = 24) => 
      this.request<any[]>('GET', `/api/external-providers/${id}/health?hours=${hours}`),

    // Record health check
    recordHealthCheck: (id: number, data: { isHealthy: boolean; responseTime?: number; errorMessage?: string }) => 
      this.request<any>('POST', `/api/external-providers/${id}/health-check`, data),

    // Get provider summary
    getSummary: (id: number) => 
      this.request<any>('GET', `/api/external-providers/${id}/summary`),

    // Get usage by service type
    getUsageByService: (options?: { startDate?: Date; endDate?: Date }) => {
      const params = new URLSearchParams();
      if (options?.startDate) params.append('startDate', options.startDate.toISOString());
      if (options?.endDate) params.append('endDate', options.endDate.toISOString());
      const queryString = params.toString();
      return this.request<any[]>('GET', `/api/external-providers/usage/by-service${queryString ? `?${queryString}` : ''}`);
    },

    // Get cost alerts
    getCostAlerts: (options?: { resolved?: boolean; limit?: number }) => {
      const params = new URLSearchParams();
      if (options?.resolved !== undefined) params.append('resolved', String(options.resolved));
      if (options?.limit) params.append('limit', String(options.limit));
      const queryString = params.toString();
      return this.request<any[]>('GET', `/api/external-providers/cost-alerts${queryString ? `?${queryString}` : ''}`);
    },

    // Resolve cost alert
    resolveCostAlert: (alertId: number, notes?: string) => 
      this.request<any>('POST', `/api/external-providers/cost-alerts/${alertId}/resolve`, { notes }),

    // Get failover events
    getFailoverEvents: (options?: { serviceType?: string; startDate?: Date; endDate?: Date; limit?: number }) => {
      const params = new URLSearchParams();
      if (options?.serviceType) params.append('serviceType', options.serviceType);
      if (options?.startDate) params.append('startDate', options.startDate.toISOString());
      if (options?.endDate) params.append('endDate', options.endDate.toISOString());
      if (options?.limit) params.append('limit', String(options.limit));
      const queryString = params.toString();
      return this.request<any[]>('GET', `/api/external-providers/failovers${queryString ? `?${queryString}` : ''}`);
    },

    // Get API key rotation history
    getApiKeyHistory: (id: number) => 
      this.request<any[]>('GET', `/api/external-providers/${id}/api-keys`),

    // Rotate API key
    rotateApiKey: (id: number, data: { reason?: string; newKeyLastFour?: string }) => 
      this.request<any>('POST', `/api/external-providers/${id}/rotate-key`, data),
  };
  
  // Helper method to invalidate queries
  invalidateQueries(keys: string[]) {
    keys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
  }
}

// Export singleton instance
export const apiClient = new ApiClient();