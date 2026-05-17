import { LogoMark } from '@/components/LogoMark';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-page px-4 py-12 relative overflow-hidden">
      {/* Subtle accent gradient */}
      <div className="absolute inset-x-0 top-0 h-[40vh] bg-[radial-gradient(ellipse_at_top,var(--color-crimson-soft)_0%,transparent_70%)] opacity-40 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo + wordmark */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <LogoMark size={36} />
          <span className="text-lg font-semibold tracking-tight text-primary">
            Personal OS
          </span>
        </div>

        {children}

        {/* Footer links */}
        <p className="text-center text-xs text-tertiary mt-8">
          <Link href="/terms" className="hover:text-secondary transition-colors">Terms</Link>
          {' · '}
          <Link href="/privacy" className="hover:text-secondary transition-colors">Privacy</Link>
        </p>
      </div>
    </main>
  );
}
