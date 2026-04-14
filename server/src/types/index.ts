export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  avatar_color: string;
  created_at: Date;
}

export interface Board {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: Date;
}

export interface BoardMember {
  board_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: Date;
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
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: string | null;
  created_by: string;
  position: number;
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ActivityLog {
  id: string;
  board_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface AuthPayload {
  userId: string;
  email: string;
}

export interface ActiveUser {
  id: string;
  displayName: string;
  avatarColor: string;
  cursorPosition?: { x: number; y: number };
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
