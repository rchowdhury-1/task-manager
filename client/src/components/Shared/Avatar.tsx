import { getInitials } from '../../utils/helpers';

interface AvatarProps {
  name: string;
  color: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  tooltip?: boolean;
  className?: string;
}

const sizes = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
};

export function Avatar({ name, color, size = 'sm', tooltip = false, className = '' }: AvatarProps) {
  return (
    <div className={`relative group ${className}`}>
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white ring-2 ring-slate-800 select-none`}
        style={{ backgroundColor: color }}
        title={name}
      >
        {getInitials(name)}
      </div>
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-700 text-slate-100 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          {name}
        </div>
      )}
    </div>
  );
}
