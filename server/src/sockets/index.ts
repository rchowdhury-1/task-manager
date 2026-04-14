import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { pool } from '../config/db';
import { AuthPayload, ActiveUser } from '../types';

// Track active users per board: boardId -> Map<userId, ActiveUser & { socketId }>
const boardUsers = new Map<string, Map<string, ActiveUser & { socketId: string }>>();

// Cursor throttle tracking
const cursorThrottle = new Map<string, NodeJS.Timeout>();

async function logActivity(
  boardId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    await pool.query(
      `INSERT INTO activity_log (board_id, user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [boardId, userId, action, entityType, entityId, JSON.stringify(metadata)]
    );
  } catch (err) {
    console.error('Activity log error:', err);
  }
}

function getActivityPayload(
  userId: string,
  displayName: string,
  avatarColor: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown>
) {
  return {
    action,
    user: { id: userId, displayName, avatarColor },
    entityType,
    entityId,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

export function initSockets(io: Server) {
  // Auth middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
      const { rows } = await pool.query(
        'SELECT id, display_name, avatar_color FROM users WHERE id = $1',
        [payload.userId]
      );
      if (rows.length === 0) return next(new Error('User not found'));

      (socket as Socket & { user: ActiveUser }).user = {
        id: rows[0].id,
        displayName: rows[0].display_name,
        avatarColor: rows[0].avatar_color,
      };
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as Socket & { user: ActiveUser }).user;

    socket.on('join-board', async ({ boardId }: { boardId: string }) => {
      // Verify membership
      const { rows } = await pool.query(
        'SELECT 1 FROM board_members WHERE board_id = $1 AND user_id = $2',
        [boardId, user.id]
      );
      if (rows.length === 0) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      socket.join(`board:${boardId}`);

      // Track active users
      if (!boardUsers.has(boardId)) boardUsers.set(boardId, new Map());
      boardUsers.get(boardId)!.set(user.id, { ...user, socketId: socket.id });

      // Tell the room someone joined
      socket.to(`board:${boardId}`).emit('user-joined', {
        user: { id: user.id, displayName: user.displayName, avatarColor: user.avatarColor },
      });

      // Send the active users list to the joining client
      const activeList = Array.from(boardUsers.get(boardId)!.values()).map(
        ({ socketId: _, ...u }) => u
      );
      socket.emit('active-users', activeList);
    });

    socket.on('leave-board', ({ boardId }: { boardId: string }) => {
      socket.leave(`board:${boardId}`);
      boardUsers.get(boardId)?.delete(user.id);
      socket.to(`board:${boardId}`).emit('user-left', { userId: user.id });
    });

    // Task events
    socket.on('task-create', async (data: {
      boardId: string; columnId: string; title: string;
      description?: string; priority?: string; assignedTo?: string; dueDate?: string;
    }) => {
      const { boardId, columnId, title, description, priority, assignedTo, dueDate } = data;

      const { rows: [maxPos] } = await pool.query(
        'SELECT COALESCE(MAX(position), -1) as max_pos FROM tasks WHERE column_id = $1',
        [columnId]
      );
      const position = (maxPos.max_pos as number) + 1;

      const { rows: [task] } = await pool.query(
        `INSERT INTO tasks (column_id, board_id, title, description, priority, assigned_to, created_by, position, due_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [columnId, boardId, title, description || null, priority || 'medium',
         assignedTo || null, user.id, position, dueDate || null]
      );

      const { rows: [fullTask] } = await pool.query(
        `SELECT t.*, u.display_name as assignee_name, u.avatar_color as assignee_color
         FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to WHERE t.id = $1`,
        [task.id]
      );

      await logActivity(boardId, user.id, 'created', 'task', task.id, { title });
      socket.to(`board:${boardId}`).emit('task-created', { task: fullTask });

      const activity = getActivityPayload(user.id, user.displayName, user.avatarColor,
        'created', 'task', task.id, { title });
      io.to(`board:${boardId}`).emit('activity', activity);
    });

    socket.on('task-update', async (data: { taskId: string; changes: Record<string, unknown> }) => {
      const { taskId, changes } = data;
      const { rows: [task] } = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
      if (!task) return;

      const allowed = ['title', 'description', 'priority', 'assigned_to', 'due_date'];
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      for (const key of allowed) {
        const camelKey = key === 'assigned_to' ? 'assignedTo' : key === 'due_date' ? 'dueDate' : key;
        if (camelKey in changes || key in changes) {
          fields.push(`${key} = $${idx}`);
          values.push(changes[camelKey] ?? changes[key] ?? null);
          idx++;
        }
      }

      if (fields.length === 0) return;
      fields.push(`updated_at = NOW()`);
      values.push(taskId);

      await pool.query(`UPDATE tasks SET ${fields.join(', ')} WHERE id = $${idx}`, values);

      const { rows: [fullTask] } = await pool.query(
        `SELECT t.*, u.display_name as assignee_name, u.avatar_color as assignee_color
         FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to WHERE t.id = $1`,
        [taskId]
      );

      await logActivity(task.board_id, user.id, 'updated', 'task', taskId, { title: task.title });
      socket.to(`board:${task.board_id}`).emit('task-updated', { task: fullTask });

      const activity = getActivityPayload(user.id, user.displayName, user.avatarColor,
        'updated', 'task', taskId, { title: fullTask.title });
      io.to(`board:${task.board_id}`).emit('activity', activity);
    });

    socket.on('task-move', async (data: { taskId: string; toColumnId: string; newPosition: number }) => {
      const { taskId, toColumnId, newPosition } = data;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows: [task] } = await client.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
        if (!task) { await client.query('ROLLBACK'); return; }

        const fromColumnId = task.column_id;

        if (fromColumnId === toColumnId) {
          const { rows: siblings } = await client.query(
            'SELECT id FROM tasks WHERE column_id = $1 AND id != $2 ORDER BY position',
            [toColumnId, taskId]
          );
          siblings.splice(newPosition, 0, { id: taskId });
          for (let i = 0; i < siblings.length; i++) {
            await client.query('UPDATE tasks SET position = $1 WHERE id = $2', [i, siblings[i].id]);
          }
        } else {
          await client.query(
            'UPDATE tasks SET position = position - 1 WHERE column_id = $1 AND position > $2',
            [fromColumnId, task.position]
          );
          await client.query(
            'UPDATE tasks SET position = position + 1 WHERE column_id = $1 AND position >= $2',
            [toColumnId, newPosition]
          );
          await client.query(
            'UPDATE tasks SET column_id = $1, position = $2, updated_at = NOW() WHERE id = $3',
            [toColumnId, newPosition, taskId]
          );
        }

        await client.query('COMMIT');

        const { rows: updatedPositions } = await pool.query(
          'SELECT id, column_id, position FROM tasks WHERE board_id = $1',
          [task.board_id]
        );

        await logActivity(task.board_id, user.id, 'moved', 'task', taskId, {
          title: task.title, fromColumnId, toColumnId, newPosition,
        });

        socket.to(`board:${task.board_id}`).emit('task-moved', {
          taskId, toColumnId, newPosition, updatedPositions,
        });

        const activity = getActivityPayload(user.id, user.displayName, user.avatarColor,
          'moved', 'task', taskId, { title: task.title, toColumnId });
        io.to(`board:${task.board_id}`).emit('activity', activity);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
      } finally {
        client.release();
      }
    });

    socket.on('task-delete', async ({ taskId }: { taskId: string }) => {
      const { rows: [task] } = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
      if (!task) return;

      await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
      await pool.query(
        'UPDATE tasks SET position = position - 1 WHERE column_id = $1 AND position > $2',
        [task.column_id, task.position]
      );

      await logActivity(task.board_id, user.id, 'deleted', 'task', taskId, { title: task.title });
      socket.to(`board:${task.board_id}`).emit('task-deleted', { taskId });

      const activity = getActivityPayload(user.id, user.displayName, user.avatarColor,
        'deleted', 'task', taskId, { title: task.title });
      io.to(`board:${task.board_id}`).emit('activity', activity);
    });

    // Cursor movement (throttled 50ms server-side)
    socket.on('cursor-move', ({ boardId, x, y }: { boardId: string; x: number; y: number }) => {
      const key = `${socket.id}:cursor`;
      if (cursorThrottle.has(key)) return;

      socket.to(`board:${boardId}`).emit('cursor-update', { userId: user.id, x, y });

      const timeout = setTimeout(() => cursorThrottle.delete(key), 50);
      cursorThrottle.set(key, timeout);
    });

    // Typing indicator
    socket.on('user-typing', ({ taskId, boardId }: { taskId: string; boardId: string }) => {
      socket.to(`board:${boardId}`).emit('user-typing', {
        userId: user.id,
        displayName: user.displayName,
        taskId,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      // Remove from all boards
      for (const [boardId, users] of boardUsers.entries()) {
        if (users.has(user.id)) {
          users.delete(user.id);
          io.to(`board:${boardId}`).emit('user-left', { userId: user.id });
        }
      }

      // Clean up throttle timers
      for (const [key, timer] of cursorThrottle.entries()) {
        if (key.startsWith(socket.id)) {
          clearTimeout(timer);
          cursorThrottle.delete(key);
        }
      }
    });
  });
}
