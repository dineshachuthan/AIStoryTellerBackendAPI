import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { config } from '@/config/runtime';

export function useAuth() {
  const queryClient = useQueryClient();

  // Check authentication status
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          return null; // No token, not authenticated
        }
        
        const apiUrl = config.API_URL ? `${config.API_URL}/api/auth/user` : '/api/auth/user';
        const res = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (res.status === 401) {
          // Token expired or invalid, clear it
          localStorage.removeItem('auth_token');
          return null;
        }
        
        if (!res.ok) {
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        return data?.data || null;
      } catch (error) {
        return null;
      }
    },
    retry: false,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const apiUrl = config.API_URL ? `${config.API_URL}/api/auth/login` : '/api/auth/login';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      displayName?: string;
    }) => {
      const apiUrl = config.API_URL ? `${config.API_URL}/api/auth/register` : '/api/auth/register';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const apiUrl = config.API_URL ? `${config.API_URL}/api/auth/logout` : '/api/auth/logout';
      const res = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/user'], null);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error?.message,
  };
}