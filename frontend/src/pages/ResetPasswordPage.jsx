import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../api/axios';
import PriorityHeader from '../components/PriorityHeader';
import { setMustResetPassword } from '../utils/auth';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/users/reset-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });

      setMustResetPassword(false);
      setSuccess('Password reset successful. Redirecting to dashboard...');
      window.setTimeout(() => navigate('/dashboard'), 700);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Password reset failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[color:var(--surface)]">
      <PriorityHeader />

      <main className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-10">
        <section className="w-full max-w-sm rounded-xl border border-[color:var(--outline-variant)]/60 bg-[color:var(--surface-container-lowest)] p-7 shadow-sm">
          <h1 className="font-headline text-2xl font-bold text-[color:var(--on-surface)]">Reset Password</h1>
          <p className="mt-1 text-sm text-[color:var(--on-surface-variant)]">
            First-time login detected. Please set a new password to continue.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[color:var(--on-surface-variant)]">
                Current Password
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] py-2.5 px-3 text-sm text-[color:var(--on-surface)] outline-none focus:border-[color:var(--primary)] focus:ring-1 focus:ring-[color:var(--primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[color:var(--on-surface-variant)]">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] py-2.5 px-3 text-sm text-[color:var(--on-surface)] outline-none focus:border-[color:var(--primary)] focus:ring-1 focus:ring-[color:var(--primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[color:var(--on-surface-variant)]">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] py-2.5 px-3 text-sm text-[color:var(--on-surface)] outline-none focus:border-[color:var(--primary)] focus:ring-1 focus:ring-[color:var(--primary)]"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[color:var(--on-surface)] py-2.5 text-sm font-medium text-[color:var(--surface-container-lowest)] transition-colors hover:bg-[color:var(--inverse-surface)] disabled:opacity-60"
            >
              {submitting ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
