import { useState, useRef, useEffect } from 'react';

interface AddTaskFormProps {
  onAdd: (title: string) => void;
  onCancel: () => void;
}

export function AddTaskForm({ onAdd, onCancel }: AddTaskFormProps) {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setTitle('');
  };

  return (
    <div className="bg-slate-700/50 rounded-xl p-3 border border-slate-600 mt-2">
      <textarea
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
          if (e.key === 'Escape') onCancel();
        }}
        placeholder="Task title..."
        rows={2}
        className="w-full bg-transparent text-slate-100 text-sm placeholder-slate-500 resize-none focus:outline-none"
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleSubmit}
          disabled={!title.trim()}
          className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-xs font-medium transition-colors"
        >
          Add task
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg text-xs transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
