import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import PriorityHeader from '../components/PriorityHeader';
import { clearRememberedEmail, getRememberedEmail, setAuthSession, setRememberedEmail } from '../utils/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => getRememberedEmail());
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => Boolean(getRememberedEmail()));
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await api.post('/users/login', {
        email: normalizedEmail,
        password,
      });

      setAuthSession({
        token: response.data.access_token,
        mustResetPassword: Boolean(response.data.must_reset_password),
        persist: rememberMe,
      });

      if (rememberMe) {
        setRememberedEmail(normalizedEmail);
      } else {
        clearRememberedEmail();
      }

      if (response.data.must_reset_password) {
        navigate('/reset-password');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-transparent">
      <PriorityHeader />

      <div className="pointer-events-none absolute right-8 top-20 h-52 w-52 rounded-full bg-sky-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-lime-200/30 blur-3xl" />

      <main className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-xl border border-[color:var(--outline-variant)]/60 bg-[color:var(--surface-container-lowest)] p-8 shadow-sm md:p-9">
          <div className="mb-7 text-center">
            <div className="mb-4 inline-flex items-center gap-2">
              <img
                src="/roz-lakshya-auth-logo.webp"
                alt="Roz-Lakshya logo"
                className="h-10 w-auto object-contain"
              />
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
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-[color:var(--outline-variant)]"
                />
                Remember me
              </label>
              <a href="#" className="font-medium text-[color:var(--primary)] hover:underline">Forgot password?</a>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-[color:var(--on-surface)] py-2.5 text-sm font-medium text-[color:var(--on-primary)] transition-colors hover:bg-[color:var(--inverse-surface)] disabled:opacity-60">
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[color:var(--on-surface-variant)]">
            Employee accounts are created by your admin.{' '}
            <Link to="/signup" className="font-medium text-[color:var(--primary)] hover:underline">Register company (admin)</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
