const express = require('express');
const axios   = require('axios');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/settings — return user settings (password never exposed)
router.get('/', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const result = await query(
      'SELECT caldav_url, caldav_username, caldav_calendar_path, updated_at FROM user_settings WHERE user_id = $1',
      [userId]
    );
    const row = result.rows[0];
    const passwordResult = await query(
      'SELECT caldav_password IS NOT NULL AND caldav_password <> \'\' AS password_set FROM user_settings WHERE user_id = $1',
      [userId]
    );
    res.json({
      caldav_url:           row?.caldav_url || 'https://caldav.icloud.com',
      caldav_username:      row?.caldav_username || '',
      caldav_password_set:  passwordResult.rows[0]?.password_set || false,
      caldav_calendar_path: row?.caldav_calendar_path || '',
      updated_at:           row?.updated_at || null,
    });
  } catch (err) { next(err); }
});

// PATCH /api/settings — upsert user settings
// If caldav_password is empty string or omitted, preserve the existing password
router.patch('/', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { caldav_url, caldav_username, caldav_password, caldav_calendar_path } = req.body;

    const result = await query(
      `INSERT INTO user_settings (user_id, caldav_url, caldav_username, caldav_password, caldav_calendar_path, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         caldav_url           = EXCLUDED.caldav_url,
         caldav_username      = EXCLUDED.caldav_username,
         caldav_password      = CASE
                                  WHEN EXCLUDED.caldav_password IS NOT NULL AND EXCLUDED.caldav_password <> ''
                                  THEN EXCLUDED.caldav_password
                                  ELSE user_settings.caldav_password
                                END,
         caldav_calendar_path = EXCLUDED.caldav_calendar_path,
         updated_at           = NOW()
       RETURNING caldav_url, caldav_username, caldav_calendar_path, updated_at`,
      [
        userId,
        caldav_url || 'https://caldav.icloud.com',
        caldav_username || '',
        caldav_password || null,
        caldav_calendar_path || '',
      ]
    );

    const row = result.rows[0];
    const passwordResult = await query(
      'SELECT caldav_password IS NOT NULL AND caldav_password <> \'\' AS password_set FROM user_settings WHERE user_id = $1',
      [userId]
    );
    res.json({
      caldav_url:           row.caldav_url,
      caldav_username:      row.caldav_username,
      caldav_password_set:  passwordResult.rows[0]?.password_set || false,
      caldav_calendar_path: row.caldav_calendar_path,
      updated_at:           row.updated_at,
    });
  } catch (err) { next(err); }
});

// POST /api/settings/caldav-test — test CalDAV connection with stored credentials
router.post('/caldav-test', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const result = await query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId]
    );
    const s = result.rows[0];

    if (!s?.caldav_username || !s?.caldav_password || !s?.caldav_calendar_path) {
      return res.json({ success: false, message: 'CalDAV credentials not fully configured — save username, password, and calendar path first.' });
    }

    const url = `${s.caldav_url || 'https://caldav.icloud.com'}${s.caldav_calendar_path}`;
    await axios({
      method: 'PROPFIND',
      url,
      headers: {
        Depth:           '0',
        'Content-Type': 'application/xml',
        Authorization:  'Basic ' + Buffer.from(`${s.caldav_username}:${s.caldav_password}`).toString('base64'),
      },
      data: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:displayname/></d:prop></d:propfind>',
      timeout: 8000,
    });

    res.json({ success: true, message: 'Connected successfully to CalDAV server.' });
  } catch (err) {
    const status = err.response?.status;
    const msg = status === 401
      ? 'Authentication failed — check your Apple ID and app-specific password.'
      : status === 404
      ? 'Calendar path not found — verify your CALDAV_CALENDAR_PATH.'
      : `Connection failed: ${err.message}`;
    res.json({ success: false, message: msg });
  }
});

module.exports = router;
