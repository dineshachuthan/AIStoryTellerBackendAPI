import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const queryClient = useQueryClient();

  // Query to get current user
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      try {
        const response = await apiClient.auth.getCurrentUser();
        setIsAuthenticated(true);
        return response.data;
      } catch (error) {
        setIsAuthenticated(false);
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: apiClient.auth.login,
    onSuccess: (response) => {
      setIsAuthenticated(true);
      queryClient.setQueryData(['auth', 'user'], response.data);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    onError: () => {
      setIsAuthenticated(false);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: apiClient.auth.register,
    onSuccess: (response) => {
      setIsAuthenticated(true);
      queryClient.setQueryData(['auth', 'user'], response.data);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    onError: () => {
      setIsAuthenticated(false);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: apiClient.auth.logout,
    onSuccess: () => {
      setIsAuthenticated(false);
      queryClient.setQueryData(['auth', 'user'], null);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.clear();
    },
  });

  // Update authentication state when user query changes
  useEffect(() => {
    if (user) {
      setIsAuthenticated(true);
    } else if (error) {
      setIsAuthenticated(false);
    }
  }, [user, error]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
    loginError: loginMutation.error?.message,
    registerError: registerMutation.error?.message,
  };
}