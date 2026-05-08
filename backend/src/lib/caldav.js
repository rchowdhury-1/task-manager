/**
 * CalDAV sync library — fire-and-forget iCloud integration.
 * Uses raw HTTP (axios) to avoid ESM incompatibilities with tsdav.
 * All calls write to caldav_sync_log. Failures are logged, never thrown to callers.
 */

const axios = require('axios');
const { query } = require('../config/db');

const CALDAV_URL       = process.env.CALDAV_URL || 'https://caldav.icloud.com';
const CALDAV_USERNAME  = process.env.CALDAV_USERNAME || '';
const CALDAV_PASSWORD  = process.env.CALDAV_PASSWORD || '';
const CALDAV_CAL_PATH  = process.env.CALDAV_CALENDAR_PATH || '';

const isConfigured = () => !!(CALDAV_URL && CALDAV_USERNAME && CALDAV_PASSWORD && CALDAV_CAL_PATH);

const caldavHeaders = () => ({
  'Content-Type': 'text/calendar; charset=utf-8',
  'Authorization': 'Basic ' + Buffer.from(`${CALDAV_USERNAME}:${CALDAV_PASSWORD}`).toString('base64'),
});

const formatDate = (dateStr, timeStr) => {
  // dateStr: 'YYYY-MM-DD', timeStr: 'HH:MM' or null
  if (!timeStr) {
    return `VALUE=DATE:${dateStr.replace(/-/g, '')}`;
  }
  const [h, m] = timeStr.split(':');
  const dateBase = dateStr.replace(/-/g, '');
  return `${dateBase}T${h}${m}00`;
};

const buildVEvent = (task) => {
  const uid = task.cal_event_uid || `${task.id}@personal-os`;
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const summary = `${task.title} [P${task.priority}]`;
  const description = (task.notes || '').slice(0, 500).replace(/\n/g, '\\n');
  const category = task.category.toUpperCase();

  let dtstart;
  if (task.assigned_day) {
    dtstart = `DTSTART;${formatDate(task.assigned_day, task.scheduled_time)}`;
  } else {
    const today = new Date().toISOString().split('T')[0];
    dtstart = `DTSTART;VALUE=DATE:${today.replace(/-/g, '')}`;
  }

  const duration = task.duration_minutes ? `PT${task.duration_minutes}M` : 'PT60M';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PersonalOS//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    dtstart,
    `DURATION:${duration}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : '',
    `CATEGORIES:${category}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const withRetry = async (fn, maxAttempts = 3) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      // Handle 207 Multi-Status partial failure and other transient errors
      const status = err.response?.status;
      if (status && status < 500 && status !== 207) throw err; // Non-retryable
      await sleep(1000 * Math.pow(2, attempt - 1)); // 1s, 2s, 4s
    }
  }
};

const logSync = async (userId, taskId, operation, eventUid, status, errorMessage = null) => {
  try {
    await query(
      `INSERT INTO caldav_sync_log (user_id, task_id, operation, event_uid, status, error_message)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId, taskId || null, operation, eventUid || null, status, errorMessage]
    );
  } catch (e) {
    console.error('caldav_sync_log insert failed:', e.message);
  }
};

const createCalEvent = async (task) => {
  if (!isConfigured()) {
    console.warn('CalDAV not configured — skipping createCalEvent');
    return null;
  }

  const uid = `${task.id}@personal-os`;
  const eventPath = `${CALDAV_CAL_PATH}${uid}.ics`;
  const vevent = buildVEvent({ ...task, cal_event_uid: uid });

  try {
    await withRetry(async () => {
      const response = await axios.put(`${CALDAV_URL}${eventPath}`, vevent, {
        headers: caldavHeaders(),
        timeout: 10000,
      });
      if (response.status === 207) {
        // Multi-status — check for errors
        const body = response.data || '';
        if (typeof body === 'string' && body.includes('error')) {
          throw new Error(`CalDAV 207 partial failure: ${body.slice(0, 200)}`);
        }
      }
    });

    await logSync(task.user_id, task.id, 'create', uid, 'success');
    return uid;
  } catch (err) {
    const msg = err.response ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message;
    console.error('CalDAV createCalEvent failed:', msg);
    await logSync(task.user_id, task.id, 'create', uid, 'failed', msg);
    return null;
  }
};

const updateCalEvent = async (task) => {
  if (!isConfigured()) {
    console.warn('CalDAV not configured — skipping updateCalEvent');
    return null;
  }

  const uid = task.cal_event_uid || `${task.id}@personal-os`;
  const eventPath = `${CALDAV_CAL_PATH}${uid}.ics`;
  const vevent = buildVEvent(task);

  try {
    await withRetry(async () => {
      await axios.put(`${CALDAV_URL}${eventPath}`, vevent, {
        headers: caldavHeaders(),
        timeout: 10000,
      });
    });

    await logSync(task.user_id, task.id, 'update', uid, 'success');
    return uid;
  } catch (err) {
    const msg = err.response ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message;
    console.error('CalDAV updateCalEvent failed:', msg);
    await logSync(task.user_id, task.id, 'update', uid, 'failed', msg);
    return null;
  }
};

const deleteCalEvent = async (userId, taskId, uid) => {
  if (!isConfigured() || !uid) return;

  const eventPath = `${CALDAV_CAL_PATH}${uid}.ics`;

  try {
    await withRetry(async () => {
      await axios.delete(`${CALDAV_URL}${eventPath}`, {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${CALDAV_USERNAME}:${CALDAV_PASSWORD}`).toString('base64'),
        },
        timeout: 10000,
      });
    });

    await logSync(userId, taskId, 'delete', uid, 'success');
  } catch (err) {
    // 404 means event not found — treat as success (idempotent)
    if (err.response?.status === 404) {
      await logSync(userId, taskId, 'delete', uid, 'success');
      return;
    }
    const msg = err.response ? `HTTP ${err.response.status}` : err.message;
    console.error('CalDAV deleteCalEvent failed:', msg);
    await logSync(userId, taskId, 'delete', uid, 'failed', msg);
  }
};

module.exports = { createCalEvent, updateCalEvent, deleteCalEvent, isConfigured };
