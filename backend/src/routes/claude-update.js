const express = require('express');
const Groq = require('groq-sdk');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT_TEMPLATE = `You are the scheduling brain of a Personal OS for a freelance full-stack developer.

USER CONTEXT:
- Looking for first dev role (Mercor, Outlier, full-time)
- Freelancing on Fiverr and Upwork
- Building an LMS as a client project
- Doing Uber Eats 9–11pm every night (stops when dev role secured)
- Daily Islamic practices: 5 prayers, Fajr, Jamaa where possible, Adkar (morning+evening), Salawat, Quran hifz 20min
- Gym Mon/Wed/Fri
- 20min coding learning every day at 5pm
- Day rules: Mon=job hunt, Tue/Thu=LMS build, Wed=freelance, Fri=learning, Sat=flex, Sun=rest+Quran

BOARD STATE (injected per request as JSON):
<BOARD_STATE>

YOUR JOB:
Parse the user's natural language update and return ONLY a valid JSON object — no prose, no markdown, no explanation.

ALLOWED OPERATIONS (you may only return these):
{
  "operations": [
    {
      "type": "move_task",
      "task_id": "<uuid>",
      "new_status": "backlog|this_week|in_progress|done"
    },
    {
      "type": "update_task",
      "task_id": "<uuid>",
      "fields": {
        "priority": 1,
        "assigned_day": "YYYY-MM-DD",
        "last_left_off": "string",
        "notes": "string",
        "time_logged_minutes": 0
      }
    },
    {
      "type": "add_next_step",
      "task_id": "<uuid>",
      "text": "string"
    },
    {
      "type": "complete_next_step",
      "task_id": "<uuid>",
      "step_index": 0
    },
    {
      "type": "create_task",
      "title": "string",
      "category": "career|lms|freelance|learning|uber|faith",
      "priority": 1,
      "status": "backlog|this_week|in_progress|done",
      "assigned_day": "YYYY-MM-DD or null",
      "duration_minutes": 60,
      "scheduled_time": "HH:MM or null"
    },
    {
      "type": "complete_habit",
      "habit_id": "<uuid>"
    },
    {
      "type": "resolve_recurring",
      "recurring_id": "<uuid>",
      "reason": "string"
    },
    {
      "type": "schedule_warning",
      "message": "string"
    }
  ],
  "summary": "one sentence plain English summary of what you did",
  "warnings": ["array of schedule conflict warnings"]
}

DAY RULE ENFORCEMENT:
- Never assign a job_hunt task to Tue/Thu/Wed/Fri/Sat/Sun
- Never assign an LMS task to Mon/Wed/Fri/Sat/Sun
- Never assign a freelance task to Mon/Tue/Thu/Fri/Sun
- If the user asks you to violate a rule, return a schedule_warning and ask for confirmation
- If a day is already at max_focus_hours, return a schedule_warning

If you cannot confidently parse the user's message into valid operations, return:
{ "operations": [], "summary": "I didn't understand that — could you rephrase?", "warnings": [] }`;

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_STATUSES  = new Set(['backlog', 'this_week', 'in_progress', 'done']);
const VALID_CATEGORIES = new Set(['career', 'lms', 'freelance', 'learning', 'uber', 'faith']);
const VALID_OP_TYPES  = new Set([
  'move_task', 'update_task', 'add_next_step', 'complete_next_step',
  'create_task', 'complete_habit', 'resolve_recurring', 'schedule_warning',
]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const sanitize = (str, maxLen = 500) => {
  if (typeof str !== 'string') return null;
  return str.replace(/[<>]/g, '').slice(0, maxLen);
};

const validateOp = (op) => {
  if (!op || typeof op !== 'object') return false;
  if (!VALID_OP_TYPES.has(op.type)) return false;

  switch (op.type) {
    case 'move_task':
      return UUID_RE.test(op.task_id) && VALID_STATUSES.has(op.new_status);

    case 'update_task': {
      if (!UUID_RE.test(op.task_id)) return false;
      if (!op.fields || typeof op.fields !== 'object') return false;
      const allowed = new Set(['priority', 'assigned_day', 'last_left_off', 'notes', 'time_logged_minutes']);
      for (const k of Object.keys(op.fields)) {
        if (!allowed.has(k)) return false;
      }
      if (op.fields.priority !== undefined && ![1,2,3].includes(op.fields.priority)) return false;
      if (op.fields.assigned_day && !DATE_RE.test(op.fields.assigned_day)) return false;
      return true;
    }

    case 'add_next_step':
      return UUID_RE.test(op.task_id) && typeof op.text === 'string' && op.text.length > 0;

    case 'complete_next_step':
      return UUID_RE.test(op.task_id) && Number.isInteger(op.step_index) && op.step_index >= 0;

    case 'create_task':
      return (
        typeof op.title === 'string' && op.title.length > 0 &&
        VALID_CATEGORIES.has(op.category) &&
        [1,2,3].includes(op.priority) &&
        VALID_STATUSES.has(op.status) &&
        (op.assigned_day === null || !op.assigned_day || DATE_RE.test(op.assigned_day)) &&
        (op.scheduled_time === null || !op.scheduled_time || TIME_RE.test(op.scheduled_time))
      );

    case 'complete_habit':
      return UUID_RE.test(op.habit_id);

    case 'resolve_recurring':
      return UUID_RE.test(op.recurring_id);

    case 'schedule_warning':
      return typeof op.message === 'string';

    default:
      return false;
  }
};

// ─── Operation handlers ───────────────────────────────────────────────────────

const handlers = {
  async move_task(op, userId, client) {
    const result = await client.query(
      'UPDATE tasks SET status=$1, updated_at=NOW() WHERE id=$2 AND user_id=$3 RETURNING *',
      [op.new_status, op.task_id, userId]
    );
    if (result.rows.length === 0) throw new Error(`Task ${op.task_id} not found`);
    await client.query(
      'INSERT INTO task_activity (task_id, user_id, action, payload) VALUES ($1,$2,$3,$4)',
      [op.task_id, userId, 'claude_update', JSON.stringify({ type: 'move_task', new_status: op.new_status })]
    );
    if (op.new_status === 'done') {
      await client.query(
        'INSERT INTO task_activity (task_id, user_id, action, payload) VALUES ($1,$2,$3,$4)',
        [op.task_id, userId, 'completed', JSON.stringify({ via: 'claude' })]
      );
    }
    return result.rows[0];
  },

  async update_task(op, userId, client) {
    const allowed = ['priority', 'assigned_day', 'last_left_off', 'notes', 'time_logged_minutes'];
    const updates = {};
    for (const key of allowed) {
      if (op.fields[key] !== undefined) {
        updates[key] = key === 'last_left_off' || key === 'notes'
          ? sanitize(op.fields[key], 5000)
          : op.fields[key];
      }
    }
    if (Object.keys(updates).length === 0) return null;

    const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 3}`).join(', ');
    const result = await client.query(
      `UPDATE tasks SET ${setClauses}, updated_at=NOW() WHERE id=$1 AND user_id=$2 RETURNING *`,
      [op.task_id, userId, ...Object.values(updates)]
    );
    if (result.rows.length === 0) throw new Error(`Task ${op.task_id} not found`);

    await client.query(
      'INSERT INTO task_activity (task_id, user_id, action, payload) VALUES ($1,$2,$3,$4)',
      [op.task_id, userId, 'claude_update', JSON.stringify({ type: 'update_task', fields: updates })]
    );
    return result.rows[0];
  },

  async add_next_step(op, userId, client) {
    const taskResult = await client.query('SELECT * FROM tasks WHERE id=$1 AND user_id=$2', [op.task_id, userId]);
    if (taskResult.rows.length === 0) throw new Error(`Task ${op.task_id} not found`);

    const steps = Array.isArray(taskResult.rows[0].next_steps) ? taskResult.rows[0].next_steps : [];
    steps.push({ text: sanitize(op.text, 300), done: false });

    const result = await client.query(
      'UPDATE tasks SET next_steps=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [JSON.stringify(steps), op.task_id]
    );
    await client.query(
      'INSERT INTO task_activity (task_id, user_id, action, payload) VALUES ($1,$2,$3,$4)',
      [op.task_id, userId, 'next_step_added', JSON.stringify({ text: op.text })]
    );
    return result.rows[0];
  },

  async complete_next_step(op, userId, client) {
    const taskResult = await client.query('SELECT * FROM tasks WHERE id=$1 AND user_id=$2', [op.task_id, userId]);
    if (taskResult.rows.length === 0) throw new Error(`Task ${op.task_id} not found`);

    const steps = Array.isArray(taskResult.rows[0].next_steps) ? taskResult.rows[0].next_steps : [];
    if (op.step_index >= steps.length) throw new Error(`Step index ${op.step_index} out of bounds`);

    steps[op.step_index] = { ...steps[op.step_index], done: true };
    const result = await client.query(
      'UPDATE tasks SET next_steps=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [JSON.stringify(steps), op.task_id]
    );
    await client.query(
      'INSERT INTO task_activity (task_id, user_id, action, payload) VALUES ($1,$2,$3,$4)',
      [op.task_id, userId, 'claude_update', JSON.stringify({ type: 'complete_next_step', index: op.step_index })]
    );
    return result.rows[0];
  },

  async create_task(op, userId, client) {
    const result = await client.query(
      `INSERT INTO tasks (user_id, title, category, priority, status, assigned_day, duration_minutes, scheduled_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [userId, sanitize(op.title, 255), op.category, op.priority, op.status,
       op.assigned_day || null, op.duration_minutes || 60, op.scheduled_time || null]
    );
    await client.query(
      'INSERT INTO task_activity (task_id, user_id, action, payload) VALUES ($1,$2,$3,$4)',
      [result.rows[0].id, userId, 'created', JSON.stringify({ via: 'claude' })]
    );
    return result.rows[0];
  },

  async complete_habit(op, userId, client) {
    const today = new Date().toISOString().split('T')[0];
    await client.query(
      'INSERT INTO habit_completions (habit_id, user_id, completed_date) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [op.habit_id, userId, today]
    );
    return { habit_id: op.habit_id, completed_date: today };
  },

  async resolve_recurring(op, userId, client) {
    const result = await client.query(
      `UPDATE recurring_tasks SET condition_met=TRUE, condition_met_at=NOW(), active=FALSE
       WHERE id=$1 AND user_id=$2 AND condition_met=FALSE RETURNING *`,
      [op.recurring_id, userId]
    );
    return result.rows[0] || null;
  },

  schedule_warning(op) {
    // No DB write — just pass the warning through
    return { warning: op.message };
  },
};

// ─── Route ─────────────────────────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Step 1 — Build context snapshot
    const [tasksRes, recurringRes, dayRulesRes, habitsRes, completionsRes] = await Promise.all([
      query('SELECT id, title, status, priority, category, assigned_day FROM tasks WHERE user_id=$1 ORDER BY priority ASC, updated_at DESC LIMIT 100', [userId]),
      query('SELECT id, title, category, scheduled_time, days_of_week, until_condition, active FROM recurring_tasks WHERE user_id=$1 AND active=TRUE', [userId]),
      query('SELECT day_of_week, focus_area, max_focus_hours FROM day_rules WHERE user_id=$1 ORDER BY day_of_week', [userId]),
      query('SELECT id, name, category FROM habits WHERE user_id=$1 AND active=TRUE ORDER BY sort_order', [userId]),
      query(`SELECT habit_id, completed_date FROM habit_completions WHERE user_id=$1 AND completed_date = CURRENT_DATE`, [userId]),
    ]);

    const contextSnapshot = {
      today: new Date().toISOString().split('T')[0],
      tasks: tasksRes.rows,
      recurring: recurringRes.rows,
      day_rules: dayRulesRes.rows,
      habits: habitsRes.rows,
      todays_completions: completionsRes.rows.map((r) => r.habit_id),
    };

    // Step 2 — Call Groq API
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace('<BOARD_STATE>', JSON.stringify(contextSnapshot, null, 2));

    let claudeText;
    try {
      const response = await Promise.race([
        groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 2048,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message.trim() },
          ],
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Claude timeout')), 15000)),
      ]);
      claudeText = response.choices[0]?.message?.content || '';
    } catch (err) {
      if (err.message === 'Claude timeout') {
        return res.status(504).json({ error: 'Claude did not respond in time — try again' });
      }
      throw err;
    }

    // Step 3 — Parse Claude response
    let diff;
    try {
      // Strip markdown code fences if present
      const cleaned = claudeText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
      diff = JSON.parse(cleaned);
    } catch {
      return res.status(422).json({
        error: 'Claude returned an unexpected format',
        raw: claudeText.slice(0, 200),
      });
    }

    if (!diff.operations || !Array.isArray(diff.operations)) {
      return res.status(422).json({ error: 'Claude returned an unexpected format' });
    }

    // Step 4 — Validate and execute
    const { pool } = require('../config/db');
    const client = await pool.connect();
    const operationsApplied = [];
    const skipped = [];

    try {
      await client.query('BEGIN');

      for (const op of diff.operations) {
        if (!validateOp(op)) {
          skipped.push({ op, reason: 'failed validation' });
          continue;
        }

        if (op.type === 'schedule_warning') {
          operationsApplied.push({ type: 'schedule_warning', message: op.message });
          continue;
        }

        try {
          const result = await handlers[op.type](op, userId, client);
          if (result) operationsApplied.push({ type: op.type, result });
        } catch (opErr) {
          skipped.push({ op, reason: opErr.message });
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Step 5 — Broadcast
    const io = req.app.get('io');
    io?.to(`user:${userId}`).emit('board:refresh', { triggeredBy: 'claude' });

    // Step 6 — Return
    res.json({
      operations_applied: operationsApplied,
      skipped,
      summary: diff.summary || 'Done.',
      warnings: Array.isArray(diff.warnings) ? diff.warnings : [],
    });
  } catch (err) { next(err); }
});

module.exports = router;
