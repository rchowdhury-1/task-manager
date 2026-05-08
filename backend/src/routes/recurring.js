const express = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/recurring — list all recurring rules
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await query(
      'SELECT * FROM recurring_tasks WHERE user_id=$1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/recurring — create recurring rule
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {
      title, category, priority = 2, duration_minutes = 120,
      scheduled_time, days_of_week = [0,1,2,3,4,5,6],
      until_condition,
    } = req.body;

    if (!title || !category || !scheduled_time) {
      return res.status(400).json({ error: 'title, category, and scheduled_time are required' });
    }
    if (!Array.isArray(days_of_week) || days_of_week.length === 0) {
      return res.status(400).json({ error: 'days_of_week must be a non-empty array' });
    }

    const result = await query(
      `INSERT INTO recurring_tasks
         (user_id, title, category, priority, duration_minutes, scheduled_time, days_of_week, until_condition)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [userId, title, category, priority, duration_minutes, scheduled_time, days_of_week, until_condition || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/recurring/:id/resolve — mark condition_met, deactivate
router.patch('/:id/resolve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Idempotent: WHERE condition_met = FALSE prevents double-apply
    const result = await query(
      `UPDATE recurring_tasks
       SET condition_met=TRUE, condition_met_at=NOW(), active=FALSE
       WHERE id=$1 AND user_id=$2 AND condition_met=FALSE
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      // Either not found or already resolved — check which
      const check = await query('SELECT id FROM recurring_tasks WHERE id=$1 AND user_id=$2', [id, userId]);
      if (check.rows.length === 0) return res.status(404).json({ error: 'Recurring task not found' });
      return res.json({ message: 'Already resolved' });
    }

    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/recurring/:id — hard delete
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const existing = await query('SELECT id FROM recurring_tasks WHERE id=$1 AND user_id=$2', [id, userId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Recurring task not found' });

    await query('DELETE FROM recurring_tasks WHERE id=$1', [id]);
    res.json({ message: 'Recurring task deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
