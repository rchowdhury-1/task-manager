import PersonalOSLayout from '../../components/PersonalOS/PersonalOSLayout';
import KanbanBoard from '../../components/PersonalOS/KanbanBoard';
import HabitsTracker from '../../components/PersonalOS/HabitsTracker';
import TaskDetailPanel from '../../components/PersonalOS/TaskDetailPanel';
import { useState } from 'react';

export default function BoardsPage() {
  const [tab, setTab] = useState<'kanban' | 'habits'>('kanban');

  return (
    <PersonalOSLayout>
      <div className="px-4 pt-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('kanban')}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: tab === 'kanban' ? 'rgba(16,185,129,0.15)' : 'transparent',
              color: tab === 'kanban' ? 'var(--primary)' : 'var(--text-muted)',
            }}
          >
            Kanban
          </button>
          <button
            onClick={() => setTab('habits')}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: tab === 'habits' ? 'rgba(16,185,129,0.15)' : 'transparent',
              color: tab === 'habits' ? 'var(--primary)' : 'var(--text-muted)',
            }}
          >
            Habits
          </button>
        </div>
      </div>
      {tab === 'kanban' ? <KanbanBoard /> : <HabitsTracker />}
      <TaskDetailPanel />
    </PersonalOSLayout>
  );
}
