const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /cards?columnId=
router.get('/', async (req, res, next) => {
  try {
    const { columnId, boardId } = req.query;
    let result;
    if (columnId) {
      result = await query(`
        SELECT c.*, u.name as assignee_name, u.avatar_color as assignee_color
        FROM cards c
        LEFT JOIN users u ON u.id = c.assigned_to
        WHERE c.column_id = $1
        ORDER BY c.position ASC
      `, [columnId]);
    } else if (boardId) {
      result = await query(`
        SELECT c.*, col.board_id, u.name as assignee_name, u.avatar_color as assignee_color
        FROM cards c
        JOIN columns col ON col.id = c.column_id AND col.board_id = $1
        LEFT JOIN users u ON u.id = c.assigned_to
        ORDER BY c.position ASC
      `, [boardId]);
    } else {
      return res.status(400).json({ error: 'columnId or boardId required' });
    }
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /cards
router.post('/', [
  body('title').trim().isLength({ min: 1, max: 500 }),
  body('columnId').isUUID(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { title, columnId, description, dueDate, assignedTo, priority = 'medium' } = req.body;

    const maxPos = await query('SELECT COALESCE(MAX(position),0)+1 as pos FROM cards WHERE column_id=$1', [columnId]);
    const result = await query(`
      INSERT INTO cards (column_id, title, description, due_date, assigned_to, priority, position)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `, [columnId, title, description || null, dueDate || null, assignedTo || null, priority, maxPos.rows[0].pos]);

    const card = result.rows[0];
    // Get assignee info if assigned
    if (card.assigned_to) {
      const assignee = await query('SELECT name, avatar_color FROM users WHERE id=$1', [card.assigned_to]);
      if (assignee.rows.length > 0) {
        card.assignee_name = assignee.rows[0].name;
        card.assignee_color = assignee.rows[0].avatar_color;
      }
    }

    res.status(201).json(card);
  } catch (err) { next(err); }
});

// GET /cards/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT c.*, u.name as assignee_name, u.avatar_color as assignee_color
      FROM cards c
      LEFT JOIN users u ON u.id = c.assigned_to
      WHERE c.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Card not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// PUT /cards/reorder
router.put('/reorder', async (req, res, next) => {
  try {
    const { cards } = req.body; // [{id, columnId, position}]
    if (!Array.isArray(cards)) return res.status(400).json({ error: 'cards array required' });

    await Promise.all(cards.map(({ id, columnId, position }) =>
      query('UPDATE cards SET column_id=$1, position=$2 WHERE id=$3', [columnId, position, id])
    ));
    res.json({ message: 'Cards reordered' });
  } catch (err) { next(err); }
});

// PUT /cards/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { title, description, columnId, dueDate, assignedTo, priority, position } = req.body;
    const result = await query(`
      UPDATE cards SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        column_id = COALESCE($3, column_id),
        due_date = COALESCE($4, due_date),
        assigned_to = COALESCE($5, assigned_to),
        priority = COALESCE($6, priority),
        position = COALESCE($7, position)
      WHERE id = $8
      RETURNING *
    `, [title, description, columnId, dueDate, assignedTo, priority, position, req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Card not found' });

    const card = result.rows[0];
    if (card.assigned_to) {
      const assignee = await query('SELECT name, avatar_color FROM users WHERE id=$1', [card.assigned_to]);
      if (assignee.rows.length > 0) {
        card.assignee_name = assignee.rows[0].name;
        card.assignee_color = assignee.rows[0].avatar_color;
      }
    }

    res.json(card);
  } catch (err) { next(err); }
});

// DELETE /cards/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM cards WHERE id=$1', [req.params.id]);
    res.json({ message: 'Card deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
