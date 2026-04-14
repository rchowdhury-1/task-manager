import { useEffect, useRef } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { Avatar } from '../Shared/Avatar';
import { formatRelativeTime, buildActivityText } from '../../utils/helpers';
import { ActivityEntry } from '../../types';

interface ActivityFeedProps {
  boardId?: string;
  onClose: () => void;
}

export function ActivityFeed({ boardId, onClose }: ActivityFeedProps) {
  const { activities, fetchActivities } = useTaskStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (boardId) {
      fetchActivities(boardId);
    }
  }, [boardId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activities]);

  function resolveActivity(entry: ActivityEntry) {
    const displayName = entry.user?.displayName || entry.display_name || 'Unknown';
    const avatarColor = entry.user?.avatarColor || entry.avatar_color || '#6366f1';
    const action = entry.action || '';
    const entityType = entry.entityType || entry.entity_type || '';
    const metadata = entry.metadata || {};
    const createdAt = entry.createdAt || entry.created_at || '';
    return { displayName, avatarColor, action, entityType, metadata, createdAt };
  }

  return (
    <aside className="w-80 h-full bg-slate-900 border-l border-slate-700/50 flex flex-col animate-slide-in">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h2 className="text-slate-100 font-semibold text-sm">Activity Feed</h2>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded hover:bg-slate-800"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm">No activity yet</p>
          </div>
        ) : (
          [...activities].reverse().map((entry, i) => {
            const { displayName, avatarColor, action, entityType, metadata, createdAt } = resolveActivity(entry);
            return (
              <div key={entry.id || i} className="flex gap-3 group">
                <Avatar name={displayName} color={avatarColor} size="xs" className="flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 text-xs leading-relaxed">
                    <span className="font-medium text-slate-100">{displayName}</span>
                    {' '}{buildActivityText(action, entityType, metadata)}
                  </p>
                  <p className="text-slate-600 text-[11px] mt-0.5">{formatRelativeTime(createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </aside>
  );
}
