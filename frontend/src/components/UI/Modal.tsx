import { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, children, title, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`w-full ${sizes[size]} rounded-xl shadow-2xl border`}
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {title && (
          <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
}
