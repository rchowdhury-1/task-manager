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

// PATCH /api/day-rules/:dayOfWeek — upsert focus area or max hours
// Creates the row if it doesn't exist (handles users without seeded day rules)
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

    const { focus_area, max_focus_hours, cal_color } = req.body;

    const result = await query(
      `INSERT INTO day_rules (user_id, day_of_week, focus_area, max_focus_hours, cal_color)
       VALUES ($1, $2, COALESCE($3, 'general'), COALESCE($4, 8), COALESCE($5, 'blue'))
       ON CONFLICT (user_id, day_of_week) DO UPDATE SET
         focus_area      = CASE WHEN $3 IS NOT NULL THEN $3      ELSE day_rules.focus_area      END,
         max_focus_hours = CASE WHEN $4 IS NOT NULL THEN $4      ELSE day_rules.max_focus_hours END,
         cal_color       = CASE WHEN $5 IS NOT NULL THEN $5      ELSE day_rules.cal_color       END
       RETURNING *`,
      [userId, dayOfWeek, focus_area ?? null, max_focus_hours ?? null, cal_color ?? null]
    );

    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
