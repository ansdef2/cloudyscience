import { useState, useEffect } from 'react';
import { authApi } from '@/utils/LegacyApi';
import { clearAuthToken, getAuthToken, setAuthToken } from '@/utils/api';
import { preventSilentSignIn, saveCredential, setRememberedLogin } from '@/utils/credentials';
import { RegisterData, User } from '@/models/Api';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
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

  const login = async (email: string, password: string, remember = true) => {
    try {
      const response = await authApi.login(email, password);
      if (response.data) {
        const data = response.data as { user: User; token: string };
        setAuthToken(data.token, remember);
        setRememberedLogin(email, remember);
        // Пароль хранит браузер, а не сайт: только если человек просил запомнить.
        // Не ждём — диалог браузера не должен задерживать вход
        if (remember) void saveCredential(email, password, data.user.name);
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const register = async (form: RegisterData) => {
    try {
      const response = await authApi.register(form);
      if (response.data) {
        const data = response.data as { user: User; token: string; parentLetterSent?: boolean };
        setAuthToken(data.token, true);
        setRememberedLogin(form.email, true);
        void saveCredential(form.email, form.password, form.name);
        setUser(data.user);
        return { success: true, user: data.user, parentLetterSent: data.parentLetterSent };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    clearAuthToken();
    preventSilentSignIn();
    setUser(null);
  };

  return {
    user,
    setUser,
    reload: loadUser,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };
};
