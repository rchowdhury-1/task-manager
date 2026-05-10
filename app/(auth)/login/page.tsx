'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loginSchema } from '@/lib/validation/auth';

export default function LoginPage() {
  useEffect(() => { document.title = 'Sign in · Personal OS'; }, []);

  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Login failed');
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
    <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border shadow-sm p-6 space-y-4">
      <h2 className="text-lg font-semibold text-primary text-center">Sign in</h2>

      {error && (
        <p className="text-sm text-p1 text-center">{error}</p>
      )}

      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-primary">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-primary">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="text-sm text-secondary text-center">
        No account?{' '}
        <Link href="/register" className="text-accent hover:underline">Register</Link>
      </p>
    </form>
  );
}
