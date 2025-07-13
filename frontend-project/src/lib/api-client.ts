// API Client for communicating with backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<{ data: T }> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  auth = {
    getCurrentUser: async () => {
      return this.request('/api/auth/user');
    },
    login: async (credentials: { email: string; password: string }) => {
      return this.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    },
    register: async (userData: { email: string; password: string; name: string }) => {
      return this.request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
    logout: async () => {
      return this.request('/api/auth/logout', {
        method: 'POST',
      });
    },
  };

  // Stories endpoints
  stories = {
    getAll: async () => {
      return this.request('/api/stories');
    },
    getById: async (id: number) => {
      return this.request(`/api/stories/${id}`);
    },
    create: async (story: { title: string; content: string; genre?: string; category?: string }) => {
      return this.request('/api/stories', {
        method: 'POST',
        body: JSON.stringify(story),
      });
    },
  };

  // Voice recordings endpoints
  voice = {
    getRecordings: async (userId: number) => {
      return this.request(`/api/user/${userId}/voice-recordings`);
    },
  };
}

export const apiClient = new ApiClient(API_BASE_URL);