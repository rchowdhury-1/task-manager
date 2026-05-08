/**
 * CalDAV sync library — fire-and-forget iCloud integration.
 * Uses raw HTTP (axios) to avoid ESM incompatibilities with tsdav.
 * All calls write to caldav_sync_log. Failures are logged, never thrown to callers.
 *
 * Credential resolution order:
 *   1. user_settings table (per-user DB credentials)
 *   2. Environment variables (shared fallback)
 */

const axios = require('axios');
const { query } = require('../config/db');

// ─── Env-var fallbacks ────────────────────────────────────────────────────────

const ENV_URL      = process.env.CALDAV_URL || 'https://caldav.icloud.com';
const ENV_USERNAME = process.env.CALDAV_USERNAME || '';
const ENV_PASSWORD = process.env.CALDAV_PASSWORD || '';
const ENV_CAL_PATH = process.env.CALDAV_CALENDAR_PATH || '';

// ─── Per-user credential lookup ───────────────────────────────────────────────

async function getUserCalDAVSettings(userId) {
  if (!userId) return null;
  try {
    const result = await query(
      'SELECT caldav_url, caldav_username, caldav_password, caldav_calendar_path FROM user_settings WHERE user_id = $1',
      [userId]
    );
    const s = result.rows[0];
    if (s && s.caldav_username && s.caldav_password && s.caldav_calendar_path) {
      return {
        url:     s.caldav_url || ENV_URL,
        username: s.caldav_username,
        password: s.caldav_password,
        calPath:  s.caldav_calendar_path,
      };
    }
  } catch (e) {
    // Table might not exist yet on first boot — fall through to env vars
  }
  return null;
}

async function resolveSettings(userId) {
  const db = await getUserCalDAVSettings(userId);
  if (db) return db;
  // Fall back to env vars
  if (ENV_USERNAME && ENV_PASSWORD && ENV_CAL_PATH) {
    return { url: ENV_URL, username: ENV_USERNAME, password: ENV_PASSWORD, calPath: ENV_CAL_PATH };
  }
  return null; // not configured
}

// Legacy sync check for isConfigured export (env-based only)
const isConfigured = () => !!(ENV_URL && ENV_USERNAME && ENV_PASSWORD && ENV_CAL_PATH);

// ─── Utilities ────────────────────────────────────────────────────────────────

function makeHeaders(settings) {
  return {
    'Content-Type': 'text/calendar; charset=utf-8',
    Authorization:  'Basic ' + Buffer.from(`${settings.username}:${settings.password}`).toString('base64'),
  };
}

const formatDate = (dateStr, timeStr) => {
  if (!timeStr) return `VALUE=DATE:${dateStr.replace(/-/g, '')}`;
  const [h, m] = timeStr.split(':');
  return `${dateStr.replace(/-/g, '')}T${h}${m}00`;
};

const buildVEvent = (task) => {
  const uid         = task.cal_event_uid || `${task.id}@personal-os`;
  const now         = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const summary     = `${task.title} [P${task.priority}]`;
  const description = (task.notes || '').slice(0, 500).replace(/\n/g, '\\n');
  const category    = task.category.toUpperCase();

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
      const status = err.response?.status;
      if (status && status < 500 && status !== 207) throw err;
      await sleep(1000 * Math.pow(2, attempt - 1));
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

// ─── Exported functions ───────────────────────────────────────────────────────

const createCalEvent = async (task) => {
  const settings = await resolveSettings(task.user_id);
  if (!settings) {
    console.warn('CalDAV not configured — skipping createCalEvent');
    return null;
  }

  const uid       = `${task.id}@personal-os`;
  const eventPath = `${settings.calPath}${uid}.ics`;
  const vevent    = buildVEvent({ ...task, cal_event_uid: uid });

  try {
    await withRetry(async () => {
      const response = await axios.put(`${settings.url}${eventPath}`, vevent, {
        headers: makeHeaders(settings),
        timeout: 10000,
      });
      if (response.status === 207) {
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
  const settings = await resolveSettings(task.user_id);
  if (!settings) {
    console.warn('CalDAV not configured — skipping updateCalEvent');
    return null;
  }

  const uid       = task.cal_event_uid || `${task.id}@personal-os`;
  const eventPath = `${settings.calPath}${uid}.ics`;
  const vevent    = buildVEvent(task);

  try {
    await withRetry(async () => {
      await axios.put(`${settings.url}${eventPath}`, vevent, {
        headers: makeHeaders(settings),
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
  const settings = await resolveSettings(userId);
  if (!settings || !uid) return;

  const eventPath = `${settings.calPath}${uid}.ics`;

  try {
    await withRetry(async () => {
      await axios.delete(`${settings.url}${eventPath}`, {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${settings.username}:${settings.password}`).toString('base64'),
        },
        timeout: 10000,
      });
    });
    await logSync(userId, taskId, 'delete', uid, 'success');
  } catch (err) {
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
