import { create } from 'zustand';
import { Board, Column, Task, BoardMember, ActivityEntry } from '../types';
import { boardsApi, tasksApi, columnsApi } from '../services/api';
import toast from 'react-hot-toast';

interface TaskStore {
  boards: Board[];
  currentBoard: Board | null;
  activities: ActivityEntry[];
  isLoadingBoards: boolean;
  isLoadingBoard: boolean;

  // Board actions
  fetchBoards: () => Promise<void>;
  fetchBoard: (id: string) => Promise<void>;
  createBoard: (name: string) => Promise<Board | null>;
  deleteBoard: (id: string) => Promise<void>;
  joinBoard: (inviteCode: string) => Promise<Board | null>;
  setCurrentBoard: (board: Board | null) => void;

  // Task actions
  createTask: (data: {
    columnId: string; boardId: string; title: string;
    description?: string; priority?: string; assignedTo?: string; dueDate?: string;
  }) => Promise<Task | null>;
  updateTask: (id: string, changes: Record<string, unknown>) => Promise<void>;
  moveTask: (taskId: string, toColumnId: string, newPosition: number) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  // Column actions
  addColumn: (boardId: string, name: string, color?: string) => Promise<Column | null>;
  updateColumn: (id: string, data: { name?: string; color?: string }) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;

  // Socket event handlers
  handleTaskCreated: (task: Task) => void;
  handleTaskUpdated: (task: Task) => void;
  handleTaskMoved: (payload: { taskId: string; toColumnId: string; newPosition: number; updatedPositions: { id: string; column_id: string; position: number }[] }) => void;
  handleTaskDeleted: (taskId: string) => void;
  handleActivityReceived: (activity: ActivityEntry) => void;

  // Activities
  fetchActivities: (boardId: string) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  boards: [],
  currentBoard: null,
  activities: [],
  isLoadingBoards: false,
  isLoadingBoard: false,

  fetchBoards: async () => {
    set({ isLoadingBoards: true });
    try {
      const res = await boardsApi.list();
      set({ boards: res.data.boards });
    } catch {
      toast.error('Failed to load boards');
    } finally {
      set({ isLoadingBoards: false });
    }
  },

  fetchBoard: async (id) => {
    set({ isLoadingBoard: true });
    try {
      const res = await boardsApi.get(id);
      set({ currentBoard: res.data.board });
    } catch {
      toast.error('Failed to load board');
    } finally {
      set({ isLoadingBoard: false });
    }
  },

  createBoard: async (name) => {
    try {
      const res = await boardsApi.create(name);
      const board: Board = res.data.board;
      set((state) => ({ boards: [board, ...state.boards] }));
      toast.success('Board created!');
      return board;
    } catch {
      toast.error('Failed to create board');
      return null;
    }
  },

  deleteBoard: async (id) => {
    try {
      await boardsApi.delete(id);
      set((state) => ({
        boards: state.boards.filter((b) => b.id !== id),
        currentBoard: state.currentBoard?.id === id ? null : state.currentBoard,
      }));
      toast.success('Board deleted');
    } catch {
      toast.error('Failed to delete board');
    }
  },

  joinBoard: async (inviteCode) => {
    try {
      const res = await boardsApi.join(inviteCode);
      const board: Board = res.data.board;
      set((state) => ({ boards: [...state.boards, board] }));
      toast.success('Joined board!');
      return board;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Failed to join board');
      return null;
    }
  },

  setCurrentBoard: (board) => set({ currentBoard: board }),

  createTask: async (data) => {
    try {
      const res = await tasksApi.create(data);
      const task: Task = res.data.task;
      set((state) => {
        if (!state.currentBoard) return state;
        return {
          currentBoard: {
            ...state.currentBoard,
            tasks: [...(state.currentBoard.tasks || []), task],
          },
        };
      });
      return task;
    } catch {
      toast.error('Failed to create task');
      return null;
    }
  },

  updateTask: async (id, changes) => {
    // Optimistic update
    set((state) => {
      if (!state.currentBoard) return state;
      return {
        currentBoard: {
          ...state.currentBoard,
          tasks: (state.currentBoard.tasks || []).map((t) =>
            t.id === id ? { ...t, ...changes } : t
          ),
        },
      };
    });

    try {
      const res = await tasksApi.update(id, changes);
      const updated: Task = res.data.task;
      set((state) => {
        if (!state.currentBoard) return state;
        return {
          currentBoard: {
            ...state.currentBoard,
            tasks: (state.currentBoard.tasks || []).map((t) =>
              t.id === id ? updated : t
            ),
          },
        };
      });
    } catch {
      toast.error('Failed to update task');
      get().fetchBoard(get().currentBoard!.id);
    }
  },

  moveTask: async (taskId, toColumnId, newPosition) => {
    const board = get().currentBoard;
    if (!board) return;

    const task = board.tasks?.find((t) => t.id === taskId);
    if (!task) return;

    // Optimistic update
    set((state) => {
      if (!state.currentBoard) return state;
      const tasks = [...(state.currentBoard.tasks || [])];
      const taskIdx = tasks.findIndex((t) => t.id === taskId);
      if (taskIdx === -1) return state;

      const updatedTask = { ...tasks[taskIdx], column_id: toColumnId, position: newPosition };
      tasks[taskIdx] = updatedTask;

      return {
        currentBoard: { ...state.currentBoard, tasks },
      };
    });

    try {
      await tasksApi.move(taskId, toColumnId, newPosition);
    } catch {
      toast.error('Failed to move task');
      get().fetchBoard(board.id);
    }
  },

  deleteTask: async (id) => {
    const task = get().currentBoard?.tasks?.find((t) => t.id === id);

    // Optimistic
    set((state) => {
      if (!state.currentBoard) return state;
      return {
        currentBoard: {
          ...state.currentBoard,
          tasks: (state.currentBoard.tasks || []).filter((t) => t.id !== id),
        },
      };
    });

    try {
      await tasksApi.delete(id);
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
      if (task && get().currentBoard) {
        get().fetchBoard(get().currentBoard!.id);
      }
    }
  },

  addColumn: async (boardId, name, color) => {
    try {
      const res = await boardsApi.addColumn(boardId, { name, color });
      const column: Column = res.data.column;
      set((state) => {
        if (!state.currentBoard) return state;
        return {
          currentBoard: {
            ...state.currentBoard,
            columns: [...(state.currentBoard.columns || []), column],
          },
        };
      });
      return column;
    } catch {
      toast.error('Failed to add column');
      return null;
    }
  },

  updateColumn: async (id, data) => {
    try {
      const res = await columnsApi.update(id, data);
      const updated: Column = res.data.column;
      set((state) => {
        if (!state.currentBoard) return state;
        return {
          currentBoard: {
            ...state.currentBoard,
            columns: (state.currentBoard.columns || []).map((c) =>
              c.id === id ? updated : c
            ),
          },
        };
      });
    } catch {
      toast.error('Failed to update column');
    }
  },

  deleteColumn: async (id) => {
    set((state) => {
      if (!state.currentBoard) return state;
      return {
        currentBoard: {
          ...state.currentBoard,
          columns: (state.currentBoard.columns || []).filter((c) => c.id !== id),
          tasks: (state.currentBoard.tasks || []).filter((t) => t.column_id !== id),
        },
      };
    });

    try {
      await columnsApi.delete(id);
      toast.success('Column deleted');
    } catch {
      toast.error('Failed to delete column');
    }
  },

  // Socket handlers
  handleTaskCreated: (task) =>
    set((state) => {
      if (!state.currentBoard || state.currentBoard.id !== task.board_id) return state;
      const exists = state.currentBoard.tasks?.some((t) => t.id === task.id);
      if (exists) return state;
      return {
        currentBoard: {
          ...state.currentBoard,
          tasks: [...(state.currentBoard.tasks || []), task],
        },
      };
    }),

  handleTaskUpdated: (task) =>
    set((state) => {
      if (!state.currentBoard) return state;
      return {
        currentBoard: {
          ...state.currentBoard,
          tasks: (state.currentBoard.tasks || []).map((t) =>
            t.id === task.id ? task : t
          ),
        },
      };
    }),

  handleTaskMoved: ({ taskId, toColumnId, newPosition, updatedPositions }) =>
    set((state) => {
      if (!state.currentBoard) return state;
      const tasks = (state.currentBoard.tasks || []).map((t) => {
        const updated = updatedPositions.find((u) => u.id === t.id);
        if (updated) {
          return { ...t, column_id: updated.column_id, position: updated.position };
        }
        return t;
      });
      return { currentBoard: { ...state.currentBoard, tasks } };
    }),

  handleTaskDeleted: (taskId) =>
    set((state) => {
      if (!state.currentBoard) return state;
      return {
        currentBoard: {
          ...state.currentBoard,
          tasks: (state.currentBoard.tasks || []).filter((t) => t.id !== taskId),
        },
      };
    }),

  handleActivityReceived: (activity) =>
    set((state) => ({ activities: [activity, ...state.activities].slice(0, 100) })),

  fetchActivities: async (boardId) => {
    try {
      const res = await boardsApi.getActivities(boardId);
      set({ activities: res.data.activities });
    } catch {
      // silently fail
    }
  },
}));
