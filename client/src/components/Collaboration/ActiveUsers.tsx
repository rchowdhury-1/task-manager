import { useSocketStore } from '../../store/socketStore';
import { Avatar } from '../Shared/Avatar';

export function ActiveUsers() {
  const activeUsers = useSocketStore((s) => s.activeUsers);

  if (activeUsers.length === 0) return null;

  return (
    <div className="flex items-center -space-x-1.5">
      {activeUsers.slice(0, 6).map((u) => (
        <Avatar key={u.id} name={u.displayName} color={u.avatarColor} size="xs" tooltip />
      ))}
      {activeUsers.length > 6 && (
        <div className="w-5 h-5 rounded-full bg-slate-700 ring-2 ring-slate-800 flex items-center justify-center text-[10px] text-slate-300">
          +{activeUsers.length - 6}
        </div>
      )}
    </div>
  );
}
