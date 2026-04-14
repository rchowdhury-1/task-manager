import { useSocketStore } from '../../store/socketStore';
import { getInitials } from '../../utils/helpers';

export function UserCursors() {
  const cursors = useSocketStore((s) => s.cursors);

  return (
    <>
      {Array.from(cursors.entries()).map(([userId, cursor]) => (
        <div
          key={userId}
          className="fixed pointer-events-none z-50 transition-transform duration-75"
          style={{ left: cursor.x, top: cursor.y }}
        >
          {/* Cursor dot */}
          <div
            className="w-3 h-3 rounded-full border-2 border-white shadow-lg"
            style={{ backgroundColor: cursor.avatarColor }}
          />
          {/* Name tag */}
          <div
            className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-white text-[11px] font-medium whitespace-nowrap shadow-lg"
            style={{ backgroundColor: cursor.avatarColor }}
          >
            {cursor.displayName}
          </div>
        </div>
      ))}
    </>
  );
}
