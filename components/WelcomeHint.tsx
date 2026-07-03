'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Sparkles } from 'lucide-react';
import { useCategories } from '@/lib/api/hooks';

const STORAGE_KEY = 'pos-welcome-hint-dismissed';

// First-run onboarding card. Shown until dismissed; dismissal persists in
// localStorage so it never reappears on this device.
export function WelcomeHint() {
  const { data: categories } = useCategories();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // storage unavailable (private mode) — keep hidden rather than nag forever
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  };

  if (!visible) return null;

  const topicLabels = categories?.map(c => c.label).join(', ');

  return (
    <div className="relative bg-surface border border-border rounded-xl p-4 md:p-5">
      <button
        onClick={dismiss}
        aria-label="Dismiss welcome hint"
        className="absolute top-3 right-3 p-1 rounded-md text-tertiary hover:text-primary hover:bg-surface-raised transition-colors"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3">
        <span className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
          <Sparkles size={16} />
        </span>
        <div className="space-y-1.5 pr-6">
          <p className="text-sm font-semibold text-primary">Welcome to Personal OS</p>
          <ol className="text-[13px] text-secondary space-y-1 list-decimal list-inside">
            <li>
              {topicLabels
                ? <>Your account starts with starter topics ({topicLabels}) — rename or delete them, and create your own in{' '}</>
                : <>Organise tasks into topics — create yours in{' '}</>}
              <Link href="/lists" className="text-accent hover:underline font-medium">Lists</Link>.
            </li>
            <li>Add a task above — try <span className="font-mono text-[12px] bg-surface-raised px-1 py-0.5 rounded">Call dentist #errands tomorrow !1</span>.</li>
            <li>Or just tell the AI bar below what you need — it can create, schedule, and complete things for you.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
