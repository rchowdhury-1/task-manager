import { Request, Response } from 'express';
import { pool } from '../config/db';

async function logActivity(
  boardId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {}
) {
  await pool.query(
    `INSERT INTO activity_log (board_id, user_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [boardId, userId, action, entityType, entityId, JSON.stringify(metadata)]
  );
}

async function verifyBoardMembership(boardId: string, userId: string): Promise<boolean> {
  const { rows } = await pool.query(
    'SELECT 1 FROM board_members WHERE board_id = $1 AND user_id = $2',
    [boardId, userId]
  );
  return rows.length > 0;
}

export async function createTask(req: Request, res: Response): Promise<void> {
  const { columnId, boardId, title, description, priority, assignedTo, dueDate } = req.body;
  const userId = req.user!.userId;

  if (!columnId || !boardId || !title?.trim()) {
    res.status(400).json({ error: 'columnId, boardId, and title are required' });
    return;
  }

  if (!await verifyBoardMembership(boardId, userId)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  try {
    const { rows: [maxPos] } = await pool.query(
      'SELECT COALESCE(MAX(position), -1) as max_pos FROM tasks WHERE column_id = $1',
      [columnId]
    );
    const position = (maxPos.max_pos as number) + 1;

    const { rows: [task] } = await pool.query(
      `INSERT INTO tasks (column_id, board_id, title, description, priority, assigned_to, created_by, position, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [columnId, boardId, title.trim(), description || null, priority || 'medium',
       assignedTo || null, userId, position, dueDate || null]
    );

    await logActivity(boardId, userId, 'created', 'task', task.id, { title: task.title });

    // Fetch with assignee info
    const { rows: [fullTask] } = await pool.query(
      `SELECT t.*, u.display_name as assignee_name, u.avatar_color as assignee_color
       FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to WHERE t.id = $1`,
      [task.id]
    );

    res.status(201).json({ task: fullTask });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.userId;
  const changes = req.body;

  try {
    const { rows: [task] } = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (!await verifyBoardMembership(task.board_id, userId)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

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

    if (fields.length === 0) {
      res.status(400).json({ error: 'No valid fields to update' });
      return;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const { rows: [updated] } = await pool.query(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    await logActivity(task.board_id, userId, 'updated', 'task', id, { title: updated.title, changes });

    const { rows: [fullTask] } = await pool.query(
      `SELECT t.*, u.display_name as assignee_name, u.avatar_color as assignee_color
       FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to WHERE t.id = $1`,
      [id]
    );

    res.json({ task: fullTask });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task' });
  }
}

export async function moveTask(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { toColumnId, newPosition } = req.body;
  const userId = req.user!.userId;

  if (toColumnId === undefined || newPosition === undefined) {
    res.status(400).json({ error: 'toColumnId and newPosition are required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [task] } = await client.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (!task) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (!await verifyBoardMembership(task.board_id, userId)) {
      await client.query('ROLLBACK');
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const fromColumnId = task.column_id;

    if (fromColumnId === toColumnId) {
      // Reorder within same column
      const { rows: siblings } = await client.query(
        'SELECT id, position FROM tasks WHERE column_id = $1 AND id != $2 ORDER BY position',
        [toColumnId, id]
      );

      siblings.splice(newPosition, 0, { id, position: newPosition });
      for (let i = 0; i < siblings.length; i++) {
        await client.query('UPDATE tasks SET position = $1 WHERE id = $2', [i, siblings[i].id]);
      }
    } else {
      // Move to different column
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
        [toColumnId, newPosition, id]
      );
    }

    await client.query('COMMIT');

    await logActivity(task.board_id, userId, 'moved', 'task', id, {
      title: task.title, fromColumnId, toColumnId, newPosition,
    });

    const { rows: updatedTasks } = await pool.query(
      'SELECT id, column_id, position FROM tasks WHERE board_id = $1',
      [task.board_id]
    );

    res.json({ taskId: id, toColumnId, newPosition, updatedPositions: updatedTasks });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to move task' });
  } finally {
    client.release();
  }
}

export async function deleteTask(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const { rows: [task] } = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (!await verifyBoardMembership(task.board_id, userId)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    await pool.query(
      'UPDATE tasks SET position = position - 1 WHERE column_id = $1 AND position > $2',
      [task.column_id, task.position]
    );

    await logActivity(task.board_id, userId, 'deleted', 'task', id, { title: task.title });

    res.json({ message: 'Task deleted', taskId: id });
  } catch {
    res.status(500).json({ error: 'Failed to delete task' });
  }
}

// Column controllers
export async function addColumn(req: Request, res: Response): Promise<void> {
  const { id: boardId } = req.params;
  const { name, color } = req.body;
  const userId = req.user!.userId;

  if (!name?.trim()) {
    res.status(400).json({ error: 'Column name is required' });
    return;
  }

  if (!await verifyBoardMembership(boardId, userId)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  try {
    const { rows: [maxPos] } = await pool.query(
      'SELECT COALESCE(MAX(position), -1) as max_pos FROM columns WHERE board_id = $1',
      [boardId]
    );

    const { rows: [column] } = await pool.query(
      `INSERT INTO columns (board_id, name, position, color) VALUES ($1, $2, $3, $4) RETURNING *`,
      [boardId, name.trim(), (maxPos.max_pos as number) + 1, color || '#6366f1']
    );

    await logActivity(boardId, userId, 'created', 'column', column.id, { name: column.name });
    res.status(201).json({ column });
  } catch {
    res.status(500).json({ error: 'Failed to add column' });
  }
}

export async function updateColumn(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, color } = req.body;
  const userId = req.user!.userId;

  try {
    const { rows: [col] } = await pool.query('SELECT * FROM columns WHERE id = $1', [id]);
    if (!col) {
      res.status(404).json({ error: 'Column not found' });
      return;
    }

    if (!await verifyBoardMembership(col.board_id, userId)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const newName = name?.trim() || col.name;
    const newColor = color || col.color;

    const { rows: [updated] } = await pool.query(
      'UPDATE columns SET name = $1, color = $2 WHERE id = $3 RETURNING *',
      [newName, newColor, id]
    );

    res.json({ column: updated });
  } catch {
    res.status(500).json({ error: 'Failed to update column' });
  }
}

export async function deleteColumn(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const { rows: [col] } = await pool.query('SELECT * FROM columns WHERE id = $1', [id]);
    if (!col) {
      res.status(404).json({ error: 'Column not found' });
      return;
    }

    if (!await verifyBoardMembership(col.board_id, userId)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await pool.query('DELETE FROM columns WHERE id = $1', [id]);
    await pool.query(
      'UPDATE columns SET position = position - 1 WHERE board_id = $1 AND position > $2',
      [col.board_id, col.position]
    );

    res.json({ message: 'Column deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete column' });
  }
}
