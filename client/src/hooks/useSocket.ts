import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { useTaskStore } from '../store/taskStore';
import { createSocket, disconnectSocket } from '../services/socket';
import { Task, ActivityEntry, ActiveUser } from '../types';

export function useSocket(boardId?: string) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const { setSocket, setConnected, setActiveUsers, addActiveUser, removeActiveUser, updateCursor, removeCursor } =
    useSocketStore();
  const { handleTaskCreated, handleTaskUpdated, handleTaskMoved, handleTaskDeleted, handleActivityReceived } =
    useTaskStore();
  const currentBoardRef = useRef<string | undefined>(boardId);
  const cursorFadeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    currentBoardRef.current = boardId;
  }, [boardId]);

  useEffect(() => {
    if (!token) return;

    const socket = createSocket(token);
    setSocket(socket);

    socket.on('connect', () => {
      setConnected(true);
      // Re-join board on reconnect
      if (currentBoardRef.current) {
        socket.emit('join-board', { boardId: currentBoardRef.current });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
      setActiveUsers([]);
    });

    socket.on('active-users', (users: ActiveUser[]) => {
      // Filter out self
      const others = users.filter((u) => u.id !== user?.id);
      setActiveUsers(others);
    });

    socket.on('user-joined', ({ user: joinedUser }: { user: ActiveUser }) => {
      if (joinedUser.id !== user?.id) {
        addActiveUser(joinedUser);
      }
    });

    socket.on('user-left', ({ userId }: { userId: string }) => {
      removeActiveUser(userId);
      removeCursor(userId);
    });

    socket.on('task-created', ({ task }: { task: Task }) => {
      handleTaskCreated(task);
    });

    socket.on('task-updated', ({ task }: { task: Task }) => {
      handleTaskUpdated(task);
    });

    socket.on('task-moved', (payload: { taskId: string; toColumnId: string; newPosition: number; updatedPositions: { id: string; column_id: string; position: number }[] }) => {
      handleTaskMoved(payload);
    });

    socket.on('task-deleted', ({ taskId }: { taskId: string }) => {
      handleTaskDeleted(taskId);
    });

    socket.on('cursor-update', ({ userId, x, y }: { userId: string; x: number; y: number }) => {
      const activeUsers = useSocketStore.getState().activeUsers;
      const cursorUser = activeUsers.find((u) => u.id === userId);
      if (cursorUser) {
        updateCursor(userId, x, y, cursorUser.displayName, cursorUser.avatarColor);

        // Auto-fade cursor after 5s of inactivity
        const existing = cursorFadeTimers.current.get(userId);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          removeCursor(userId);
          cursorFadeTimers.current.delete(userId);
        }, 5000);
        cursorFadeTimers.current.set(userId, timer);
      }
    });

    socket.on('activity', (activity: ActivityEntry) => {
      handleActivityReceived(activity);
    });

    return () => {
      // Clean cursor timers
      for (const timer of cursorFadeTimers.current.values()) clearTimeout(timer);
      cursorFadeTimers.current.clear();
      disconnectSocket();
      setSocket(null);
      setConnected(false);
      setActiveUsers([]);
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Join/leave board room
  useEffect(() => {
    const socket = useSocketStore.getState().socket;
    if (!socket?.connected) return;

    if (boardId) {
      socket.emit('join-board', { boardId });
    }

    return () => {
      if (boardId) {
        socket.emit('leave-board', { boardId });
        setActiveUsers([]);
      }
    };
  }, [boardId]); // eslint-disable-line react-hooks/exhaustive-deps
}
