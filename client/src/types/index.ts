export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_color: string;
  created_at?: string;
}

export interface Board {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
  role?: 'owner' | 'member';
  columns?: Column[];
  tasks?: Task[];
  members?: BoardMember[];
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  position: number;
  color: string;
}

export interface Task {
  id: string;
  column_id: string;
  board_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  assigned_to: string | null;
  assignee_name: string | null;
  assignee_color: string | null;
  created_by: string;
  position: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardMember {
  id: string;
  display_name: string;
  avatar_color: string;
  email: string;
  role: 'owner' | 'member';
}

export interface ActiveUser {
  id: string;
  displayName: string;
  avatarColor: string;
  cursorPosition?: { x: number; y: number };
}

export interface ActivityEntry {
  id?: string;
  action: string;
  user: { id: string; displayName: string; avatarColor: string };
  entityType?: string;
  entity_type?: string;
  entityId?: string;
  entity_id?: string;
  metadata: Record<string, unknown>;
  createdAt?: string;
  created_at?: string;
  // DB fields
  display_name?: string;
  avatar_color?: string;
  user_id?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}
