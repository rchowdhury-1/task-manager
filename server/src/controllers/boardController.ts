import { Request, Response } from 'express';
import { pool } from '../config/db';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

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

export async function createBoard(req: Request, res: Response): Promise<void> {
  const { name } = req.body;
  const userId = req.user!.userId;

  if (!name?.trim()) {
    res.status(400).json({ error: 'Board name is required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let inviteCode: string;
    let attempts = 0;
    do {
      inviteCode = generateInviteCode();
      const exists = await client.query('SELECT id FROM boards WHERE invite_code = $1', [inviteCode]);
      if (exists.rows.length === 0) break;
      attempts++;
    } while (attempts < 10);

    const { rows: [board] } = await client.query(
      `INSERT INTO boards (name, owner_id, invite_code) VALUES ($1, $2, $3) RETURNING *`,
      [name.trim(), userId, inviteCode!]
    );

    await client.query(
      `INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [board.id, userId]
    );

    const defaultColumns = [
      { name: 'To Do', position: 0, color: '#6366f1' },
      { name: 'In Progress', position: 1, color: '#f59e0b' },
      { name: 'Done', position: 2, color: '#10b981' },
    ];

    for (const col of defaultColumns) {
      await client.query(
        `INSERT INTO columns (board_id, name, position, color) VALUES ($1, $2, $3, $4)`,
        [board.id, col.name, col.position, col.color]
      );
    }

    await client.query('COMMIT');

    await logActivity(board.id, userId, 'created', 'board', board.id, { name: board.name });

    const columns = await pool.query(
      'SELECT * FROM columns WHERE board_id = $1 ORDER BY position',
      [board.id]
    );

    res.status(201).json({ board: { ...board, columns: columns.rows, tasks: [], members: [] } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create board' });
  } finally {
    client.release();
  }
}

export async function getBoards(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  try {
    const { rows } = await pool.query(
      `SELECT b.*, bm.role
       FROM boards b
       JOIN board_members bm ON bm.board_id = b.id
       WHERE bm.user_id = $1
       ORDER BY b.created_at DESC`,
      [userId]
    );
    res.json({ boards: rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
}

export async function getBoard(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const member = await pool.query(
      'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2',
      [id, userId]
    );
    if (member.rows.length === 0) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { rows: [board] } = await pool.query('SELECT * FROM boards WHERE id = $1', [id]);
    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    const [columns, tasks, members] = await Promise.all([
      pool.query('SELECT * FROM columns WHERE board_id = $1 ORDER BY position', [id]),
      pool.query(
        `SELECT t.*, u.display_name as assignee_name, u.avatar_color as assignee_color
         FROM tasks t
         LEFT JOIN users u ON u.id = t.assigned_to
         WHERE t.board_id = $1
         ORDER BY t.position`,
        [id]
      ),
      pool.query(
        `SELECT u.id, u.display_name, u.avatar_color, u.email, bm.role
         FROM board_members bm
         JOIN users u ON u.id = bm.user_id
         WHERE bm.board_id = $1`,
        [id]
      ),
    ]);

    res.json({
      board: {
        ...board,
        columns: columns.rows,
        tasks: tasks.rows,
        members: members.rows,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch board' });
  }
}

export async function joinBoard(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { invite_code } = req.body;
  const userId = req.user!.userId;

  if (!invite_code) {
    res.status(400).json({ error: 'invite_code is required' });
    return;
  }

  try {
    const { rows: [board] } = await pool.query(
      'SELECT * FROM boards WHERE id = $1 AND invite_code = $2',
      [id, invite_code.toUpperCase()]
    );

    if (!board) {
      res.status(400).json({ error: 'Invalid invite code' });
      return;
    }

    const existing = await pool.query(
      'SELECT 1 FROM board_members WHERE board_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Already a member' });
      return;
    }

    await pool.query(
      `INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, 'member')`,
      [id, userId]
    );

    await logActivity(id, userId, 'joined', 'board', id, { boardName: board.name });

    res.json({ message: 'Joined board', board });
  } catch {
    res.status(500).json({ error: 'Failed to join board' });
  }
}

export async function joinBoardByCode(req: Request, res: Response): Promise<void> {
  const { invite_code } = req.body;
  const userId = req.user!.userId;

  if (!invite_code) {
    res.status(400).json({ error: 'invite_code is required' });
    return;
  }

  try {
    const { rows: [board] } = await pool.query(
      'SELECT * FROM boards WHERE invite_code = $1',
      [invite_code.toUpperCase()]
    );

    if (!board) {
      res.status(404).json({ error: 'Board not found with that invite code' });
      return;
    }

    const existing = await pool.query(
      'SELECT 1 FROM board_members WHERE board_id = $1 AND user_id = $2',
      [board.id, userId]
    );

    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Already a member' });
      return;
    }

    await pool.query(
      `INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, 'member')`,
      [board.id, userId]
    );

    await logActivity(board.id, userId, 'joined', 'board', board.id, { boardName: board.name });

    res.json({ message: 'Joined board', board });
  } catch {
    res.status(500).json({ error: 'Failed to join board' });
  }
}

export async function deleteBoard(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const { rows: [member] } = await pool.query(
      'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (!member || member.role !== 'owner') {
      res.status(403).json({ error: 'Only the board owner can delete it' });
      return;
    }

    await pool.query('DELETE FROM boards WHERE id = $1', [id]);
    res.json({ message: 'Board deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete board' });
  }
}

export async function getActivities(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const member = await pool.query(
      'SELECT 1 FROM board_members WHERE board_id = $1 AND user_id = $2',
      [id, userId]
    );
    if (member.rows.length === 0) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { rows } = await pool.query(
      `SELECT al.*, u.display_name, u.avatar_color
       FROM activity_log al
       JOIN users u ON u.id = al.user_id
       WHERE al.board_id = $1
       ORDER BY al.created_at DESC
       LIMIT 50`,
      [id]
    );

    res.json({ activities: rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
}
