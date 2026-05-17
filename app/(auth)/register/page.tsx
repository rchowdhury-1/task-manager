'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { registerSchema } from '@/lib/validation/auth';

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
};

export default function RegisterPage() {
  useEffect(() => { document.title = 'Create account · Personal OS'; }, []);

  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = registerSchema.safeParse({ email, password, name: name || undefined });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, name: name || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Registration failed');
        return;
      }

      router.push('/today');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="bg-surface border border-border rounded-xl shadow-sm p-6 md:p-10"
    >
      {/* Eyebrow */}
      <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-tertiary text-center mb-3">
        Get started
      </p>

      {/* Editorial heading */}
      <h1 className="font-display text-[28px] md:text-[36px] leading-[1.05] tracking-tight text-primary text-center">
        Start your <span className="italic text-accent">daily rhythm.</span>
      </h1>

      <p className="text-[14px] text-secondary text-center mt-2 mb-8">
        Free 90-day trial. No card required.
      </p>

      {/* Error */}
      {error && (
        <div className="bg-[var(--color-crimson-soft)] border border-[var(--color-crimson-line)] rounded-lg p-3 mb-5">
          <p className="text-sm text-primary">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-secondary block mb-1.5">
            Name <span className="normal-case tracking-normal text-tertiary">(optional)</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-3 text-[15px] bg-surface border border-border rounded-lg text-primary placeholder:text-tertiary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition disabled:opacity-60"
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="email" className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-secondary block mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
            required
            className="w-full px-4 py-3 text-[15px] bg-surface border border-border rounded-lg text-primary placeholder:text-tertiary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition disabled:opacity-60"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-secondary block mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
            required
            minLength={8}
            className="w-full px-4 py-3 text-[15px] bg-surface border border-border rounded-lg text-primary placeholder:text-tertiary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition disabled:opacity-60"
            placeholder="Min 8 characters"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 text-[14px] font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating account\u2026' : 'Create account \u2192'}
        </button>
      </form>

      <p className="text-[13px] text-secondary text-center mt-5">
        Already have an account?{' '}
        <Link href="/login" className="text-accent hover:underline">Sign in</Link>
      </p>
    </motion.div>
  );
}
