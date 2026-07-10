// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskDetailPanel } from '@/components/TaskDetailPanel';
import { ActiveTaskProvider, useActiveTask } from '@/lib/state/activeTask';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const TASK_ID = '550e8400-e29b-41d4-a716-446655440000';

const TASK = {
  id: TASK_ID,
  userId: 'user-1',
  title: 'Repro task',
  description: null,
  category: 'learning',
  status: 'backlog',
  priority: 2,
  assignedDay: null,
  scheduledTime: null,
  durationMinutes: 60,
  timeLoggedMinutes: 0,
  lastLeftOff: null,
  nextSteps: [],
  notes: null,
  createdAt: '2026-07-01T10:00:00Z',
  updatedAt: '2026-07-01T10:00:00Z',
};

const apiCalls: { path: string; init?: RequestInit }[] = [];

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(async (path: string, init?: RequestInit) => {
    apiCalls.push({ path, init });
    if (path === '/categories') return [
      { id: 'c1', slug: 'learning', label: 'Learning', colour: 'violet', icon: 'book', isSystem: false, sortOrder: 0 },
    ];
    if (path === `/tasks/${TASK_ID}`) return TASK;
    return TASK;
  }),
}));

// Opens the panel by setting the active task id, as task cards do
function OpenButton() {
  const { setActiveTaskId } = useActiveTask();
  return <button onClick={() => setActiveTaskId(TASK_ID)}>open-task</button>;
}

function renderPanel() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <ActiveTaskProvider>
        <OpenButton />
        <TaskDetailPanel />
      </ActiveTaskProvider>
    </QueryClientProvider>,
  );
}

async function openPanel() {
  fireEvent.click(screen.getByText('open-task'));
  await waitFor(() => expect(screen.getByDisplayValue('Repro task')).toBeDefined());
}

function panelIsOpen() {
  return !!screen.queryByDisplayValue('Repro task');
}

function patchCalls() {
  return apiCalls.filter(c => c.init?.method === 'PATCH');
}

// jsdom may lack PointerEvent; the swipe handlers only need pointerId/clientX
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    constructor(type: string, params: MouseEventInit & { pointerId?: number } = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).PointerEvent = PointerEventPolyfill;
}

beforeEach(() => {
  apiCalls.length = 0;
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ─── Exit paths (Bug 2) ─────────────────────────────────────────────────────

describe('TaskDetailPanel exits', () => {
  it('closes on Escape', async () => {
    renderPanel();
    await openPanel();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(panelIsOpen()).toBe(false));
  });

  it('closes on Escape while the notes textarea is focused', async () => {
    renderPanel();
    await openPanel();
    const notes = screen.getByPlaceholderText(/detailed notes/i);
    notes.focus();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(panelIsOpen()).toBe(false));
  });

  it('closes on backdrop click', async () => {
    const { container } = renderPanel();
    await openPanel();
    const backdrop = container.querySelector('.fixed.inset-0');
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    await waitFor(() => expect(panelIsOpen()).toBe(false));
  });

  it('pushes a history entry on open and closes on back (popstate)', async () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    renderPanel();
    await openPanel();
    expect(pushSpy).toHaveBeenCalledWith({ posTaskPanel: true }, '');

    // Simulate the browser back button
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await waitFor(() => expect(panelIsOpen()).toBe(false));
  });

  it('consumes its history entry when closed by other means', async () => {
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    renderPanel();
    await openPanel();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(panelIsOpen()).toBe(false));
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('does not call history.back when closed via popstate itself', async () => {
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    renderPanel();
    await openPanel();
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await waitFor(() => expect(panelIsOpen()).toBe(false));
    expect(backSpy).not.toHaveBeenCalled();
  });
});

// ─── Mobile swipe-to-dismiss (ADR-004) ──────────────────────────────────────

function swipeZone() {
  return screen.getByTestId('panel-swipe-zone');
}

function doSwipe(distance: number) {
  // window.innerWidth (1024 in jsdom) is the threshold base since offsetWidth
  // is 0 in jsdom — dismiss threshold is innerWidth / 3 ≈ 341
  const zone = swipeZone();
  fireEvent.pointerDown(zone, { pointerId: 1, clientX: 8 });
  fireEvent.pointerMove(zone, { pointerId: 1, clientX: 8 + distance });
  fireEvent.pointerUp(zone, { pointerId: 1, clientX: 8 + distance });
}

describe('TaskDetailPanel swipe-to-dismiss', () => {
  it('closes when swiped right past the threshold', async () => {
    renderPanel();
    await openPanel();
    doSwipe(500);
    await waitFor(() => expect(panelIsOpen()).toBe(false));
  });

  it('flushes pending edits and consumes the history entry on swipe-close', async () => {
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    renderPanel();
    await openPanel();

    const notes = screen.getByPlaceholderText(/detailed notes/i);
    fireEvent.change(notes, { target: { value: 'typed then swiped' } });

    doSwipe(500);
    await waitFor(() => expect(panelIsOpen()).toBe(false));

    expect(backSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      const patches = patchCalls().map(c => JSON.parse(String(c.init?.body)));
      expect(patches.some(p => p.notes === 'typed then swiped')).toBe(true);
    });
  });

  it('snaps back and stays open on a short swipe', async () => {
    renderPanel();
    await openPanel();
    doSwipe(30);
    // panel remains open and interactive
    expect(panelIsOpen()).toBe(true);
    expect(screen.getByDisplayValue('Repro task')).toBeDefined();
  });

  it('shows the gesture hint on first open only', async () => {
    renderPanel();
    await openPanel();
    expect(screen.getByText(/swipe right or tap/i)).toBeDefined();
    expect(localStorage.getItem('pos-swipe-hint-dismissed')).toBe('1');

    // Close, wait for unmount (250ms animation), reopen in the SAME session —
    // the hint state must have been reset, not just the storage flag
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(panelIsOpen()).toBe(false));
    await new Promise(r => setTimeout(r, 300));
    await openPanel();
    expect(screen.queryByText(/swipe right or tap/i)).toBeNull();
    cleanup();

    // Fresh mount with the flag already set — hint must not reappear
    renderPanel();
    await openPanel();
    expect(screen.queryByText(/swipe right or tap/i)).toBeNull();
  });
});

// ─── Unsaved changes (ADR-003: autosave + flush on close) ───────────────────

describe('TaskDetailPanel autosave flush', () => {
  it('flushes a pending debounced notes edit when closed before the debounce fires', async () => {
    renderPanel();
    await openPanel();

    const notes = screen.getByPlaceholderText(/detailed notes/i);
    fireEvent.change(notes, { target: { value: 'important thought' } });

    // Close immediately — well inside the 800ms debounce window
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(panelIsOpen()).toBe(false));

    await waitFor(() => {
      const patches = patchCalls().map(c => JSON.parse(String(c.init?.body)));
      expect(patches.some(p => p.notes === 'important thought')).toBe(true);
    });
  });

  it('does not double-save when the debounce already fired', async () => {
    renderPanel();
    await openPanel();

    const notes = screen.getByPlaceholderText(/detailed notes/i);
    fireEvent.change(notes, { target: { value: 'settled text' } });

    // Let the 800ms debounce deliver the save
    await waitFor(() => {
      const patches = patchCalls().map(c => JSON.parse(String(c.init?.body)));
      expect(patches.some(p => p.notes === 'settled text')).toBe(true);
    }, { timeout: 2000 });

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(panelIsOpen()).toBe(false));

    const notePatches = patchCalls()
      .map(c => JSON.parse(String(c.init?.body)))
      .filter(p => p.notes === 'settled text');
    expect(notePatches.length).toBe(1);
  });
});
