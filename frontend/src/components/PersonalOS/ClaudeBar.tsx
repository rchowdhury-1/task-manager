import { useState, useRef, KeyboardEvent } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { usePersonalOS } from '../../contexts/PersonalOSContext';

export default function ClaudeBar() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pendingMessage, setPendingMessage] = useState('');
  const { refetch } = usePersonalOS();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = async (msg: string) => {
    if (!msg.trim() || loading) return;
    setLoading(true);
    setWarnings([]);
    try {
      const res = await api.post<{
        summary: string;
        warnings: string[];
        skipped: Array<{ op: unknown; reason: string }>;
      }>('/groq-update', { message: msg.trim() });
      const { summary, warnings: newWarnings, skipped } = res.data;
      await refetch();
      toast.success(summary || 'Done!', {
        duration: 4000,
        style: { background: '#fff', color: '#111827', border: '1px solid #E5E7EB' },
        iconTheme: { primary: '#10B981', secondary: '#fff' },
      });
      if (skipped && skipped.length > 0) {
        toast(`${skipped.length} operation${skipped.length > 1 ? 's' : ''} couldn't be applied`, {
          icon: '⚠️',
          duration: 5000,
          style: { background: '#fff', color: '#D97706', border: '1px solid #FDE68A' },
        });
      }
      if (newWarnings && newWarnings.length > 0) {
        setWarnings(newWarnings);
        setPendingMessage(msg);
      }
      setMessage('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toast.error(axiosErr.response?.data?.error || 'Something went wrong', {
        duration: 5000,
        style: { background: '#fff', color: '#DC2626', border: '1px solid #FECACA' },
      });
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

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 80)}px`;
  };

  return (
    <>
      {/* Warning banner */}
      {warnings.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
          <div
            className="w-full max-w-2xl rounded-xl border px-4 py-3 shadow-lg pointer-events-auto"
            style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}
          >
            <p className="text-sm font-medium mb-1" style={{ color: '#D97706' }}>Schedule conflict</p>
            {warnings.map((w, i) => (
              <p key={i} className="text-xs mb-0.5" style={{ color: '#6B7280' }}>{w}</p>
            ))}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { setWarnings([]); setPendingMessage(''); }}
                className="text-xs px-3 py-1 rounded-lg border transition-colors"
                style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setWarnings([]); submit(pendingMessage + ' [override confirmed]'); }}
                className="text-xs px-3 py-1 rounded-lg font-medium"
                style={{ background: '#F59E0B', color: '#fff' }}
              >
                Override & proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t px-4 flex items-center gap-3"
        style={{ background: '#FFFFFF', borderColor: '#F3F4F6' }}
      >
        {/* Sparkle icon */}
        <span className="text-lg shrink-0 select-none" style={{ color: '#EF4444' }}>✦</span>

        {/* Textarea */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Tell the AI what happened or what to schedule…"
            rows={1}
            disabled={loading}
            className="w-full resize-none rounded-xl px-4 py-2.5 text-sm border transition-colors"
            style={{
              maxHeight: '80px',
              lineHeight: '1.5',
              background: '#F9FAFB',
              borderColor: '#E5E7EB',
              color: '#111827',
              outline: 'none',
            }}
            onFocus={e => { e.target.style.borderColor = '#EF4444'; }}
            onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
          />
        </div>

        {/* Submit button */}
        <button
          onClick={() => submit(message)}
          disabled={loading || !message.trim()}
          className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
          style={{
            background: loading || !message.trim() ? '#F3F4F6' : '#EF4444',
            color: loading || !message.trim() ? '#9CA3AF' : '#fff',
          }}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-gray-300 border-t-red-400 rounded-full animate-spin" />
          ) : (
            'Update ↗'
          )}
        </button>
      </div>
    </>
  );
}
