import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import PriorityHeader from '../components/PriorityHeader';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await api.post('/users/login', {
        email,
        password,
      });

      localStorage.setItem('access_token', response.data.access_token);
      navigate('/dashboard');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[color:var(--surface)]">
      <PriorityHeader />

      <div className="pointer-events-none absolute right-8 top-20 h-52 w-52 rounded-full bg-sky-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-lime-200/30 blur-3xl" />

      <main className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-10">
        <section className="w-full max-w-sm rounded-xl border border-[color:var(--outline-variant)]/60 bg-[color:var(--surface-container-lowest)] p-7 shadow-sm">
          <div className="mb-7 text-center">
            <div className="mb-4 inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-3xl text-[color:var(--primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>
                dataset
              </span>
              <span className="font-headline text-xl font-bold tracking-tight text-[color:var(--on-surface)]">Roz-Lakshya</span>
            </div>
            <h1 className="font-headline text-2xl font-bold text-[color:var(--on-surface)]">Welcome back</h1>
            <p className="mt-1 text-sm text-[color:var(--on-surface-variant)]">Sign in to continue</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wider text-[color:var(--on-surface-variant)]">Email</label>
              <div className="relative mt-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[color:var(--on-surface-variant)]">mail</span>
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="w-full rounded-md border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] py-2.5 pl-10 pr-3 text-sm text-[color:var(--on-surface)] outline-none transition-colors focus:border-[color:var(--primary)] focus:ring-1 focus:ring-[color:var(--primary)]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider text-[color:var(--on-surface-variant)]">Password</label>
              <div className="relative mt-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[color:var(--on-surface-variant)]">lock</span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full rounded-md border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] py-2.5 pl-10 pr-10 text-sm text-[color:var(--on-surface)] outline-none transition-colors focus:border-[color:var(--primary)] focus:ring-1 focus:ring-[color:var(--primary)]"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--on-surface-variant)]"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  <span className="material-symbols-outlined text-lg">visibility</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2 text-[color:var(--on-surface-variant)]">
                <input type="checkbox" className="h-4 w-4 rounded border-[color:var(--outline-variant)]" />
                Remember me
              </label>
              <a href="#" className="font-medium text-[color:var(--primary)] hover:underline">Forgot password?</a>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-[color:var(--on-surface)] py-2.5 text-sm font-medium text-[color:var(--on-primary)] transition-colors hover:bg-[color:var(--inverse-surface)] disabled:opacity-60">
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[color:var(--outline-variant)]/50" />
            <span className="text-sm text-[color:var(--on-surface-variant)]">or</span>
            <div className="h-px flex-1 bg-[color:var(--outline-variant)]/50" />
          </div>

          <button type="button" className="flex w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-highest)] py-2.5 text-sm font-medium text-[color:var(--on-surface)] transition-colors hover:bg-[color:var(--surface-variant)]">
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <p className="mt-6 text-center text-sm text-[color:var(--on-surface-variant)]">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-medium text-[color:var(--primary)] hover:underline">Sign up</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
