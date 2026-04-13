import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import Button from '../components/UI/Button';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill in all fields');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
      toast.success('Welcome back!');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animated-gradient">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-black text-lg" style={{ background: 'var(--primary)' }}>T</div>
            <span className="text-xl font-black" style={{ color: 'var(--text)' }}>TaskFlow</span>
          </Link>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Welcome back</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Sign in to your account</p>
        </div>

        <div className="rounded-2xl border p-8" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-lg text-sm border focus:border-emerald-500 transition-colors"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg text-sm border focus:border-emerald-500 transition-colors"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                autoComplete="current-password"
                required
              />
            </div>

            <Button type="submit" loading={loading} className="w-full py-3" size="lg">
              Sign in
            </Button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="font-medium hover:underline" style={{ color: 'var(--primary)' }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
