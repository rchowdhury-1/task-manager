const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /comments?cardId=
router.get('/', async (req, res, next) => {
  try {
    const { cardId } = req.query;
    if (!cardId) return res.status(400).json({ error: 'cardId required' });
    const result = await query(`
      SELECT cc.*, u.name as user_name, u.avatar_color
      FROM card_comments cc
      JOIN users u ON u.id = cc.user_id
      WHERE cc.card_id = $1
      ORDER BY cc.created_at ASC
    `, [cardId]);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /comments
router.post('/', [
  body('content').trim().isLength({ min: 1, max: 2000 }),
  body('cardId').isUUID(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { cardId, content } = req.body;
    const result = await query(`
      INSERT INTO card_comments (card_id, user_id, content) VALUES ($1,$2,$3)
      RETURNING *
    `, [cardId, req.user.userId, content]);

    const comment = result.rows[0];
    const userResult = await query('SELECT name, avatar_color FROM users WHERE id=$1', [req.user.userId]);
    comment.user_name = userResult.rows[0].name;
    comment.avatar_color = userResult.rows[0].avatar_color;

    res.status(201).json(comment);
  } catch (err) { next(err); }
});

// DELETE /comments/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const comment = await query('SELECT * FROM card_comments WHERE id=$1', [req.params.id]);
    if (comment.rows.length === 0) return res.status(404).json({ error: 'Comment not found' });
    if (comment.rows[0].user_id !== req.user.userId) return res.status(403).json({ error: 'Not authorized' });
    await query('DELETE FROM card_comments WHERE id=$1', [req.params.id]);
    res.json({ message: 'Comment deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
