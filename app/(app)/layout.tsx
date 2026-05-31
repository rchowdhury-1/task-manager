'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoMark } from '@/components/LogoMark';
import { useLogout, useMe } from '@/lib/api/hooks';
import { ActiveTaskProvider } from '@/lib/state/activeTask';
import { TaskDetailPanel } from '@/components/TaskDetailPanel';
import { AICommandBar } from '@/components/AICommandBar';
import { KeyboardHelp } from '@/components/KeyboardHelp';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { useShortcutLabel } from '@/lib/hooks/usePlatform';
import Providers from '../providers';

const NAV_ITEMS = [
  { label: 'Today',  href: '/today' },
  { label: 'Week',   href: '/week' },
  { label: 'Boards', href: '/boards' },
  { label: 'Lists',  href: '/lists' },
  { label: 'Stats',  href: '/stats' },
] as const;

// ─── Avatar Menu (Desktop) ─────────────────────────────────────────────────

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
    <div ref={ref} className="relative hidden md:block">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-7 h-7 rounded-full bg-accent text-white text-[11px] font-semibold flex items-center justify-center"
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

// ─── Mobile Avatar Sheet ───────────────────────────────────────────────────

function MobileAvatarSheet() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data: me } = useMe();
  const logout = useLogout();

  const initials = me?.name
    ? me.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : me?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        className="w-8 h-8 rounded-full bg-accent text-white text-xs font-semibold flex items-center justify-center"
        aria-label="Account menu"
      >
        {initials}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/30"
            onClick={() => setOpen(false)}
          />
          {/* Bottom sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-2xl border-t border-border shadow-xl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* User info */}
            <div className="px-5 pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent text-white text-sm font-semibold flex items-center justify-center">
                  {initials}
                </div>
                <div className="min-w-0">
                  {me?.name && (
                    <p className="text-sm font-medium text-primary truncate">{me.name}</p>
                  )}
                  <p className="text-xs text-secondary truncate">{me?.email}</p>
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="px-3 py-2 space-y-0.5">
              <button
                onClick={() => { router.push('/boards'); setOpen(false); }}
                className="w-full text-left px-3 py-2.5 text-sm text-primary hover:bg-surface-raised rounded-lg transition-colors"
              >
                Boards
              </button>
              <button
                onClick={() => { router.push('/settings'); setOpen(false); }}
                className="w-full text-left px-3 py-2.5 text-sm text-primary hover:bg-surface-raised rounded-lg transition-colors"
              >
                Settings
              </button>
            </div>

            {/* Theme + Sign out */}
            <div className="px-3 pb-6 pt-1 border-t border-border mt-1">
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm text-secondary">Theme</span>
                <ThemeToggle />
              </div>
              <button
                onClick={() => logout.mutate()}
                className="w-full text-left px-3 py-2.5 text-sm text-accent hover:bg-surface-raised rounded-lg transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Search Pill ───────────────────────────────────────────────────────────

function SearchPill() {
  const shortcutLabel = useShortcutLabel('K');

  return (
    <button
      onClick={() => {
        // Dispatch Cmd+K / Ctrl+K to open command palette if wired
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
      }}
      className="hidden md:flex items-center gap-2 px-3 py-1.5 border border-border rounded-full text-secondary hover:text-primary hover:border-border-strong transition-colors text-[13px]"
      aria-label="Search"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <kbd className="text-[11px] text-tertiary font-mono">{shortcutLabel}</kbd>
    </button>
  );
}

// ─── App Layout Inner ──────────────────────────────────────────────────────

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-page overflow-x-hidden">
      {/* Top header bar */}
      <header className="fixed top-0 left-0 right-0 z-40 min-h-[60px] pt-[env(safe-area-inset-top)] bg-surface border-b border-border flex items-center px-4 md:px-8">
        {/* Left: Logo + wordmark */}
        <Link href="/today" className="flex items-center gap-2 shrink-0">
          <LogoMark size={22} />
          <span className="text-[14px] font-semibold tracking-tight text-primary hidden sm:inline">
            Personal OS
          </span>
        </Link>

        {/* Centre: Nav tabs (desktop only) */}
        <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative px-3 py-2 text-[13.5px] font-medium transition-colors
                  ${isActive
                    ? 'text-accent'
                    : 'text-secondary hover:text-primary'
                  }
                `}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-accent rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Search + Theme + Avatar */}
        <div className="ml-auto flex items-center gap-3">
          <SearchPill />
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <AvatarMenu />
          <MobileAvatarSheet />
        </div>
      </header>

      {/* Main content area — no sidebar */}
      <main className="pt-[calc(60px+env(safe-area-inset-top))] min-h-screen">
        <div className="px-4 pt-4 pb-36 md:px-6 md:pt-6 md:pb-24">{children}</div>
      </main>

      {/* AI command bar */}
      <AICommandBar />

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* PWA install prompt */}
      <PWAInstallPrompt />
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
