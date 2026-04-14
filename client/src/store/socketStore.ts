import { create } from 'zustand';
import { Socket } from 'socket.io-client';
import { ActiveUser } from '../types';

interface SocketStore {
  socket: Socket | null;
  connected: boolean;
  activeUsers: ActiveUser[];
  cursors: Map<string, { x: number; y: number; displayName: string; avatarColor: string }>;
  setSocket: (socket: Socket | null) => void;
  setConnected: (v: boolean) => void;
  setActiveUsers: (users: ActiveUser[]) => void;
  addActiveUser: (user: ActiveUser) => void;
  removeActiveUser: (userId: string) => void;
  updateCursor: (userId: string, x: number, y: number, displayName: string, avatarColor: string) => void;
  removeCursor: (userId: string) => void;
}

export const useSocketStore = create<SocketStore>((set) => ({
  socket: null,
  connected: false,
  activeUsers: [],
  cursors: new Map(),

  setSocket: (socket) => set({ socket }),
  setConnected: (v) => set({ connected: v }),

  setActiveUsers: (users) => set({ activeUsers: users }),

  addActiveUser: (user) =>
    set((state) => ({
      activeUsers: state.activeUsers.some((u) => u.id === user.id)
        ? state.activeUsers
        : [...state.activeUsers, user],
    })),

  removeActiveUser: (userId) =>
    set((state) => ({
      activeUsers: state.activeUsers.filter((u) => u.id !== userId),
    })),

  updateCursor: (userId, x, y, displayName, avatarColor) =>
    set((state) => {
      const next = new Map(state.cursors);
      next.set(userId, { x, y, displayName, avatarColor });
      return { cursors: next };
    }),

  removeCursor: (userId) =>
    set((state) => {
      const next = new Map(state.cursors);
      next.delete(userId);
      return { cursors: next };
    }),
}));
