'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useLogout, useMe } from '@/lib/api/hooks';
import { ActiveTaskProvider } from '@/lib/state/activeTask';
import { TaskDetailPanel } from '@/components/TaskDetailPanel';
import { AICommandBar } from '@/components/AICommandBar';
import { KeyboardHelp } from '@/components/KeyboardHelp';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import Providers from '../providers';

const NAV_ITEMS = [
  { label: 'Today',    href: '/today' },
  { label: 'Week',     href: '/week' },
  { label: 'Boards',   href: '/boards' },
  { label: 'Stats',    href: '/stats' },
  { label: 'Settings', href: '/settings' },
] as const;

function AvatarMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: me } = useMe();
  const logout = useLogout();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = me?.name
    ? me.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : me?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-full bg-accent text-white text-xs font-semibold flex items-center justify-center"
        aria-label="Account menu"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-40 bg-surface border border-border rounded-lg shadow-lg py-1 z-50">
          <button
            onClick={() => { router.push('/settings'); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-surface-raised transition-colors"
          >
            Settings
          </button>
          <button
            onClick={() => logout.mutate()}
            className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-surface-raised transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-page">
      {/* Top header bar */}
      <header className="fixed top-0 left-0 right-0 z-40 h-[60px] bg-surface border-b border-border flex items-center px-4 md:px-6">
        <Link href="/today" className="flex items-center gap-2 mr-4 md:mr-8 shrink-0">
          <Image
            src="/icon-mark.svg"
            alt=""
            width={32}
            height={32}
            priority
            className="h-8 w-8 text-accent"
          />
          <span className="text-lg font-semibold tracking-tight text-primary">
            Personal OS
          </span>
        </Link>

        {/* Desktop nav tabs - hidden on mobile */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  px-3 py-2 text-sm font-medium transition-colors relative
                  ${isActive
                    ? 'text-accent'
                    : 'text-secondary hover:text-primary'
                  }
                `}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <AvatarMenu />
        </div>
      </header>

      {/* Sidebar - desktop only */}
      <aside className="hidden md:flex fixed top-[60px] left-0 bottom-0 w-[170px] bg-surface border-r border-border flex-col pt-6 px-3 z-30">
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  px-2 py-1.5 text-sm rounded-md transition-colors
                  ${isActive
                    ? 'text-accent bg-accent-muted font-medium'
                    : 'text-secondary hover:text-primary hover:bg-surface-raised'
                  }
                `}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content area */}
      {/* pb-36 on mobile: 56px bottom nav + 56px AI bar + padding */}
      {/* pb-24 on desktop: AI pill clearance */}
      <main className="pt-[60px] md:pl-[170px] min-h-screen">
        <div className="px-4 pt-4 pb-36 md:px-6 md:pt-6 md:pb-24">{children}</div>
      </main>

      {/* AI command bar */}
      <AICommandBar />

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <ActiveTaskProvider>
        <AppLayoutInner>{children}</AppLayoutInner>
        <TaskDetailPanel />
        <KeyboardHelp />
      </ActiveTaskProvider>
    </Providers>
  );
}
