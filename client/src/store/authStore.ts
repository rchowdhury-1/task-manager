import { create } from 'zustand';
import { User } from '../types';
import { authApi, setAuthToken } from '../services/api';

interface AuthStore {
  user: User | null;
  token: string | null;
  loading: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  validateToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: false,

  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    setAuthToken(token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('token');
    setAuthToken(null);
    set({ user: null, token: null });
  },

  validateToken: async () => {
    const token = get().token;
    if (!token) return false;

    setAuthToken(token);
    try {
      const res = await authApi.me();
      set({ user: res.data.user });
      return true;
    } catch {
      get().logout();
      return false;
    }
  },
}));
