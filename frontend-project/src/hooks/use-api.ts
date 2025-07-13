/**
 * Custom hooks for using the centralized API client
 * Provides typed wrappers around React Query hooks
 */

import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/lib/api-client';
import { queryClient } from '@/lib/queryClient';

// Story hooks
export const useStories = (options?: UseQueryOptions<any[], ApiError> & { userId?: string }) => {
  const { userId, ...queryOptions } = options || {};
  
  return useQuery({
    queryKey: ['/api/stories', userId],
    queryFn: () => {
      if (userId) {
        return apiClient.get(`/api/stories/user/${userId}`);
      }
      return apiClient.stories.list();
    },
    enabled: !!userId,
    ...queryOptions
  });
};

export const useStory = (id: number, options?: UseQueryOptions<any, ApiError>) => {
  return useQuery({
    queryKey: ['/api/stories', id],
    queryFn: () => apiClient.stories.get(id),
    enabled: !!id,
    staleTime: 0, // Always fetch fresh data for individual story
    ...options
  });
};

export const useCreateStory = (options?: UseMutationOptions<any, ApiError, any>) => {
  return useMutation({
    mutationFn: (data: any) => apiClient.stories.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stories'] });
    },
    ...options
  });
};

export const useUpdateStory = (options?: UseMutationOptions<any, ApiError, { id: number; data: any }>) => {
  return useMutation({
    mutationFn: ({ id, data }) => apiClient.stories.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/stories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stories', variables.id] });
    },
    ...options
  });
};

export const useDeleteStory = (options?: UseMutationOptions<void, ApiError, number>) => {
  return useMutation({
    mutationFn: (id: number) => apiClient.stories.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stories'] });
    },
    ...options
  });
};

// Auth hooks
export const useAuth = (options?: UseQueryOptions<any, ApiError>) => {
  return useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: () => apiClient.auth.getUser(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options
  });
};

export const useLogin = (options?: UseMutationOptions<any, ApiError, { email: string; password: string }>) => {
  return useMutation({
    mutationFn: (credentials) => apiClient.auth.login(credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    ...options
  });
};

export const useLogout = (options?: UseMutationOptions<void, ApiError>) => {
  return useMutation({
    mutationFn: () => apiClient.auth.logout(),
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/user'], null);
      queryClient.invalidateQueries();
    },
    ...options
  });
};

// Voice hooks
export const useVoiceSamples = (options?: UseQueryOptions<any[], ApiError>) => {
  return useQuery({
    queryKey: ['/api/voice/samples'],
    queryFn: () => apiClient.voice.getSamples(),
    ...options
  });
};

export const useRecordVoiceSample = (options?: UseMutationOptions<any, ApiError, FormData>) => {
  return useMutation({
    mutationFn: (formData: FormData) => apiClient.voice.recordSample(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/voice/samples'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/esm-recordings'] });
    },
    ...options
  });
};

// Subscription hooks
export const useSubscriptionPlans = (options?: UseQueryOptions<any[], ApiError>) => {
  return useQuery({
    queryKey: ['/api/subscription/plans'],
    queryFn: () => apiClient.subscription.getPlans(),
    ...options
  });
};

export const useCurrentSubscription = (options?: UseQueryOptions<any, ApiError>) => {
  return useQuery({
    queryKey: ['/api/subscription/current'],
    queryFn: () => apiClient.subscription.getCurrentSubscription(),
    ...options
  });
};

export const useSubscribe = (options?: UseMutationOptions<any, ApiError, string>) => {
  return useMutation({
    mutationFn: (planId: string) => apiClient.subscription.subscribe(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/usage'] });
    },
    ...options
  });
};