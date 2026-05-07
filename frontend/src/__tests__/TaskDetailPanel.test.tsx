import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Hoist mock variables ──────────────────────────────────────────────────────

const { mockSetActiveTask, mockUpdateTask, mockGet, mockPatch } = vi.hoisted(() => ({
  mockSetActiveTask: vi.fn(),
  mockUpdateTask: vi.fn(),
  mockGet: vi.fn(),
  mockPatch: vi.fn(),
}));

const mockTask = {
  id: 'task-1',
  user_id: 'user-1',
  title: 'Build LMS dashboard',
  category: 'lms',
  priority: 2,
  status: 'in_progress',
  assigned_day: '2026-05-07',
  day_of_week: null,
  duration_minutes: 120,
  time_logged_minutes: 60,
  scheduled_time: '10:00',
  notes: '# Notes\n\nSome markdown here',
  last_left_off: 'Working on the student table component',
  next_steps: [
    { text: 'Add filtering', done: false },
    { text: 'Write tests', done: true },
  ],
  cal_event_uid: 'uid-123@personal-os',
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-07T10:00:00Z',
  activity_log: [
    { id: 'act-1', task_id: 'task-1', user_id: 'user-1', action: 'created', payload: {}, created_at: '2026-05-01T00:00:00Z' },
    { id: 'act-2', task_id: 'task-1', user_id: 'user-1', action: 'moved', payload: { from: 'backlog', to: 'in_progress' }, created_at: '2026-05-05T10:00:00Z' },
  ],
};

vi.mock('../contexts/PersonalOSContext', () => ({
  usePersonalOS: () => ({
    activeTaskId: 'task-1',
    setActiveTask: mockSetActiveTask,
    updateTask: mockUpdateTask,
    tasks: [mockTask],
    habits: [],
    dayRules: [],
    recurringTasks: [],
    caldavStatus: 'synced',
    loading: false,
    refetch: vi.fn(),
    applyClaudeDiff: vi.fn(),
    toggleHabit: vi.fn(),
  }),
}));

vi.mock('../api/axios', () => ({
  default: {
    get: mockGet,
    patch: mockPatch,
    post: vi.fn(),
  },
}));

import TaskDetailPanel from '../components/PersonalOS/TaskDetailPanel';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TaskDetailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: mockTask });
    mockPatch.mockResolvedValue({ data: mockTask });
  });

  it('fetches task data on mount', async () => {
    render(<TaskDetailPanel />);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/tasks/task-1');
    });
  });

  it('renders task title from API response', async () => {
    render(<TaskDetailPanel />);
    await waitFor(() => {
      expect(screen.getByText('Build LMS dashboard')).toBeTruthy();
    });
  });

  it('renders last_left_off pre-filled', async () => {
    render(<TaskDetailPanel />);
    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(/where did you last leave/i) as HTMLTextAreaElement;
      expect(textarea.value).toBe('Working on the student table component');
    });
  });

  it('renders next steps list', async () => {
    render(<TaskDetailPanel />);
    await waitFor(() => {
      expect(screen.getByText('Add filtering')).toBeTruthy();
      expect(screen.getByText('Write tests')).toBeTruthy();
    });
  });

  it('shows Cal sync status when cal_event_uid is set', async () => {
    render(<TaskDetailPanel />);
    await waitFor(() => {
      expect(screen.getByText(/synced to apple calendar/i)).toBeTruthy();
    });
  });

  it('closes panel on Escape key', async () => {
    render(<TaskDetailPanel />);
    await waitFor(() => screen.getByText('Build LMS dashboard'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockSetActiveTask).toHaveBeenCalledWith(null);
  });

  it('activity log renders correctly (Created and Moved entries)', async () => {
    render(<TaskDetailPanel />);
    await waitFor(() => {
      expect(screen.getByText('Moved')).toBeTruthy();
      expect(screen.getByText('Created')).toBeTruthy();
    });
  });
});
