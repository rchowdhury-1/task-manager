export interface User {
  id: string;
  name: string;
  email: string;
  avatar_color: string;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  owner_name: string;
  member_count: number;
  board_count: number;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  avatar_color: string;
  role: string;
  created_at: string;
}

export interface Board {
  id: string;
  workspace_id: string;
  workspace_name?: string;
  name: string;
  color: string;
  column_count?: number;
  card_count?: number;
  created_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  title: string;
  position: number;
  created_at: string;
}

export interface Card {
  id: string;
  column_id: string;
  board_id?: string;
  title: string;
  description?: string;
  position: number;
  due_date?: string;
  assigned_to?: string;
  assignee_name?: string;
  assignee_color?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
}

export interface Comment {
  id: string;
  card_id: string;
  user_id: string;
  user_name: string;
  avatar_color: string;
  content: string;
  created_at: string;
}

export interface DashboardStats {
  workspaces: number;
  boards: number;
  assignedCards: number;
  overdueCards: number;
}

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
