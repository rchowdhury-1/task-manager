import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

// Auth
export const authApi = {
  register: (data: { email: string; password: string; display_name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Boards
export const boardsApi = {
  create: (name: string) => api.post('/boards', { name }),
  list: () => api.get('/boards'),
  get: (id: string) => api.get(`/boards/${id}`),
  join: (inviteCode: string) => api.post('/boards/join', { invite_code: inviteCode }),
  delete: (id: string) => api.delete(`/boards/${id}`),
  getActivities: (id: string) => api.get(`/boards/${id}/activities`),
  addColumn: (boardId: string, data: { name: string; color?: string }) =>
    api.post(`/boards/${boardId}/columns`, data),
};

// Tasks
export const tasksApi = {
  create: (data: {
    columnId: string; boardId: string; title: string;
    description?: string; priority?: string; assignedTo?: string; dueDate?: string;
  }) => api.post('/tasks', data),
  update: (id: string, changes: Record<string, unknown>) => api.patch(`/tasks/${id}`, changes),
  move: (id: string, toColumnId: string, newPosition: number) =>
    api.patch(`/tasks/${id}/move`, { toColumnId, newPosition }),
  delete: (id: string) => api.delete(`/tasks/${id}`),
};

// Columns
export const columnsApi = {
  update: (id: string, data: { name?: string; color?: string }) =>
    api.patch(`/columns/${id}`, data),
  delete: (id: string) => api.delete(`/columns/${id}`),
};
