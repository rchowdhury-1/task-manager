import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Hoist mock variables so factory can reference them ────────────────────────

const { mockPost, mockApplyClaudeDiff, mockRefetch } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockApplyClaudeDiff: vi.fn(),
  mockRefetch: vi.fn(),
}));

vi.mock('../contexts/PersonalOSContext', () => ({
  usePersonalOS: () => ({
    applyClaudeDiff: mockApplyClaudeDiff,
    refetch: mockRefetch,
    tasks: [],
    habits: [],
    dayRules: [],
    recurringTasks: [],
    caldavStatus: 'synced',
    activeTaskId: null,
    loading: false,
    setActiveTask: vi.fn(),
    updateTask: vi.fn(),
    toggleHabit: vi.fn(),
  }),
}));

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: mockPost,
    patch: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import ClaudeBar from '../components/PersonalOS/ClaudeBar';
import toast from 'react-hot-toast';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ClaudeBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefetch.mockResolvedValue(undefined);
  });

  it('renders the input and submit button', () => {
    render(<ClaudeBar />);
    const input = screen.getByPlaceholderText(/tell claude what to update/i);
    expect(input).toBeTruthy();
    expect(screen.getByRole('button', { name: /update/i })).toBeTruthy();
  });

  it('empty input does not submit', async () => {
    render(<ClaudeBar />);
    const button = screen.getByRole('button', { name: /update/i });
    await userEvent.click(button);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('shows loading spinner on submit', async () => {
    mockPost.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<ClaudeBar />);
    const input = screen.getByPlaceholderText(/tell claude what to update/i);
    await userEvent.type(input, 'move task to done');
    await userEvent.click(screen.getByRole('button', { name: /update/i }));
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('shows success toast after successful response', async () => {
    mockPost.mockResolvedValue({
      data: { operations_applied: [], summary: 'Moved your task to done.', warnings: [] },
    });
    render(<ClaudeBar />);
    const input = screen.getByPlaceholderText(/tell claude what to update/i);
    await userEvent.type(input, 'move task to done');
    await userEvent.click(screen.getByRole('button', { name: /update/i }));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Moved your task to done.', expect.any(Object));
    });
  });

  it('shows warning banner when warnings are returned', async () => {
    mockPost.mockResolvedValue({
      data: {
        operations_applied: [{ type: 'schedule_warning', message: 'Conflict on Monday' }],
        summary: 'Warning detected',
        warnings: ['Monday is job hunt day — LMS task would conflict.'],
      },
    });
    render(<ClaudeBar />);
    await userEvent.type(screen.getByPlaceholderText(/tell claude what to update/i), 'add lms task to monday');
    await userEvent.click(screen.getByRole('button', { name: /update/i }));
    await waitFor(() => {
      expect(screen.getByText(/schedule conflict/i)).toBeTruthy();
    });
  });

  it('network error shows error toast', async () => {
    mockPost.mockRejectedValue({ response: { data: { error: 'Claude timed out' } } });
    render(<ClaudeBar />);
    await userEvent.type(screen.getByPlaceholderText(/tell claude what to update/i), 'update something');
    await userEvent.click(screen.getByRole('button', { name: /update/i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Claude timed out', expect.any(Object));
    });
  });

  it('clears input after successful submission', async () => {
    mockPost.mockResolvedValue({ data: { operations_applied: [], summary: 'Done', warnings: [] } });
    render(<ClaudeBar />);
    const input = screen.getByPlaceholderText(/tell claude what to update/i) as HTMLTextAreaElement;
    await userEvent.type(input, 'do something');
    await userEvent.click(screen.getByRole('button', { name: /update/i }));
    await waitFor(() => { expect(input.value).toBe(''); });
  });
});
