import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';
import { env } from '../config/env';

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f59e0b', '#10b981', '#3b82f6', '#ef4444',
];

function randomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function signToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, env.JWT_SECRET, { expiresIn: '7d' });
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, display_name } = req.body;

  if (!email || !password || !display_name) {
    res.status(400).json({ error: 'email, password and display_name are required' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    const color = randomColor();

    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, display_name, avatar_color)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, display_name, avatar_color, created_at`,
      [email.toLowerCase(), hash, display_name, color]
    );

    const user = rows[0];
    const token = signToken(user.id, user.email);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, email, password_hash, display_name, avatar_color FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signToken(user.id, user.email);
    const { password_hash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, display_name, avatar_color, created_at FROM users WHERE id = $1',
      [req.user!.userId]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: rows[0] });
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}
