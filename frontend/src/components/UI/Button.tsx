import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-emerald-500 hover:bg-emerald-600 text-white focus:ring-emerald-500 focus:ring-offset-gray-900',
    secondary: 'border border-emerald-500/20 text-slate-300 hover:bg-white/5 focus:ring-emerald-500 focus:ring-offset-gray-900',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 focus:ring-red-500 focus:ring-offset-gray-900',
    ghost: 'text-slate-400 hover:text-slate-200 hover:bg-white/5 focus:ring-emerald-500 focus:ring-offset-gray-900',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-3',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
