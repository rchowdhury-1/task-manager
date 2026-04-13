const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const AVATAR_COLORS = ['#10b981','#f97316','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f59e0b'];

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, process.env.REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// POST /auth/register
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { name, email, password } = req.body;
    const existing = await query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const avatar_color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const result = await query(
      'INSERT INTO users (name, email, password_hash, avatar_color) VALUES ($1,$2,$3,$4) RETURNING id, name, email, avatar_color, created_at',
      [name, email, password_hash, avatar_color]
    );
    const user = result.rows[0];

    const { accessToken, refreshToken } = generateTokens(user.id);
    await query('INSERT INTO refresh_tokens (token, user_id) VALUES ($1,$2)', [refreshToken, user.id]);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ accessToken, user });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { email, password } = req.body;
    const result = await query('SELECT * FROM users WHERE email=$1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const { accessToken, refreshToken } = generateTokens(user.id);
    await query('INSERT INTO refresh_tokens (token, user_id) VALUES ($1,$2)', [refreshToken, user.id]);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { password_hash, ...safeUser } = user;
    res.json({ accessToken, user: safeUser });
  } catch (err) {
    next(err);
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ error: 'No refresh token' });

    const stored = await query('SELECT * FROM refresh_tokens WHERE token=$1', [token]);
    if (stored.rows.length === 0) return res.status(401).json({ error: 'Invalid refresh token' });

    const decoded = jwt.verify(token, process.env.REFRESH_SECRET);
    const userResult = await query('SELECT id, name, email, avatar_color, created_at FROM users WHERE id=$1', [decoded.userId]);
    if (userResult.rows.length === 0) return res.status(401).json({ error: 'User not found' });

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);

    await query('DELETE FROM refresh_tokens WHERE token=$1', [token]);
    await query('INSERT INTO refresh_tokens (token, user_id) VALUES ($1,$2)', [newRefreshToken, decoded.userId]);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken, user: userResult.rows[0] });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    next(err);
  }
});

// POST /auth/logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      await query('DELETE FROM refresh_tokens WHERE token=$1', [token]);
    }
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await query('SELECT id, name, email, avatar_color, created_at FROM users WHERE id=$1', [req.user.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
