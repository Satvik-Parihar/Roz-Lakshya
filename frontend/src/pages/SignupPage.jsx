import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import api from '../api/axios';
import PriorityHeader from '../components/PriorityHeader';

export default function SignupPage() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const nextErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!companyName.trim()) nextErrors.companyName = 'Company name is required.';
    if (!adminName.trim()) nextErrors.adminName = 'Admin name is required.';
    if (!emailRegex.test(adminEmail.trim())) nextErrors.adminEmail = 'Enter a valid admin email address.';
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
        company_name: companyName,
        company_domain: companyDomain || undefined,
        admin_name: adminName,
        admin_email: adminEmail,
        password,
      });

      localStorage.setItem('access_token', res.data.access_token);
      localStorage.setItem('must_reset_password', 'false');
      navigate('/dashboard');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setApiError(typeof detail === 'string' ? detail : 'Admin registration failed.');
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
        <section className="w-full max-w-lg rounded-xl border border-[color:var(--outline-variant)]/60 bg-[color:var(--surface-container-lowest)] p-8 shadow-sm md:p-9">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-3xl text-[color:var(--primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>
                dataset
              </span>
              <span className="font-headline text-xl font-bold tracking-tight text-[color:var(--on-surface)]">Roz-Lakshya</span>
            </div>
            <h1 className="font-headline text-3xl font-bold tracking-tight text-[color:var(--on-surface)]">
              Register Company Admin
            </h1>
            <p className="mt-2 text-sm text-[color:var(--on-surface-variant)]">
              This signup is only for first-time admin company setup. Employees are added later by admin.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[color:var(--on-surface-variant)]">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Operations"
                className="mt-1 w-full rounded-lg border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-3 py-2.5 text-sm text-[color:var(--on-surface)] outline-none transition-colors focus:border-[color:var(--primary)] focus:ring-1 focus:ring-[color:var(--primary)]"
              />
              {errors.companyName && <p className="mt-1 text-xs text-red-500">{errors.companyName}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[color:var(--on-surface-variant)]">Company Domain (optional)</label>
              <input
                type="text"
                value={companyDomain}
                onChange={(e) => setCompanyDomain(e.target.value)}
                placeholder="acme.com"
                className="mt-1 w-full rounded-lg border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-3 py-2.5 text-sm text-[color:var(--on-surface)] outline-none transition-colors focus:border-[color:var(--primary)] focus:ring-1 focus:ring-[color:var(--primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[color:var(--on-surface-variant)]">Admin Name</label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Jane Doe"
                className="mt-1 w-full rounded-lg border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-3 py-2.5 text-sm text-[color:var(--on-surface)] outline-none transition-colors focus:border-[color:var(--primary)] focus:ring-1 focus:ring-[color:var(--primary)]"
              />
              {errors.adminName && <p className="mt-1 text-xs text-red-500">{errors.adminName}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[color:var(--on-surface-variant)]">Admin Email</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@acme.com"
                className="mt-1 w-full rounded-lg border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-3 py-2.5 text-sm text-[color:var(--on-surface)] outline-none transition-colors focus:border-[color:var(--primary)] focus:ring-1 focus:ring-[color:var(--primary)]"
              />
              {errors.adminEmail && <p className="mt-1 text-xs text-red-500">{errors.adminEmail}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[color:var(--on-surface-variant)]">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-3 py-2.5 pr-10 text-sm text-[color:var(--on-surface)] outline-none transition-colors focus:border-[color:var(--primary)] focus:ring-1 focus:ring-[color:var(--primary)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 text-[color:var(--on-surface-variant)]"
                >
                  <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[color:var(--on-surface-variant)]">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-lg border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-3 py-2.5 text-sm text-[color:var(--on-surface)] outline-none transition-colors focus:border-[color:var(--primary)] focus:ring-1 focus:ring-[color:var(--primary)]"
              />
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
            </div>

            <label className="flex items-start gap-2 rounded-lg border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-low)] p-3 text-xs text-[color:var(--on-surface-variant)]">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[color:var(--outline-variant)]"
              />
              <span>
                I agree to the{' '}
                <Link to="/terms" className="font-semibold text-[color:var(--primary)] hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="font-semibold text-[color:var(--primary)] hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {errors.terms && <p className="-mt-2 text-xs text-red-500">{errors.terms}</p>}

            {apiError && <p className="text-xs text-red-500">{apiError}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[color:var(--on-surface)] py-2.5 text-sm font-medium text-[color:var(--surface-container-lowest)] transition-colors hover:bg-[color:var(--inverse-surface)] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Registering...' : 'Register Admin'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-[color:var(--on-surface-variant)]">
            Already registered? <Link to="/login" className="ml-1 font-semibold text-[color:var(--primary)] hover:underline">Log in</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
