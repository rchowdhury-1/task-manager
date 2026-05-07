import { useState, useRef, KeyboardEvent } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { usePersonalOS } from '../../contexts/PersonalOSContext';
import { ClaudeDiff } from '../../types/personalOS';

export default function ClaudeBar() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pendingMessage, setPendingMessage] = useState('');
  const { applyClaudeDiff, refetch } = usePersonalOS();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const submit = async (msg: string) => {
    if (!msg.trim() || loading) return;

    setLoading(true);
    setWarnings([]);
    try {
      const res = await api.post<{ operations_applied: ClaudeDiff['operations']; summary: string; warnings: string[] }>(
        '/claude-update',
        { message: msg.trim() }
      );

      const { operations_applied, summary, warnings: newWarnings } = res.data;

      // Full refetch handles all state updates; optimistic apply via context
      if (operations_applied && operations_applied.length > 0) {
        // The server already applied changes; we just trigger a refetch below
      }

      // Full refetch to be safe after create_task etc.
      await refetch();

      toast.success(summary || 'Done!', { duration: 4000 });

      if (newWarnings && newWarnings.length > 0) {
        setWarnings(newWarnings);
        setPendingMessage(msg);
      }

      setMessage('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const errorMsg = axiosErr.response?.data?.error || 'Something went wrong — try again';
      toast.error(errorMsg, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(message);
    }
  };

  return (
    <>
      {/* Warning banner */}
      {warnings.length > 0 && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl rounded-xl border px-4 py-3 shadow-lg"
          style={{ background: 'rgba(245,158,11,0.15)', borderColor: '#f59e0b' }}
        >
          <p className="text-sm font-medium mb-2" style={{ color: '#f59e0b' }}>Schedule conflict</p>
          {warnings.map((w, i) => (
            <p key={i} className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{w}</p>
          ))}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { setWarnings([]); setPendingMessage(''); }}
              className="text-xs px-3 py-1 rounded border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => { setWarnings([]); submit(pendingMessage + ' [override confirmed]'); }}
              className="text-xs px-3 py-1 rounded font-medium"
              style={{ background: '#f59e0b', color: '#000' }}
            >
              Override & proceed
            </button>
          </div>
        </div>
      )}

      {/* Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t px-4 py-3"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-screen-xl mx-auto flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell Claude what to update… (e.g. 'move the LMS task to in progress, log 2 hours')"
              rows={1}
              disabled={loading}
              className="w-full resize-none rounded-xl px-4 py-3 text-sm border transition-colors"
              style={{
                background: 'var(--bg-2)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
                maxHeight: '120px',
                lineHeight: '1.5',
              }}
            />
            <span className="absolute right-3 bottom-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              ↵ send
            </span>
          </div>
          <button
            onClick={() => submit(message)}
            disabled={loading || !message.trim()}
            className="px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
            style={{
              background: loading || !message.trim() ? 'rgba(16,185,129,0.3)' : 'var(--primary)',
              color: '#fff',
            }}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              'Update ↗'
            )}
          </button>
        </div>
      </div>
    </>
  );
}
