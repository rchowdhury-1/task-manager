const express = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { createCalEvent, updateCalEvent, deleteCalEvent } = require('../lib/caldav');

const router = express.Router();
router.use(authenticate);

// GET /api/tasks — all tasks for user with activity count
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { status, category } = req.query;

    let sql = `
      SELECT t.*,
        (SELECT COUNT(*) FROM task_activity ta WHERE ta.task_id = t.id) AS activity_count
      FROM tasks t
      WHERE t.user_id = $1
    `;
    const params = [userId];
    let idx = 2;

    if (status) { sql += ` AND t.status = $${idx++}`; params.push(status); }
    if (category) { sql += ` AND t.category = $${idx++}`; params.push(category); }

    sql += ' ORDER BY t.priority ASC, t.created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/tasks/:id — single task with full activity log + next_steps
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const taskResult = await query(
      'SELECT * FROM tasks WHERE id=$1 AND user_id=$2',
      [id, userId]
    );
    if (taskResult.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const activityResult = await query(
      'SELECT * FROM task_activity WHERE task_id=$1 ORDER BY created_at DESC',
      [id]
    );

    res.json({ ...taskResult.rows[0], activity_log: activityResult.rows });
  } catch (err) { next(err); }
});

// POST /api/tasks — create task, trigger CalDAV if assigned_day set
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {
      title, category, priority = 2, status = 'backlog',
      assigned_day, day_of_week, duration_minutes = 60,
      scheduled_time, notes, last_left_off, next_steps = [],
    } = req.body;

    if (!title || !category) return res.status(400).json({ error: 'title and category are required' });

    const result = await query(
      `INSERT INTO tasks
         (user_id, title, category, priority, status, assigned_day, day_of_week,
          duration_minutes, scheduled_time, notes, last_left_off, next_steps)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
       RETURNING *`,
      [userId, title, category, priority, status, assigned_day || null, day_of_week || null,
       duration_minutes, scheduled_time || null, notes || null, last_left_off || null,
       JSON.stringify(next_steps)]
    );
    const task = result.rows[0];

    await query(
      'INSERT INTO task_activity (task_id, user_id, action, payload) VALUES ($1,$2,$3,$4::jsonb)',
      [task.id, userId, 'created', JSON.stringify({ title, category, status })]
    );

    // Socket broadcast
    const io = req.app.get('io');
    io?.to(`user:${userId}`).emit('board:refresh', { triggeredBy: 'task_created' });

    // CalDAV fire-and-forget
    if (assigned_day) {
      setImmediate(async () => {
        const uid = await createCalEvent(task);
        if (uid) {
          await query('UPDATE tasks SET cal_event_uid=$1 WHERE id=$2', [uid, task.id]);
        }
      });
    }

    res.status(201).json(task);
  } catch (err) { next(err); }
});

// PATCH /api/tasks/:id — partial update
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const existing = await query('SELECT * FROM tasks WHERE id=$1 AND user_id=$2', [id, userId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const prev = existing.rows[0];
    const allowed = [
      'title', 'category', 'priority', 'status', 'assigned_day', 'day_of_week',
      'duration_minutes', 'time_logged_minutes', 'scheduled_time', 'notes',
      'last_left_off', 'next_steps',
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        // Serialize JSONB fields so pg doesn't treat them as PostgreSQL arrays
        updates[key] = key === 'next_steps' ? JSON.stringify(req.body[key]) : req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    const setClauses = Object.keys(updates).map((k, i) =>
      k === 'next_steps' ? `${k} = $${i + 2}::jsonb` : `${k} = $${i + 2}`
    ).join(', ');
    const values = Object.values(updates);

    const result = await query(
      `UPDATE tasks SET ${setClauses}, updated_at=NOW() WHERE id=$1 RETURNING *`,
      [id, ...values]
    );
    const task = result.rows[0];

    // Activity log for status changes
    if (updates.status && updates.status !== prev.status) {
      await query(
        'INSERT INTO task_activity (task_id, user_id, action, payload) VALUES ($1,$2,$3,$4::jsonb)',
        [id, userId, 'moved', JSON.stringify({ from: prev.status, to: updates.status })]
      );
    }

    // Socket broadcast on significant changes
    const io = req.app.get('io');
    const sigFields = ['status', 'assigned_day', 'scheduled_time', 'priority'];
    if (sigFields.some((f) => updates[f] !== undefined)) {
      io?.to(`user:${userId}`).emit('task:updated', task);
    }

    // CalDAV fire-and-forget
    const dayChanged = updates.assigned_day !== undefined || updates.scheduled_time !== undefined;
    if (dayChanged) {
      setImmediate(async () => {
        if (task.cal_event_uid) {
          await updateCalEvent(task);
        } else if (task.assigned_day) {
          const uid = await createCalEvent(task);
          if (uid) await query('UPDATE tasks SET cal_event_uid=$1 WHERE id=$2', [uid, task.id]);
        }
      });
    }

    res.json(task);
  } catch (err) { next(err); }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const existing = await query('SELECT * FROM tasks WHERE id=$1 AND user_id=$2', [id, userId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const task = existing.rows[0];
    await query('DELETE FROM tasks WHERE id=$1', [id]);

    // Socket: notify clients panel should close
    const io = req.app.get('io');
    io?.to(`user:${userId}`).emit('task:deleted', { id });

    // CalDAV fire-and-forget
    if (task.cal_event_uid) {
      setImmediate(() => deleteCalEvent(userId, id, task.cal_event_uid));
    }

    res.json({ message: 'Task deleted' });
  } catch (err) { next(err); }
});

// POST /api/tasks/:id/activity — add activity log entry
router.post('/:id/activity', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { action, payload } = req.body;

    if (!action) return res.status(400).json({ error: 'action is required' });

    const taskCheck = await query('SELECT id FROM tasks WHERE id=$1 AND user_id=$2', [id, userId]);
    if (taskCheck.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const result = await query(
      'INSERT INTO task_activity (task_id, user_id, action, payload) VALUES ($1,$2,$3,$4::jsonb) RETURNING *',
      [id, userId, action, payload ? JSON.stringify(payload) : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/tasks/:id/next-steps/:stepIndex — toggle a next step done/undone
router.patch('/:id/next-steps/:stepIndex', async (req, res, next) => {
  try {
    const { id, stepIndex } = req.params;
    const userId = req.user.userId;
    const idx = parseInt(stepIndex, 10);

    const existing = await query('SELECT * FROM tasks WHERE id=$1 AND user_id=$2', [id, userId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const task = existing.rows[0];
    const steps = Array.isArray(task.next_steps) ? task.next_steps : [];

    if (isNaN(idx) || idx < 0 || idx >= steps.length) {
      return res.status(400).json({ error: 'Invalid step index' });
    }

    steps[idx] = { ...steps[idx], done: !steps[idx].done };

    const result = await query(
      'UPDATE tasks SET next_steps=$1::jsonb, updated_at=NOW() WHERE id=$2 RETURNING *',
      [JSON.stringify(steps), id]
    );

    await query(
      'INSERT INTO task_activity (task_id, user_id, action, payload) VALUES ($1,$2,$3,$4::jsonb)',
      [id, userId, 'next_step_added', JSON.stringify({ index: idx, done: steps[idx].done })]
    );

    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
