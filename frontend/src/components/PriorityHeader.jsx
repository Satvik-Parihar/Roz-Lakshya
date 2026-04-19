import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { usersApi } from '../api/taskApi';
import { getAuthSnapshot } from '../utils/auth';

const appLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/tasks', label: 'Task Board' },
  { to: '/plan', label: 'My Plan' },
  { to: '/complaints', label: 'Complaints' },
];

function navClass({ isActive }) {
  return `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? 'border border-[color:var(--primary)] bg-[color:var(--primary)]/15 text-[color:var(--on-surface)] shadow-sm'
      : 'text-[color:var(--on-surface-variant)] hover:bg-[color:var(--surface-container-low)] hover:text-[color:var(--on-surface)]'
  }`;
}

function marketingNavClass({ isActive }) {
  return `rounded-md border px-3.5 py-2 text-sm font-semibold transition-all ${
    isActive
      ? 'border-[color:var(--outline-variant)] bg-[color:var(--surface-container-high)] text-[color:var(--on-surface)] shadow-sm'
      : 'border-transparent text-[color:var(--on-surface-variant)] hover:border-[color:var(--outline-variant)] hover:bg-[color:var(--surface-container-low)] hover:text-[color:var(--on-surface)]'
  }`;
}

export default function PriorityHeader({ appMode = false }) {
  const authSnapshot = useMemo(() => getAuthSnapshot(), []);
  const fallbackRoleLabel = authSnapshot.isAdmin ? 'Admin' : 'Employee';
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState({ name: 'User', email: '', roleLabel: fallbackRoleLabel });
  const location = useLocation();
  const profileRef = useRef(null);

  const authMode = useMemo(
    () => location.pathname === '/login' || location.pathname === '/signup',
    [location.pathname],
  );

  const showMarketingActions = !appMode && !authMode;

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!appMode) return;

    const { email } = getAuthSnapshot();
    if (email) {
      setProfile((prev) => ({ ...prev, email, roleLabel: prev.roleLabel || fallbackRoleLabel }));
    }

    let isMounted = true;
    usersApi
      .getMe()
      .then((response) => {
        if (!isMounted) return;
        const data = response?.data || {};
        setProfile({
          name: data.name || 'User',
          email: data.email || email || '',
          roleLabel: data.is_admin || String(data.role || '').toLowerCase() === 'admin' ? 'Admin' : 'Employee',
        });
      })
      .catch(() => {
        if (!isMounted) return;
        setProfile((prev) => ({
          ...prev,
          email: prev.email || email || '',
          roleLabel: prev.roleLabel || fallbackRoleLabel,
        }));
      });

    return () => {
      isMounted = false;
    };
  }, [appMode, fallbackRoleLabel]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--outline-variant)]/60 bg-[color:var(--surface-container)]/95 shadow-sm backdrop-blur">
      <div className="flex w-full max-w-full overflow-hidden items-center justify-between gap-2 px-3 py-4 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-2 md:px-4 lg:gap-4 lg:px-8">
        <Link to={appMode ? '/dashboard' : '/'} className="flex min-w-0 items-center gap-2" onClick={closeMenu}>
          <img
            src="/roz-lakshya-logo.webp"
            alt=""
            className="h-8 w-8 flex-shrink-0 rounded-md object-cover sm:h-9 sm:w-9"
          />
          <div className="leading-tight min-w-0">
            <span className="block truncate font-headline text-lg font-bold tracking-tight text-[color:var(--on-surface)] sm:text-xl">
              Roz-Lakshya
            </span>
          </div>
        </Link>

        <nav className="hidden items-center justify-center gap-2 md:flex">
          {appMode ? (
            appLinks.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClass}>
                {item.label}
              </NavLink>
            ))
          ) : (
            <>
              <NavLink to="/features" className={marketingNavClass}>
                Features
              </NavLink>
              <NavLink to="/how-it-works" className={marketingNavClass}>
                How It Works
              </NavLink>
              <NavLink to="/product" className={marketingNavClass}>
                Product
              </NavLink>
            </>
          )}
        </nav>

        <div className="hidden items-center justify-self-end gap-3 md:flex">
          {appMode ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className={`inline-flex h-9 items-center justify-center rounded-full border px-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  profileOpen
                    ? 'border-[color:var(--outline)] bg-[color:var(--surface-container-high)] text-[color:var(--on-surface)]'
                    : 'border-[color:var(--outline-variant)] bg-[color:var(--surface-container-low)] text-[color:var(--on-surface-variant)] hover:border-[color:var(--outline)] hover:bg-[color:var(--surface-container)] hover:text-[color:var(--on-surface)]'
                }`}
                aria-label="Open profile menu"
              >
                {profile.roleLabel}
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] p-3 shadow-lg">
                  <p className="text-sm font-semibold text-[color:var(--on-surface)]">{profile.name || 'User'}</p>
                  <p className="mt-1 truncate text-xs text-[color:var(--on-surface-variant)]">{profile.email || 'No email available'}</p>
                  <Link
                    to="/logout"
                    onClick={() => setProfileOpen(false)}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                  >
                    Logout
                  </Link>
                </div>
              )}
            </div>
          ) : showMarketingActions ? (
            <Link
              to="/login"
              className="rounded-md bg-[color:var(--on-surface)] px-4 py-2 text-sm font-medium text-[color:var(--surface-container-lowest)] transition-colors hover:bg-[color:var(--inverse-surface)]"
            >
              Sign In
            </Link>
          ) : (
            <Link
              to={location.pathname === '/login' ? '/signup' : '/login'}
              className="rounded-md bg-[color:var(--on-surface)] px-4 py-2 text-sm font-medium text-[color:var(--surface-container-lowest)] transition-colors hover:bg-[color:var(--inverse-surface)]"
            >
              {location.pathname === '/login' ? 'Register Company' : 'Sign In'}
            </Link>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 justify-self-end items-center justify-center rounded-md border border-[color:var(--outline-variant)] text-[color:var(--on-surface)] md:hidden"
          aria-label="Toggle navigation"
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span className="material-symbols-outlined text-xl">{menuOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-[color:var(--outline-variant)]/40 bg-[color:var(--surface-container-lowest)] px-6 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            {appMode ? (
              appLinks.map((item) => (
                <NavLink key={item.to} to={item.to} className={navClass} onClick={closeMenu}>
                  {item.label}
                </NavLink>
              ))
            ) : (
              <>
                <NavLink to="/features" onClick={closeMenu} className={marketingNavClass}>Features</NavLink>
                <NavLink to="/how-it-works" onClick={closeMenu} className={marketingNavClass}>How It Works</NavLink>
                <NavLink to="/product" onClick={closeMenu} className={marketingNavClass}>Product</NavLink>
              </>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            {appMode ? (
              <>
                <div className="rounded-md border border-[color:var(--outline-variant)]/60 bg-[color:var(--surface-container-low)] px-3 py-2">
                  <p className="text-sm font-semibold text-[color:var(--on-surface)]">{profile.name || 'User'}</p>
                  <p className="truncate text-xs text-[color:var(--on-surface-variant)]">{profile.email || 'No email available'}</p>
                </div>
                <Link
                  to="/logout"
                  onClick={closeMenu}
                  className="w-full rounded-md border border-red-200 bg-red-50 px-4 py-2 text-center text-sm font-medium text-red-700"
                >
                  Logout
                </Link>
              </>
            ) : showMarketingActions ? (
              <Link
                to="/login"
                onClick={closeMenu}
                className="w-full rounded-md border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-4 py-2 text-center text-sm font-medium text-[color:var(--on-surface)]"
              >
                Sign In
              </Link>
            ) : (
              <Link
                to={location.pathname === '/login' ? '/signup' : '/login'}
                onClick={closeMenu}
                className="w-full rounded-md bg-[color:var(--on-surface)] px-4 py-2 text-center text-sm font-medium text-[color:var(--surface-container-lowest)]"
              >
                {location.pathname === '/login' ? 'Register Company' : 'Sign In'}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
