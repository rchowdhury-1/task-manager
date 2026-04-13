const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /boards?workspaceId=
router.get('/', async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    let sql, params;
    if (workspaceId) {
      sql = `
        SELECT b.* FROM boards b
        JOIN workspace_members wm ON wm.workspace_id = b.workspace_id AND wm.user_id = $1
        WHERE b.workspace_id = $2
        ORDER BY b.created_at DESC
      `;
      params = [req.user.userId, workspaceId];
    } else {
      sql = `
        SELECT b.*, w.name as workspace_name FROM boards b
        JOIN workspaces w ON w.id = b.workspace_id
        JOIN workspace_members wm ON wm.workspace_id = b.workspace_id AND wm.user_id = $1
        ORDER BY b.created_at DESC LIMIT 20
      `;
      params = [req.user.userId];
    }
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /boards
router.post('/', [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('workspaceId').isUUID(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { name, workspaceId, color = '#10b981' } = req.body;
    const member = await query(
      'SELECT id FROM workspace_members WHERE workspace_id=$1 AND user_id=$2',
      [workspaceId, req.user.userId]
    );
    if (member.rows.length === 0) return res.status(403).json({ error: 'Not a workspace member' });

    const result = await query(
      'INSERT INTO boards (workspace_id, name, color) VALUES ($1,$2,$3) RETURNING *',
      [workspaceId, name, color]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// GET /boards/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT b.*, w.name as workspace_name FROM boards b
      JOIN workspaces w ON w.id = b.workspace_id
      JOIN workspace_members wm ON wm.workspace_id = b.workspace_id AND wm.user_id = $1
      WHERE b.id = $2
    `, [req.user.userId, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Board not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// PUT /boards/:id
router.put('/:id', [body('name').optional().trim().isLength({ min: 1, max: 100 })], async (req, res, next) => {
  try {
    const board = await query(`
      SELECT b.* FROM boards b
      JOIN workspace_members wm ON wm.workspace_id = b.workspace_id AND wm.user_id = $1
      WHERE b.id = $2
    `, [req.user.userId, req.params.id]);
    if (board.rows.length === 0) return res.status(403).json({ error: 'Not authorized' });

    const { name, color } = req.body;
    const result = await query(
      'UPDATE boards SET name=COALESCE($1,name), color=COALESCE($2,color) WHERE id=$3 RETURNING *',
      [name, color, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /boards/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const board = await query(`
      SELECT b.* FROM boards b
      JOIN workspaces w ON w.id = b.workspace_id AND w.owner_id = $1
      WHERE b.id = $2
    `, [req.user.userId, req.params.id]);
    if (board.rows.length === 0) return res.status(403).json({ error: 'Not authorized' });
    await query('DELETE FROM boards WHERE id=$1', [req.params.id]);
    res.json({ message: 'Board deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
