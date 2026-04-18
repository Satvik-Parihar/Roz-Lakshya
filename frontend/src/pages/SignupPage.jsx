import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import api from '../api/axios';
import PriorityHeader from '../components/PriorityHeader';

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Team Member');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const nextErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name.trim()) nextErrors.name = 'Full name is required.';
    if (!emailRegex.test(email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (password.length < 8) nextErrors.password = 'Password must be at least 8 characters.';
    if (confirmPassword !== password) nextErrors.confirmPassword = 'Passwords do not match.';
    if (!acceptedTerms) nextErrors.terms = 'You must accept Terms and Privacy Policy.';

    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    try {
      const res = await api.post('/users/signup', {
        name,
        email,
        password,
        role,
      });

      localStorage.setItem('access_token', res.data.access_token);
      navigate('/dashboard');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setApiError(typeof detail === 'string' ? detail : 'Account creation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[color:var(--surface-container-lowest)]">
      <PriorityHeader />

      <div className="pointer-events-none absolute -left-10 top-20 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-lime-200/30 blur-3xl" />

      <main className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-10">
        <section className="w-full max-w-sm rounded-xl border border-[color:var(--outline-variant)]/60 bg-[color:var(--surface-container-lowest)] p-7 shadow-sm">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[color:var(--on-surface)] text-[color:var(--surface-container-lowest)]">
                <span className="material-symbols-outlined text-base">token</span>
              </div>
              <span className="font-headline text-xl font-bold tracking-tight text-[color:var(--on-surface)]">Roz-Lakshya</span>
            </div>
            <h1 className="font-headline text-3xl font-bold tracking-tight text-[color:var(--on-surface)]">Create your account</h1>
            <p className="mt-2 text-sm text-[color:var(--on-surface-variant)]">No credit card required. Setup takes less than a minute.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-xs font-medium uppercase tracking-wider text-[color:var(--on-surface-variant)]">Full Name</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className="mt-1 w-full rounded-lg border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-3 py-2.5 text-sm text-[color:var(--on-surface)] outline-none transition-colors focus:border-[color:var(--primary)] focus:ring-1 focus:ring-[color:var(--primary)]" />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wider text-[color:var(--on-surface-variant)]">Email Address</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" className="mt-1 w-full rounded-lg border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-3 py-2.5 text-sm text-[color:var(--on-surface)] outline-none transition-colors focus:border-[color:var(--primary)] focus:ring-1 focus:ring-[color:var(--primary)]" />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider text-[color:var(--on-surface-variant)]">Password</label>
              <div className="relative mt-1">
                <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-lg border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-3 py-2.5 pr-10 text-sm text-[color:var(--on-surface)] outline-none transition-colors focus:border-[color:var(--primary)] focus:ring-1 focus:ring-[color:var(--primary)]" />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute inset-y-0 right-0 px-3 text-[color:var(--on-surface-variant)]">
                  <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              <p className="mt-1 text-xs text-[color:var(--on-surface-variant)]">Use at least 8 characters with one number.</p>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-xs font-medium uppercase tracking-wider text-[color:var(--on-surface-variant)]">Confirm Password</label>
              <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="mt-1 w-full rounded-lg border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-3 py-2.5 text-sm text-[color:var(--on-surface)] outline-none transition-colors focus:border-[color:var(--primary)] focus:ring-1 focus:ring-[color:var(--primary)]" />
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
            </div>

            <div>
              <label htmlFor="role" className="block text-xs font-medium uppercase tracking-wider text-[color:var(--on-surface-variant)]">Role</label>
              <div className="relative mt-1">
                <select id="role" value={role} onChange={(e) => setRole(e.target.value)} className="w-full appearance-none rounded-lg border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-3 py-2.5 text-sm text-[color:var(--on-surface)] outline-none transition-colors focus:border-[color:var(--primary)] focus:ring-1 focus:ring-[color:var(--primary)]">
                  <option>Team Member</option>
                  <option>Manager</option>
                  <option>Subject Teacher</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute inset-y-0 right-3 flex items-center text-lg text-[color:var(--on-surface-variant)]">expand_more</span>
              </div>
            </div>

            <label className="flex items-start gap-2 rounded-lg border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-low)] p-3 text-xs text-[color:var(--on-surface-variant)]">
              <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-[color:var(--outline-variant)]" />
              <span>
                I agree to the <a href="#" className="font-medium text-[color:var(--primary)] hover:underline">Terms of Service</a> and <a href="#" className="font-medium text-[color:var(--primary)] hover:underline">Privacy Policy</a>.
              </span>
            </label>
            {errors.terms && <p className="-mt-2 text-xs text-red-500">{errors.terms}</p>}

            {apiError && <p className="text-xs text-red-500">{apiError}</p>}

            <button type="submit" disabled={loading} className="w-full rounded-lg bg-[color:var(--on-surface)] py-2.5 text-sm font-medium text-[color:var(--surface-container-lowest)] transition-colors hover:bg-[color:var(--inverse-surface)] disabled:opacity-70 disabled:cursor-not-allowed">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[color:var(--outline-variant)]/50" />
            <span className="text-xs uppercase tracking-widest text-[color:var(--on-surface-variant)]">or</span>
            <div className="h-px flex-1 bg-[color:var(--outline-variant)]/50" />
          </div>

          <button type="button" className="flex w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] py-2.5 text-sm font-medium text-[color:var(--on-surface)] hover:bg-[color:var(--surface-container-low)]">
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
              <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
              <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
              <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
            </svg>
            Continue with Google
          </button>

          <p className="mt-4 text-center text-sm text-[color:var(--on-surface-variant)]">
            Already have an account?
            <Link to="/login" className="ml-1 font-semibold text-[color:var(--primary)] hover:underline">Log in</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
