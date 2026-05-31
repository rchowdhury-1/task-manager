export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-page px-6 text-center">
      <div className="max-w-sm">
        <div className="mb-6 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-raised">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-tertiary">
            <path d="M1 1l22 22" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-text-tertiary mb-3">
          You&apos;re offline
        </p>
        <h1 className="font-display text-[32px] leading-tight tracking-display mb-3">
          Personal OS needs a connection to sync.
        </h1>
        <p className="text-text-secondary">
          Once you&apos;re back online, your tasks and habits will update automatically.
        </p>
      </div>
    </main>
  );
}
