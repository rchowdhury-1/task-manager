require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { initDB, pool } = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const { setupSocket } = require('./socket/handlers');

// Original routes
const authRoutes       = require('./routes/auth');
const workspaceRoutes  = require('./routes/workspaces');
const boardRoutes      = require('./routes/boards');
const columnRoutes     = require('./routes/columns');
const cardRoutes       = require('./routes/cards');
const commentRoutes    = require('./routes/comments');
const dashboardRoutes  = require('./routes/dashboard');

// Personal OS routes
const taskRoutes        = require('./routes/tasks');
const habitRoutes       = require('./routes/habits');
const dayRuleRoutes     = require('./routes/day-rules');
const recurringRoutes   = require('./routes/recurring');
const groqUpdateRoutes   = require('./routes/groq-update');
const { authenticate: requireAuth } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

// Make io available to route handlers
app.set('io', io);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// 503 on pool exhaustion
app.use((req, res, next) => {
  const { pool } = require('./config/db');
  if (pool.totalCount >= pool.options.max && pool.waitingCount > 0) {
    res.set('Retry-After', '2');
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
  next();
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// All routes under /api/ — matches frontend axios baseURL
app.use('/api/auth',           authRoutes);
app.use('/api/workspaces',     workspaceRoutes);
app.use('/api/boards',         boardRoutes);
app.use('/api/columns',        columnRoutes);
app.use('/api/cards',          cardRoutes);
app.use('/api/comments',       commentRoutes);
app.use('/api/dashboard',      dashboardRoutes);

// Personal OS routes
app.use('/api/tasks',          taskRoutes);
app.use('/api/habits',         habitRoutes);
app.use('/api/day-rules',      dayRuleRoutes);
app.use('/api/recurring',      recurringRoutes);
app.use('/api/groq-update',    requireAuth, groqUpdateRoutes);

// CalDAV sync status endpoint (polled by frontend)
app.get('/api/caldav-status', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT status, error_message, attempted_at
       FROM caldav_sync_log
       WHERE user_id = $1
       ORDER BY attempted_at DESC
       LIMIT 1`,
      [req.user.userId]
    );
    res.json(rows[0] || { status: 'not_configured' });
  } catch (err) {
    res.json({ status: 'not_configured' });
  }
});

setupSocket(io);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await initDB();
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      try {
        const { isConfigured } = require('./lib/caldav');
        if (!isConfigured()) {
          console.warn('⚠ CalDAV not configured — iCloud sync disabled.');
        }
      } catch (e) {
        console.warn('⚠ CalDAV module not found — iCloud sync disabled.');
      }
    });
  } catch (err) {
    const msg = 'Failed to start server: ' + (err.stack || err) + '\n';
    process.stderr.write(msg, () => {
      process.exit(1);
    });
  }
};

start();
