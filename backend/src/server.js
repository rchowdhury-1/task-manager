require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { initDB } = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const { setupSocket } = require('./socket/handlers');

const authRoutes = require('./routes/auth');
const workspaceRoutes = require('./routes/workspaces');
const boardRoutes = require('./routes/boards');
const columnRoutes = require('./routes/columns');
const cardRoutes = require('./routes/cards');
const commentRoutes = require('./routes/comments');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/auth', authRoutes);
app.use('/workspaces', workspaceRoutes);
app.use('/boards', boardRoutes);
app.use('/columns', columnRoutes);
app.use('/cards', cardRoutes);
app.use('/comments', commentRoutes);
app.use('/dashboard', dashboardRoutes);

// Socket.io
setupSocket(io);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await initDB();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
