import { useState, useEffect } from 'react';
import { authApi } from '@/utils/LegacyApi';
import { AUTH_TOKEN_KEY } from '@/utils/api';
import { User } from '@/models/Api';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUser = async () => {
    try {
      const response = await authApi.getProfile();
      if (response.data) {
        setUser(response.data as User);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      if (response.data) {
        const data = response.data as { user: User; token: string };
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await authApi.register(email, password, name);
      if (response.data) {
        const data = response.data as { user: User; token: string };
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
  };

  return {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };
};
