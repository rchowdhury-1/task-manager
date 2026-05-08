const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /workspaces
router.get('/', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT w.*, u.name as owner_name,
        (SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = w.id) as member_count,
        (SELECT COUNT(*) FROM boards b WHERE b.workspace_id = w.id) as board_count
      FROM workspaces w
      JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = $1
      JOIN users u ON u.id = w.owner_id
      ORDER BY w.created_at DESC
    `, [req.user.userId]);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /workspaces
router.post('/', [body('name').trim().isLength({ min: 1, max: 100 })], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { name } = req.body;
    const wsResult = await query(
      'INSERT INTO workspaces (name, owner_id) VALUES ($1,$2) RETURNING *',
      [name, req.user.userId]
    );
    const workspace = wsResult.rows[0];
    await query(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1,$2,$3)',
      [workspace.id, req.user.userId, 'owner']
    );
    res.status(201).json(workspace);
  } catch (err) { next(err); }
});

// DELETE /workspaces/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const ws = await query('SELECT * FROM workspaces WHERE id=$1 AND owner_id=$2', [req.params.id, req.user.userId]);
    if (ws.rows.length === 0) return res.status(403).json({ error: 'Not authorized' });
    await query('DELETE FROM workspaces WHERE id=$1', [req.params.id]);
    res.json({ message: 'Workspace deleted' });
  } catch (err) { next(err); }
});

// POST /workspaces/:id/invite
router.post('/:id/invite', [body('email').isEmail().normalizeEmail()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    // Check requester is owner or admin
    const membership = await query(
      "SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2",
      [req.params.id, req.user.userId]
    );
    if (membership.rows.length === 0 || !['owner','admin'].includes(membership.rows[0].role)) {
      return res.status(403).json({ error: 'Not authorized to invite members' });
    }

    const { email, role = 'member' } = req.body;
    const userResult = await query('SELECT id FROM users WHERE email=$1', [email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const invitedUser = userResult.rows[0];
    const existing = await query(
      'SELECT id FROM workspace_members WHERE workspace_id=$1 AND user_id=$2',
      [req.params.id, invitedUser.id]
    );
    if (existing.rows.length > 0) return res.status(400).json({ error: 'User already a member' });

    await query(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1,$2,$3)',
      [req.params.id, invitedUser.id, role]
    );
    res.json({ message: 'Member invited successfully' });
  } catch (err) { next(err); }
});

// GET /workspaces/:id/members
router.get('/:id/members', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT u.id, u.name, u.email, u.avatar_color, wm.role, wm.created_at
      FROM workspace_members wm
      JOIN users u ON u.id = wm.user_id
      WHERE wm.workspace_id=$1
      ORDER BY wm.created_at ASC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// DELETE /workspaces/:id/members/:userId
router.delete('/:id/members/:userId', async (req, res, next) => {
  try {
    const ws = await query('SELECT owner_id FROM workspaces WHERE id=$1', [req.params.id]);
    if (ws.rows.length === 0) return res.status(404).json({ error: 'Workspace not found' });

    const isOwner = ws.rows[0].owner_id === req.user.userId;
    const isSelf = req.params.userId === req.user.userId;

    if (!isOwner && !isSelf) return res.status(403).json({ error: 'Not authorized' });
    if (isOwner && ws.rows[0].owner_id === req.params.userId) {
      return res.status(400).json({ error: 'Cannot remove workspace owner' });
    }

    await query('DELETE FROM workspace_members WHERE workspace_id=$1 AND user_id=$2', [req.params.id, req.params.userId]);
    res.json({ message: 'Member removed' });
  } catch (err) { next(err); }
});

module.exports = router;
