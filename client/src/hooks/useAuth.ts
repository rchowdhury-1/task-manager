import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

export function useAuth() {
  const { setAuth, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const register = async (email: string, password: string, display_name: string) => {
    setLoading(true);
    try {
      const res = await authApi.register({ email, password, display_name });
      setAuth(res.data.user, res.data.token);
      toast.success('Account created!');
      return true;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Registration failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      setAuth(res.data.user, res.data.token);
      toast.success('Welcome back!');
      return true;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { register, login, logout, loading };
}
