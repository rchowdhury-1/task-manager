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
      const res = await api.post<{ summary: string; warnings: string[] }>(
        '/claude-update',
        { message: msg.trim() }
      );
      const { summary, warnings: newWarnings } = res.data;
      await refetch();
      toast.success(summary || 'Done!', {
        duration: 4000,
        style: { background: '#2C2C2E', color: '#F5F5F7', border: '1px solid #48484A' },
        iconTheme: { primary: '#4ADE80', secondary: '#1C1C1E' },
      });
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
        style: { background: '#2C2C2E', color: '#F5F5F7', border: '1px solid #E24B4A' },
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
    // Auto-expand up to 3 rows
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
            className="w-full max-w-2xl rounded-xl border px-4 py-3 shadow-xl pointer-events-auto"
            style={{ background: 'rgba(239,159,39,0.1)', borderColor: '#EF9F27' }}
          >
            <p className="text-sm font-medium mb-1" style={{ color: '#EF9F27' }}>
              Schedule conflict
            </p>
            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-[#98989F] mb-0.5">{w}</p>
            ))}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { setWarnings([]); setPendingMessage(''); }}
                className="text-xs px-3 py-1 rounded-lg border border-[#48484A] text-[#98989F] hover:text-[#F5F5F7] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setWarnings([]);
                  submit(pendingMessage + ' [override confirmed]');
                }}
                className="text-xs px-3 py-1 rounded-lg font-medium"
                style={{ background: '#EF9F27', color: '#000' }}
              >
                Override & proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-[#48484A] px-4 flex items-center gap-3"
        style={{ background: '#2C2C2E' }}
      >
        {/* Sparkle icon */}
        <span className="text-[#C084FC] text-lg shrink-0 select-none">✦</span>

        {/* Textarea */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Tell Claude what happened or what to schedule…"
            rows={1}
            disabled={loading}
            className="w-full resize-none rounded-xl px-4 py-2.5 text-sm border border-[#48484A] bg-[#3A3A3C] text-[#F5F5F7] placeholder-[#98989F] focus:outline-none focus:border-[#C084FC] transition-colors"
            style={{ maxHeight: '80px', lineHeight: '1.5' }}
          />
        </div>

        {/* Submit button */}
        <button
          onClick={() => submit(message)}
          disabled={loading || !message.trim()}
          className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
          style={{
            background: loading || !message.trim() ? 'rgba(192,132,252,0.3)' : '#C084FC',
            color: loading || !message.trim() ? '#98989F' : '#000',
          }}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-[#98989F] border-t-transparent rounded-full animate-spin" />
          ) : (
            'Update ↗'
          )}
        </button>
      </div>
    </>
  );
}
