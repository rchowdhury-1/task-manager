'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, CalendarRange, Columns3, BarChart3 } from 'lucide-react';

const TABS = [
  { label: 'Today', href: '/today', icon: CalendarDays },
  { label: 'Week', href: '/week', icon: CalendarRange },
  { label: 'Boards', href: '/boards', icon: Columns3 },
  { label: 'Stats', href: '/stats', icon: BarChart3 },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-40">
      <div className="flex items-center justify-around h-14">
        {TABS.map(tab => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[56px]
                ${isActive ? 'text-accent' : 'text-secondary'}
              `}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
