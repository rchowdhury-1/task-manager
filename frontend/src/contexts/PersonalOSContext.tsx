import {
  createContext, useContext, useState, useEffect, useCallback,
  useRef, ReactNode,
} from 'react';
import api from '../api/axios';
import { useSocket } from './SocketContext';
import {
  Task, Habit, DayRule, RecurringTask, CaldavStatus, ClaudeOperation,
} from '../types/personalOS';

interface PersonalOSContextType {
  tasks: Task[]
  recurringTasks: RecurringTask[]
  dayRules: DayRule[]
  habits: Habit[]
  caldavStatus: CaldavStatus
  activeTaskId: string | null
  loading: boolean
  refetch: () => Promise<void>
  setActiveTask: (id: string | null) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  applyClaudeDiff: (operations: ClaudeOperation[]) => void
  toggleHabit: (habitId: string, date?: string) => Promise<void>
}

const PersonalOSContext = createContext<PersonalOSContextType | null>(null);

export const PersonalOSProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [dayRules, setDayRules] = useState<DayRule[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [caldavStatus, setCaldavStatus] = useState<CaldavStatus>('synced');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const caldavPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [tasksRes, recurringRes, dayRulesRes, habitsRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/recurring'),
        api.get('/day-rules'),
        api.get('/habits'),
      ]);
      setTasks(tasksRes.data);
      setRecurringTasks(recurringRes.data);
      setDayRules(dayRulesRes.data);
      setHabits(habitsRes.data);
    } catch (err) {
      console.error('PersonalOS fetchAll error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCaldavStatus = useCallback(async () => {
    try {
      const res = await api.get('/caldav-status');
      setCaldavStatus(res.data.status);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchAll();
    fetchCaldavStatus();

    // Poll CalDAV status every 30s
    caldavPollRef.current = setInterval(fetchCaldavStatus, 30000);
    return () => {
      if (caldavPollRef.current) clearInterval(caldavPollRef.current);
    };
  }, [fetchAll, fetchCaldavStatus]);

  // Socket.IO listeners
  useEffect(() => {
    if (!socket) return;

    const onBoardRefresh = () => {
      fetchAll();
    };

    const onTaskUpdated = (updatedTask: Task) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
      );
    };

    const onTaskDeleted = ({ id }: { id: string }) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (activeTaskId === id) setActiveTaskId(null);
    };

    socket.on('board:refresh', onBoardRefresh);
    socket.on('task:updated', onTaskUpdated);
    socket.on('task:deleted', onTaskDeleted);

    return () => {
      socket.off('board:refresh', onBoardRefresh);
      socket.off('task:updated', onTaskUpdated);
      socket.off('task:deleted', onTaskDeleted);
    };
  }, [socket, activeTaskId, fetchAll]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const applyClaudeDiff = useCallback((operations: ClaudeOperation[]) => {
    for (const op of operations) {
      switch (op.type) {
        case 'move_task':
          setTasks((prev) => prev.map((t) =>
            t.id === op.task_id ? { ...t, status: op.new_status } : t
          ));
          break;
        case 'update_task':
          setTasks((prev) => prev.map((t) =>
            t.id === op.task_id ? { ...t, ...op.fields } : t
          ));
          break;
        case 'create_task':
          // Full refetch on create — we don't have the DB-generated id
          fetchAll();
          break;
        case 'add_next_step':
          setTasks((prev) => prev.map((t) => {
            if (t.id !== op.task_id) return t;
            return { ...t, next_steps: [...t.next_steps, { text: op.text, done: false }] };
          }));
          break;
        case 'complete_next_step':
          setTasks((prev) => prev.map((t) => {
            if (t.id !== op.task_id) return t;
            const steps = [...t.next_steps];
            if (op.step_index < steps.length) steps[op.step_index] = { ...steps[op.step_index], done: true };
            return { ...t, next_steps: steps };
          }));
          break;
        case 'complete_habit':
          setHabits((prev) => prev.map((h) => {
            if (h.id !== op.habit_id) return h;
            const today = new Date().toISOString().split('T')[0];
            const completions = h.completions.includes(today)
              ? h.completions
              : [...h.completions, today];
            return { ...h, completions };
          }));
          break;
        case 'resolve_recurring':
          setRecurringTasks((prev) => prev.map((r) =>
            r.id === op.recurring_id ? { ...r, condition_met: true, active: false } : r
          ));
          break;
        default:
          break;
      }
    }
  }, [fetchAll]);

  const toggleHabit = useCallback(async (habitId: string, date?: string) => {
    try {
      const body = date ? { date } : {};
      const res = await api.post(`/habits/${habitId}/complete`, body);
      const { completed, date: completedDate } = res.data;

      setHabits((prev) => prev.map((h) => {
        if (h.id !== habitId) return h;
        const completions = completed
          ? [...h.completions, completedDate]
          : h.completions.filter((d) => d !== completedDate);
        return { ...h, completions };
      }));
    } catch (err) {
      console.error('toggleHabit error:', err);
    }
  }, []);

  return (
    <PersonalOSContext.Provider value={{
      tasks, recurringTasks, dayRules, habits,
      caldavStatus, activeTaskId, loading,
      refetch: fetchAll,
      setActiveTask: setActiveTaskId,
      updateTask, applyClaudeDiff, toggleHabit,
    }}>
      {children}
    </PersonalOSContext.Provider>
  );
};

export const usePersonalOS = () => {
  const ctx = useContext(PersonalOSContext);
  if (!ctx) throw new Error('usePersonalOS must be used within PersonalOSProvider');
  return ctx;
};
