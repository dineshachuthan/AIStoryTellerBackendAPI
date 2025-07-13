/**
 * Example usage of generated OpenAPI types
 * This demonstrates how an external vendor can consume the API with full type safety
 */

import type { User, Story, PostapiauthloginRequest, APIClient } from '../../client/src/generated/api-types';

// Example implementation of APIClient interface using fetch
class StorytellingAPIClient implements APIClient {
  private baseURL: string;
  private headers: Record<string, string>;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
      credentials: 'include', // Important for session cookies
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Authentication endpoints
  async postapiauthlogin(data: PostapiauthloginRequest): Promise<User> {
    return this.request<User>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getapiauthuser(): Promise<User> {
    return this.request<User>('/api/auth/user');
  }

  // Story endpoints
  async getapistories(query?: { page?: number; limit?: number; status?: 'draft' | 'complete' | 'published' }): Promise<Story[]> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.status) params.append('status', query.status);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request<Story[]>(`/api/stories${queryString}`);
  }

  async getapistoriesid(id: number): Promise<Story> {
    return this.request<Story>(`/api/stories/${id}`);
  }

  // Add other methods as needed...
}

// Example usage
async function demonstrateAPIUsage() {
  const client = new StorytellingAPIClient('https://api.storytelling-platform.com');

  try {
    // Login with type-safe request
    const user = await client.postapiauthlogin({
      email: 'user@example.com',
      password: 'securepassword123',
    });
    console.log('Logged in as:', user.name);

    // Get stories with type-safe query parameters
    const stories = await client.getapistories({
      page: 1,
      limit: 10,
      status: 'published',
    });
    console.log(`Found ${stories.length} published stories`);

    // TypeScript ensures type safety
    stories.forEach(story => {
      // story.id is number
      // story.title is string
      // story.status is union type: 'draft' | 'complete' | 'published'
      console.log(`Story #${story.id}: ${story.title} (${story.status})`);
    });

  } catch (error) {
    console.error('API Error:', error);
  }
}

// Export for external vendors to implement
export { StorytellingAPIClient };
export type { APIClient } from '../../client/src/generated/api-types';