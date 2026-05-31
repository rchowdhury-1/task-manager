'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, List, CalendarRange, BarChart3 } from 'lucide-react';

const TABS = [
  { label: 'Today', href: '/today', icon: CalendarDays },
  { label: 'Lists', href: '/lists', icon: List },
  { label: 'Week',  href: '/week',  icon: CalendarRange },
  { label: 'Stats', href: '/stats', icon: BarChart3 },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4 min-h-16">
        {TABS.map(tab => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                flex flex-col items-center justify-center gap-0.5
                ${isActive ? 'text-accent' : 'text-secondary'}
              `}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="font-mono text-[10.5px] uppercase tracking-wide">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
