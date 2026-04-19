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
  const [profile, setProfile] = useState({
    name: authSnapshot.name || '',
    email: authSnapshot.email || '',
    roleLabel: fallbackRoleLabel,
  });
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
          name: data.name || authSnapshot.name || 'Unknown',
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
      <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-3 md:grid-cols-[1fr_auto_1fr] md:gap-3 md:px-5 lg:gap-4 lg:px-8">
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
                className={`inline-flex h-9 items-center justify-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors ${
                  profileOpen
                    ? 'border-[color:var(--outline)] bg-[color:var(--surface-container-high)] text-[color:var(--on-surface)]'
                    : 'border-[color:var(--outline-variant)] bg-[color:var(--surface-container-low)] text-[color:var(--on-surface-variant)] hover:border-[color:var(--outline)] hover:bg-[color:var(--surface-container)] hover:text-[color:var(--on-surface)]'
                }`}
                aria-label="Open profile menu"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--primary)] text-[8px] font-black text-white">
                  {(profile.name || 'U')[0].toUpperCase()}
                </span>
                <span className="hidden sm:inline">{profile.name || profile.roleLabel}</span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-xl border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] shadow-xl">
                  {/* Profile card top */}
                  <div className="flex items-center gap-3 border-b border-[color:var(--outline-variant)]/40 bg-[color:var(--surface-container-low)] px-4 py-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)] text-sm font-black text-white shadow-sm">
                      {(profile.name || 'U')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[color:var(--on-surface)]">
                        {profile.name || 'Unknown'}
                      </p>
                      <p className="truncate text-xs text-[color:var(--on-surface-variant)]">
                        {profile.email || '—'}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      profile.roleLabel === 'Admin'
                        ? 'bg-[color:var(--primary)]/15 text-[color:var(--primary)]'
                        : 'bg-[color:var(--surface-container-highest)] text-[color:var(--on-surface-variant)]'
                    }`}>
                      {profile.roleLabel}
                    </span>
                  </div>
                  {/* Actions */}
                  <div className="p-2">
                    <Link
                      to="/logout"
                      onClick={() => setProfileOpen(false)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
                    >
                      Logout
                    </Link>
                  </div>
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
                <div className="flex flex-1 items-center gap-3 rounded-xl border border-[color:var(--outline-variant)]/60 bg-[color:var(--surface-container-low)] px-3 py-2">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)] text-sm font-black text-white">
                    {(profile.name || 'U')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[color:var(--on-surface)]">{profile.name || 'Unknown'}</p>
                    <p className="truncate text-xs text-[color:var(--on-surface-variant)]">{profile.email || '—'}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    profile.roleLabel === 'Admin'
                      ? 'bg-[color:var(--primary)]/15 text-[color:var(--primary)]'
                      : 'bg-[color:var(--surface-container-highest)] text-[color:var(--on-surface-variant)]'
                  }`}>{profile.roleLabel}</span>
                </div>
                <Link
                  to="/logout"
                  onClick={closeMenu}
                  className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-center text-sm font-semibold text-red-700 hover:bg-red-100"
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
