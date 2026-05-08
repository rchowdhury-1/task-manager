const jwt = require('jsonwebtoken');

const setupSocket = (io) => {
  // Authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.userId})`);

    // ── Personal OS: join user's private room ────────────────────────────────
    socket.join(`user:${socket.userId}`);
    console.log(`User ${socket.userId} joined personal room`);

    // ── Original board rooms (TaskFlow compatibility) ────────────────────────
    socket.on('join-board', (boardId) => {
      socket.join(`board:${boardId}`);
    });

    socket.on('leave-board', (boardId) => {
      socket.leave(`board:${boardId}`);
    });

    // Personal OS room management
    socket.on('join-personal-os', () => {
      socket.join(`user:${socket.userId}`);
    });

    // Card events (TaskFlow)
    socket.on('card-moved', (data) => {
      socket.to(`board:${data.boardId}`).emit('card-moved', { ...data, movedBy: socket.userId });
    });

    socket.on('card-created', (data) => {
      socket.to(`board:${data.boardId}`).emit('card-created', { ...data, createdBy: socket.userId });
    });

    socket.on('card-updated', (data) => {
      socket.to(`board:${data.boardId}`).emit('card-updated', { ...data, updatedBy: socket.userId });
    });

    socket.on('card-deleted', (data) => {
      socket.to(`board:${data.boardId}`).emit('card-deleted', { ...data, deletedBy: socket.userId });
    });

    // Column events (TaskFlow)
    socket.on('column-created', (data) => {
      socket.to(`board:${data.boardId}`).emit('column-created', { ...data, createdBy: socket.userId });
    });

    socket.on('column-updated', (data) => {
      socket.to(`board:${data.boardId}`).emit('column-updated', { ...data, updatedBy: socket.userId });
    });

    socket.on('column-deleted', (data) => {
      socket.to(`board:${data.boardId}`).emit('column-deleted', { ...data, deletedBy: socket.userId });
    });

    // Comment events (TaskFlow)
    socket.on('comment-created', (data) => {
      socket.to(`board:${data.boardId}`).emit('comment-created', data);
    });

    socket.on('comment-deleted', (data) => {
      socket.to(`board:${data.boardId}`).emit('comment-deleted', data);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = { setupSocket };
