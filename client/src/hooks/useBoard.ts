import { useCallback } from 'react';
import { useSocketStore } from '../store/socketStore';
import { useAuthStore } from '../store/authStore';

export function useBoard(boardId?: string) {
  const socket = useSocketStore((s) => s.socket);
  const connected = useSocketStore((s) => s.connected);
  const user = useAuthStore((s) => s.user);

  const emitCursorMove = useCallback((x: number, y: number) => {
    if (!socket || !boardId) return;
    socket.emit('cursor-move', { boardId, x, y });
  }, [socket, boardId]);

  const emitTyping = useCallback((taskId: string) => {
    if (!socket || !boardId) return;
    socket.emit('user-typing', { taskId, boardId });
  }, [socket, boardId]);

  return { connected, emitCursorMove, emitTyping, currentUserId: user?.id };
}
