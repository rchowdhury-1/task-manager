const express = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/day-rules — all 7 rules for user
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await query(
      'SELECT * FROM day_rules WHERE user_id=$1 ORDER BY day_of_week ASC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// PATCH /api/day-rules/:dayOfWeek — update focus area or max hours
router.patch('/:dayOfWeek', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const dayOfWeek = parseInt(req.params.dayOfWeek, 10);

    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ error: 'dayOfWeek must be 0–6' });
    }

    const allowed = ['focus_area', 'max_focus_hours', 'cal_color'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields' });

    const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 3}`).join(', ');
    const result = await query(
      `UPDATE day_rules SET ${setClauses} WHERE user_id=$1 AND day_of_week=$2 RETURNING *`,
      [userId, dayOfWeek, ...Object.values(updates)]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Day rule not found' });

    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
