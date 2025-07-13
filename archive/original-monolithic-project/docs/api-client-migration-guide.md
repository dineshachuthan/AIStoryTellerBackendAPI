# API Client Migration Guide

This guide explains how to use the centralized API client instead of scattered API calls throughout the frontend.

## Overview

The centralized API client provides:
- Standardized error handling with typed errors
- Automatic response unwrapping (extracts `data` from successful responses)
- Integration with i18n for error messages
- TypeScript support
- Single place to update API endpoints

## Basic Usage

### Before (Scattered API calls):
```tsx
// In component A
const { data: stories } = useQuery({
  queryKey: ['/api/stories'],
  queryFn: async () => {
    const res = await fetch('/api/stories', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  }
});

// In component B - duplicate code!
const deleteStory = async (id: number) => {
  const res = await fetch(`/api/stories/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to delete');
};
```

### After (Centralized API client):
```tsx
// Using custom hooks
import { useStories, useDeleteStory } from '@/hooks/use-api';

const { data: stories } = useStories();
const deleteStoryMutation = useDeleteStory();

// Or using the API client directly
import { apiClient } from '@/lib/api-client';

const { data: stories } = useQuery({
  queryKey: ['/api/stories'],
  queryFn: () => apiClient.stories.list()
});
```

## Error Handling

### Typed Errors with i18n
```tsx
import { ApiError } from '@/lib/api-client';
import { getMessage } from '@shared/i18n-hierarchical';

const createStoryMutation = useMutation({
  mutationFn: (data) => apiClient.stories.create(data),
  onError: (error) => {
    if (error instanceof ApiError) {
      // Get localized error message
      const message = getMessage(error.messageKey);
      toast.error(message.message);
      
      // Access error details
      console.error('Error code:', error.code);
      console.error('Details:', error.details);
    }
  }
});
```

## File Uploads

For FormData (file uploads), the API client automatically handles headers:

```tsx
const uploadAudioMutation = useMutation({
  mutationFn: (formData: FormData) => apiClient.stories.uploadAudio(formData)
});

// Usage
const handleFileUpload = (file: File) => {
  const formData = new FormData();
  formData.append('audio', file);
  formData.append('storyId', '123');
  
  uploadAudioMutation.mutate(formData);
};
```

## Adding New Endpoints

To add a new endpoint, update the API client:

```typescript
// In client/src/lib/api-client.ts
export class ApiClient {
  // ... existing code ...
  
  // Add new endpoint group
  analytics = {
    getStats: () => this.request<any>('GET', '/api/analytics/stats'),
    getReport: (type: string) => this.request<any>('GET', `/api/analytics/report/${type}`),
  };
}
```

Then create corresponding hooks:

```typescript
// In client/src/hooks/use-api.ts
export const useAnalyticsStats = () => {
  return useQuery({
    queryKey: ['/api/analytics/stats'],
    queryFn: () => apiClient.analytics.getStats()
  });
};
```

## Benefits

1. **No Duplicate Code**: API logic is centralized
2. **Type Safety**: Full TypeScript support with typed responses
3. **Consistent Error Handling**: All errors follow the same format
4. **Easy to Maintain**: Update endpoints in one place
5. **i18n Integration**: Error messages automatically localized
6. **Better Testing**: Mock the API client for tests

## Migration Checklist

- [ ] Replace direct `fetch` calls with `apiClient` methods
- [ ] Use custom hooks from `use-api.ts` where possible
- [ ] Remove duplicate API logic from components
- [ ] Update error handling to use `ApiError` type
- [ ] Test file uploads work correctly
- [ ] Verify authentication flows still work