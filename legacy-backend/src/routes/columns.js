const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const isBoardMember = async (boardId, userId) => {
  const result = await query(`
    SELECT 1 FROM boards b
    JOIN workspace_members wm ON wm.workspace_id = b.workspace_id AND wm.user_id = $1
    WHERE b.id = $2
  `, [userId, boardId]);
  return result.rows.length > 0;
};

// GET /columns?boardId=
router.get('/', async (req, res, next) => {
  try {
    const { boardId } = req.query;
    if (!boardId) return res.status(400).json({ error: 'boardId required' });
    if (!await isBoardMember(boardId, req.user.userId)) return res.status(403).json({ error: 'Not authorized' });

    const result = await query(
      'SELECT * FROM columns WHERE board_id=$1 ORDER BY position ASC',
      [boardId]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /columns
router.post('/', [
  body('title').trim().isLength({ min: 1, max: 100 }),
  body('boardId').isUUID(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { title, boardId } = req.body;
    if (!await isBoardMember(boardId, req.user.userId)) return res.status(403).json({ error: 'Not authorized' });

    const maxPos = await query('SELECT COALESCE(MAX(position),0)+1 as pos FROM columns WHERE board_id=$1', [boardId]);
    const result = await query(
      'INSERT INTO columns (board_id, title, position) VALUES ($1,$2,$3) RETURNING *',
      [boardId, title, maxPos.rows[0].pos]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// PUT /columns/reorder
router.put('/reorder', async (req, res, next) => {
  try {
    const { columns } = req.body; // [{id, position}]
    if (!Array.isArray(columns)) return res.status(400).json({ error: 'columns array required' });

    await Promise.all(columns.map(({ id, position }) =>
      query('UPDATE columns SET position=$1 WHERE id=$2', [position, id])
    ));
    res.json({ message: 'Columns reordered' });
  } catch (err) { next(err); }
});

// PUT /columns/:id
router.put('/:id', [body('title').optional().trim().isLength({ min: 1, max: 100 })], async (req, res, next) => {
  try {
    const col = await query(`
      SELECT c.* FROM columns c
      JOIN boards b ON b.id = c.board_id
      JOIN workspace_members wm ON wm.workspace_id = b.workspace_id AND wm.user_id = $1
      WHERE c.id = $2
    `, [req.user.userId, req.params.id]);
    if (col.rows.length === 0) return res.status(403).json({ error: 'Not authorized' });

    const { title } = req.body;
    const result = await query(
      'UPDATE columns SET title=COALESCE($1,title) WHERE id=$2 RETURNING *',
      [title, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /columns/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const col = await query(`
      SELECT c.* FROM columns c
      JOIN boards b ON b.id = c.board_id
      JOIN workspace_members wm ON wm.workspace_id = b.workspace_id AND wm.user_id = $1
      WHERE c.id = $2
    `, [req.user.userId, req.params.id]);
    if (col.rows.length === 0) return res.status(403).json({ error: 'Not authorized' });
    await query('DELETE FROM columns WHERE id=$1', [req.params.id]);
    res.json({ message: 'Column deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
