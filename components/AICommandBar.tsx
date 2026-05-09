'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useAICommand } from '@/lib/api/hooks';

// ─── Sparkle Icon ───────────────────────────────────────────────────────────

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
    </svg>
  );
}

// ─── Send Icon ──────────────────────────────────────────────────────────────

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface AIResponse {
  summary: string;
  operations_executed: number;
  warnings: string[];
  tokens_used: number;
  duration_ms: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AICommandBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const aiCommand = useAICommand();

  const open = useCallback(() => {
    setIsOpen(true);
    setResponse(null);
    setError(null);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setMessage('');
    setResponse(null);
    setError(null);
  }, []);

  const clearResponse = useCallback(() => {
    setResponse(null);
    setError(null);
    setMessage('');
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  // Cmd+K to open/close (separate from CommandPalette's Cmd+K)
  // CommandPalette already uses Cmd+K — we use Cmd+J for the AI bar
  // to avoid conflict. The pill label shows ⌘J.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setIsOpen(prev => {
          if (!prev) {
            setResponse(null);
            setError(null);
          }
          return !prev;
        });
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        close();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, close]);

  // Auto-focus textarea on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    }
  }, [message]);

  const handleSubmit = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed || aiCommand.isPending) return;

    setError(null);
    setResponse(null);

    aiCommand.mutate(trimmed, {
      onSuccess: (data) => setResponse(data),
      onError: (err) => {
        const msg = err instanceof Error ? err.message : 'Something went wrong';
        setError(msg);
        toast.error(msg);
      },
    });
  }, [message, aiCommand]);

  // ─── Collapsed: Desktop pill ──────────────────────────────────────────

  if (!isOpen) {
    return (
      <>
        {/* Desktop pill */}
        <div className="hidden md:flex fixed bottom-0 left-[170px] right-0 justify-center pb-4 pointer-events-none z-30">
          <button
            onClick={open}
            className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 bg-surface border border-border rounded-full shadow-md hover:shadow-lg hover:border-accent transition-all text-sm font-medium text-secondary hover:text-primary"
          >
            <SparkleIcon className="w-4 h-4 text-accent" />
            <span>AI Command</span>
            <kbd className="ml-1 text-[11px] text-tertiary border border-border rounded px-1.5 py-0.5 font-mono">
              ⌘J
            </kbd>
          </button>
        </div>

        {/* Mobile bar */}
        <div className="md:hidden fixed bottom-14 left-0 right-0 z-30 px-3 pb-2">
          <button
            onClick={open}
            className="w-full flex items-center gap-3 px-4 py-3 bg-accent text-white rounded-xl shadow-lg"
          >
            <SparkleIcon className="w-4 h-4" />
            <span className="flex-1 text-left text-sm font-medium">Ask AI to schedule or summarize.</span>
            <SendIcon className="w-4 h-4 opacity-70" />
          </button>
        </div>
      </>
    );
  }

  // ─── Expanded ─────────────────────────────────────────────────────────

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="md:hidden fixed inset-0 z-40 bg-black/30"
        onClick={close}
      />

      {/* Desktop expanded bar */}
      <div className="hidden md:flex fixed bottom-0 left-[170px] right-0 justify-center pb-4 pointer-events-none z-50">
        <div
          ref={panelRef}
          className="pointer-events-auto w-full max-w-[600px] bg-surface border border-border rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Input area */}
          <div className="flex items-start gap-3 px-4 pt-3 pb-2">
            <SparkleIcon className="w-4 h-4 text-accent mt-1.5 shrink-0" />
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ask AI to create tasks, reschedule, summarize…"
              rows={1}
              className="flex-1 bg-transparent text-sm text-primary placeholder:text-tertiary resize-none outline-none min-h-[36px] max-h-[160px] py-1.5"
            />
            <div className="flex items-center gap-1.5 mt-1">
              <button
                onClick={handleSubmit}
                disabled={!message.trim() || aiCommand.isPending}
                className="p-2 rounded-lg bg-accent text-white disabled:opacity-40 hover:bg-accent/90 transition-colors"
                aria-label="Submit"
              >
                {aiCommand.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <SendIcon className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={close}
                className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-surface-raised transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Response / Error */}
          {(response || error) && (
            <div className="border-t border-border px-4 py-3">
              {error && (
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-p1 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4m0 4h.01" />
                  </svg>
                  <p className="text-sm text-p1">{error}</p>
                </div>
              )}
              {response && <ResponseDisplay response={response} onClear={clearResponse} />}
            </div>
          )}
        </div>
      </div>

      {/* Mobile expanded sheet */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-surface rounded-t-2xl border-t border-border shadow-xl">
          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Input area */}
          <div className="flex items-start gap-3 px-4 pt-1 pb-2">
            <SparkleIcon className="w-4 h-4 text-accent mt-1.5 shrink-0" />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ask AI to create tasks, reschedule…"
              rows={2}
              className="flex-1 bg-transparent text-sm text-primary placeholder:text-tertiary resize-none outline-none min-h-[50px] max-h-[120px] py-1.5"
            />
            <div className="flex flex-col items-center gap-1.5 mt-1">
              <button
                onClick={handleSubmit}
                disabled={!message.trim() || aiCommand.isPending}
                className="p-2.5 rounded-lg bg-accent text-white disabled:opacity-40"
                aria-label="Submit"
              >
                {aiCommand.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <SendIcon className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={close}
                className="p-1 text-secondary"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Response / Error */}
          {(response || error) && (
            <div className="border-t border-border px-4 py-3 max-h-[40vh] overflow-y-auto">
              {error && (
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-p1 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4m0 4h.01" />
                  </svg>
                  <p className="text-sm text-p1">{error}</p>
                </div>
              )}
              {response && <ResponseDisplay response={response} onClear={clearResponse} />}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Response Display ───────────────────────────────────────────────────────

function ResponseDisplay({
  response,
  onClear,
}: {
  response: AIResponse;
  onClear: () => void;
}) {
  return (
    <div className="space-y-2">
      {/* Summary */}
      <div className="flex items-start gap-2">
        <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <p className="text-sm text-primary">{response.summary}</p>
      </div>

      {/* Operations */}
      {response.operations_executed > 0 && (
        <p className="text-xs text-secondary ml-6">
          {response.operations_executed} operation{response.operations_executed !== 1 ? 's' : ''} executed
        </p>
      )}

      {/* Warnings */}
      {response.warnings.length > 0 && (
        <div className="ml-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5">
          <ul className="space-y-1">
            {response.warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                <span className="shrink-0">⚠</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Meta + Clear */}
      <div className="flex items-center justify-between ml-6">
        <span className="text-[10px] text-tertiary">
          {response.duration_ms}ms
        </span>
        <button
          onClick={onClear}
          className="text-xs text-accent hover:underline"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
