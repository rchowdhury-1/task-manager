const { Pool, types } = require('pg');
const fs = require('fs');
const path = require('path');

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of JS Date objects.
// Without this, pg converts DATE → JS Date → JSON serialises as ISO timestamp
// with timezone offset (e.g. "2026-05-07T23:00:00.000Z" for BST users),
// breaking all frontend date comparisons.
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const query = (text, params) => pool.query(text, params);

const initDB = async () => {
  const client = await pool.connect();
  try {
    // Original TaskFlow schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        avatar_color VARCHAR(7) DEFAULT '#10b981',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS workspaces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS workspace_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(workspace_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS boards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(7) DEFAULT '#10b981',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS columns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        position INTEGER NOT NULL DEFAULT 0,
        due_date TIMESTAMPTZ,
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        priority VARCHAR(20) DEFAULT 'medium',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS card_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS activity_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token TEXT NOT NULL UNIQUE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Base schema column guards — handles tables that pre-date column additions
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(7) DEFAULT '#10b981';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
    `);

    // Personal OS migration
    const migrationPath = path.join(__dirname, '../db/migrations/001_personal_os.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    await client.query(migrationSQL);

    // Per-user settings migration
    const migration2Path = path.join(__dirname, '../db/migrations/002_caldav_settings.sql');
    const migration2SQL = fs.readFileSync(migration2Path, 'utf8');
    await client.query(migration2SQL);

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
};

module.exports = { query, initDB, pool };
