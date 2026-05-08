const express = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Get the current ISO week Monday
const weekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Mon=1, offset from current day
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
};

const weekEnd = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? 0 : 7) - day; // Sun
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
};

// GET /api/habits — habits + completions for current week
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const wStart = weekStart();
    const wEnd = weekEnd();

    const habitsResult = await query(
      'SELECT * FROM habits WHERE user_id=$1 AND active=TRUE ORDER BY sort_order ASC, id ASC',
      [userId]
    );

    const completionsResult = await query(
      `SELECT habit_id, completed_date FROM habit_completions
       WHERE user_id=$1 AND completed_date BETWEEN $2 AND $3`,
      [userId, wStart, wEnd]
    );

    const completionsByHabit = {};
    for (const row of completionsResult.rows) {
      if (!completionsByHabit[row.habit_id]) completionsByHabit[row.habit_id] = [];
      completionsByHabit[row.habit_id].push(row.completed_date.toISOString().split('T')[0]);
    }

    // Streak: consecutive completed days up to today
    const habits = habitsResult.rows.map((h) => {
      const completions = completionsByHabit[h.id] || [];
      return { ...h, completions };
    });

    res.json(habits);
  } catch (err) { next(err); }
});

// POST /api/habits/:id/complete — toggle completion for a date (default today)
router.post('/:id/complete', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const completedDate = req.body.date || new Date().toISOString().split('T')[0];

    const habitCheck = await query(
      'SELECT id FROM habits WHERE id=$1 AND user_id=$2 AND active=TRUE',
      [id, userId]
    );
    if (habitCheck.rows.length === 0) return res.status(404).json({ error: 'Habit not found' });

    // Check if already completed
    const existing = await query(
      'SELECT id FROM habit_completions WHERE habit_id=$1 AND completed_date=$2',
      [id, completedDate]
    );

    if (existing.rows.length > 0) {
      // Toggle off
      await query('DELETE FROM habit_completions WHERE habit_id=$1 AND completed_date=$2', [id, completedDate]);
      return res.json({ completed: false, date: completedDate });
    } else {
      // Toggle on
      await query(
        'INSERT INTO habit_completions (habit_id, user_id, completed_date) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
        [id, userId, completedDate]
      );
      return res.json({ completed: true, date: completedDate });
    }
  } catch (err) { next(err); }
});

// POST /api/habits — create custom habit
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { name, category, time_of_day = 'anytime', duration_minutes = 0 } = req.body;

    if (!name || !category) return res.status(400).json({ error: 'name and category are required' });

    const maxOrder = await query('SELECT MAX(sort_order) as max FROM habits WHERE user_id=$1', [userId]);
    const sortOrder = (maxOrder.rows[0].max ?? -1) + 1;

    const result = await query(
      'INSERT INTO habits (user_id, name, category, time_of_day, duration_minutes, sort_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [userId, name, category, time_of_day, duration_minutes, sortOrder]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/habits/:id — update habit
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const existing = await query('SELECT id FROM habits WHERE id=$1 AND user_id=$2', [id, userId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Habit not found' });

    const allowed = ['name', 'category', 'time_of_day', 'duration_minutes', 'sort_order'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields' });

    const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const result = await query(
      `UPDATE habits SET ${setClauses} WHERE id=$1 RETURNING *`,
      [id, ...Object.values(updates)]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/habits/:id — soft delete
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const existing = await query('SELECT id FROM habits WHERE id=$1 AND user_id=$2', [id, userId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Habit not found' });

    await query('UPDATE habits SET active=FALSE WHERE id=$1', [id]);
    res.json({ message: 'Habit deactivated' });
  } catch (err) { next(err); }
});

module.exports = router;
