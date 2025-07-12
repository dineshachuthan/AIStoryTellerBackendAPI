// API Client for communicating with the backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
  language?: string;
  locale?: string;
  nativeLanguage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Story {
  id: number;
  title: string;
  content?: string;
  authorId: number;
  status: string;
  processingStatus: string;
  category?: string;
  genre?: string;
  summary?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceRecording {
  id: number;
  userId: number;
  esmId: number;
  voiceType: string;
  audioUrl?: string;
  duration?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Authentication endpoints
  auth = {
    getCurrentUser: (): Promise<ApiResponse<User>> =>
      this.request<User>('/auth/user'),
    
    login: (credentials: { email: string; password: string }): Promise<ApiResponse<User>> =>
      this.request<User>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    
    register: (userData: { name: string; email: string; password: string }): Promise<ApiResponse<User>> =>
      this.request<User>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    
    logout: (): Promise<ApiResponse<void>> =>
      this.request<void>('/auth/logout', { method: 'POST' }),
  };

  // Stories endpoints
  stories = {
    getAll: (): Promise<ApiResponse<Story[]>> =>
      this.request<Story[]>('/stories'),
    
    getById: (id: number): Promise<ApiResponse<Story>> =>
      this.request<Story>(`/stories/${id}`),
    
    create: (storyData: Omit<Story, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Story>> =>
      this.request<Story>('/stories', {
        method: 'POST',
        body: JSON.stringify(storyData),
      }),
    
    update: (id: number, storyData: Partial<Story>): Promise<ApiResponse<Story>> =>
      this.request<Story>(`/stories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(storyData),
      }),
    
    delete: (id: number): Promise<ApiResponse<void>> =>
      this.request<void>(`/stories/${id}`, { method: 'DELETE' }),
  };

  // Voice recordings endpoints
  voice = {
    getRecordings: (userId: number): Promise<ApiResponse<VoiceRecording[]>> =>
      this.request<VoiceRecording[]>(`/user/${userId}/voice-recordings`),
    
    uploadRecording: (formData: FormData): Promise<ApiResponse<VoiceRecording>> =>
      this.request<VoiceRecording>('/user/voice-recordings', {
        method: 'POST',
        body: formData,
        headers: {}, // Let browser set multipart headers
      }),
    
    deleteRecording: (id: number): Promise<ApiResponse<void>> =>
      this.request<void>(`/user/voice-recordings/${id}`, { method: 'DELETE' }),
  };

  // Health check
  health = {
    check: (): Promise<ApiResponse<{ status: string; timestamp: string }>> =>
      this.request<{ status: string; timestamp: string }>('/health'),
  };
}

export const apiClient = new ApiClient();
export default apiClient;