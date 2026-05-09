'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const SHORTCUTS: { key: string; label: string; scope?: string }[] = [
  { key: '?', label: 'Open this help dialog' },
  { key: '⌘ J', label: 'Toggle AI Command Bar' },
  { key: '⌘ K', label: 'Open Command Palette' },
  { key: 'Esc', label: 'Close panel / modal' },
  { key: '←', label: 'Previous week', scope: 'Week' },
  { key: '→', label: 'Next week', scope: 'Week' },
  { key: 'T', label: 'Go to current week', scope: 'Week' },
  { key: 'V', label: 'Toggle calendar/stack view', scope: 'Week' },
];

export function KeyboardHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="relative bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-primary">Keyboard Shortcuts</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-md hover:bg-surface-raised text-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          {SHORTCUTS.map(s => (
            <div key={s.key} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-primary">
                {s.label}
                {s.scope && (
                  <span className="text-xs text-tertiary ml-1.5">({s.scope})</span>
                )}
              </span>
              <kbd className="px-2 py-0.5 text-xs font-mono bg-surface-raised border border-border rounded text-secondary">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="text-xs text-tertiary mt-4 text-center">
          Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-surface-raised border border-border rounded">?</kbd> to toggle this dialog
        </p>
      </div>
    </div>
  );
}
