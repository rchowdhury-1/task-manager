import { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  joinBoard: (boardId: string) => void;
  leaveBoard: (boardId: string) => void;
}

const SocketContext = createContext<SocketContextType>({ socket: null, joinBoard: () => {}, leaveBoard: () => {} });

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const token = localStorage.getItem('accessToken');
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => console.log('Socket connected'));
    socket.on('connect_error', (err) => console.error('Socket error:', err.message));

    socketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, [user]);

  const joinBoard = (boardId: string) => {
    socketRef.current?.emit('join-board', boardId);
  };

  const leaveBoard = (boardId: string) => {
    socketRef.current?.emit('leave-board', boardId);
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, joinBoard, leaveBoard }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
