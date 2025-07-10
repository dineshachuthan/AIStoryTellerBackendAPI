import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiClient, ApiError } from "./api-client";
import { getMessage } from '@shared/utils/i18n-hierarchical';
import { toast } from "@/hooks/use-toast";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options?: RequestInit,
): Promise<any> {
  const defaultOptions: RequestInit = {
    method: 'GET',
    credentials: "include",
  };

  const finalOptions = { ...defaultOptions, ...options };

  // Handle FormData - don't set Content-Type header for FormData
  if (finalOptions.body instanceof FormData) {
    // Remove Content-Type header for FormData - browser will set it automatically
    if (finalOptions.headers && 'Content-Type' in (finalOptions.headers as any)) {
      delete (finalOptions.headers as any)['Content-Type'];
    }
  } else if (finalOptions.body && typeof finalOptions.body === 'object') {
    // For JSON data, ensure Content-Type is set
    finalOptions.headers = {
      'Content-Type': 'application/json',
      ...finalOptions.headers,
    };
  }

  const res = await fetch(url, finalOptions);
  await throwIfResNotOk(res);
  
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await res.json();
  }
  
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30 * 60 * 1000, // 30 minutes cache duration
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Cache invalidation utility for database updates
export const invalidateRelatedQueries = (table: string, recordId?: string | number) => {
  const queryKeysToInvalidate: string[][] = [];
  
  switch (table) {
    case 'user_voice_emotions':
      queryKeysToInvalidate.push(
        ["/api/voice-samples"],
        ["/api/voice-cloning/session-status"],
        ["/api/voice-samples/progress"],
        ["/api/voice-training/status"]
      );
      break;
    case 'voice_profiles':
      queryKeysToInvalidate.push(
        ["/api/voice-cloning/session-status"],
        ["/api/voice-training/status"]
      );
      break;
    case 'emotion_voices':
      queryKeysToInvalidate.push(
        ["/api/voice-cloning/session-status"],
        ["/api/voice-training/status"]
      );
      break;
    case 'stories':
      queryKeysToInvalidate.push(
        ["/api/stories"],
        ["/api/stories", recordId],
        ["/api/stories/user"]
      );
      break;
    case 'story_analysis':
      if (recordId) {
        queryKeysToInvalidate.push(["/api/stories", recordId, "analysis"]);
      }
      break;
    case 'generated_audio_cache':
      queryKeysToInvalidate.push(["/api/audio-cache/stats"]);
      break;
    default:
      console.warn(`Unknown table for cache invalidation: ${table}`);
  }
  
  // Invalidate all related queries
  queryKeysToInvalidate.forEach(queryKey => {
    queryClient.invalidateQueries({ queryKey });
  });
};
