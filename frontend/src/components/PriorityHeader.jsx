import { useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

const appLinks = [
  { to: '/tasks', label: 'Tasks' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/complaints', label: 'Complaints' },
];

function navClass({ isActive }) {
  return `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-[color:var(--surface-container-high)] text-[color:var(--on-surface)] shadow-sm'
      : 'text-[color:var(--on-surface-variant)] hover:bg-[color:var(--surface-container-low)] hover:text-[color:var(--on-surface)]'
  }`;
}

export default function PriorityHeader({ appMode = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const authMode = useMemo(
    () => location.pathname === '/login' || location.pathname === '/signup',
    [location.pathname],
  );

  const showMarketingActions = !appMode && !authMode;

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--outline-variant)]/40 bg-[color:var(--background)]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="flex items-center gap-2" onClick={closeMenu}>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[color:var(--on-surface)] text-[color:var(--surface-container-lowest)]">
            <span className="material-symbols-outlined text-base">priority_high</span>
          </div>
          <div className="leading-tight">
            <span className="block font-headline text-xl font-bold tracking-tight text-[color:var(--on-surface)]">Roz-Lakshya</span>
            <span className="hidden text-[10px] uppercase tracking-[0.16em] text-[color:var(--on-surface-variant)] sm:block">Execution OS</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {appMode ? (
            appLinks.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClass}>
                {item.label}
              </NavLink>
            ))
          ) : (
            <>
              <a href="#features" className="rounded-md px-3 py-1.5 text-sm font-medium text-[color:var(--on-surface-variant)] hover:bg-[color:var(--surface-container-low)] hover:text-[color:var(--on-surface)]">
                Features
              </a>
              <a href="#how-it-works" className="rounded-md px-3 py-1.5 text-sm font-medium text-[color:var(--on-surface-variant)] hover:bg-[color:var(--surface-container-low)] hover:text-[color:var(--on-surface)]">
                How It Works
              </a>
              <a href="#product" className="rounded-md px-3 py-1.5 text-sm font-medium text-[color:var(--on-surface-variant)] hover:bg-[color:var(--surface-container-low)] hover:text-[color:var(--on-surface)]">
                Product
              </a>
            </>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {appMode ? (
            <>
              <Link
                to="/"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-[color:var(--on-surface-variant)] hover:bg-[color:var(--surface-container-low)] hover:text-[color:var(--on-surface)]"
              >
                Back to Site
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-3.5 py-2 text-sm font-medium text-[color:var(--on-surface)] hover:bg-[color:var(--surface-container-low)]"
              >
                <span className="material-symbols-outlined text-base">account_circle</span>
                Workspace
              </button>
            </>
          ) : showMarketingActions ? (
            <Link
              to="/login"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-[color:var(--primary)] hover:bg-[color:var(--surface-container-low)]"
            >
              Sign In
            </Link>
          ) : (
            <Link
              to={location.pathname === '/login' ? '/signup' : '/login'}
              className="rounded-md bg-[color:var(--on-surface)] px-4 py-2 text-sm font-medium text-[color:var(--surface-container-lowest)] transition-colors hover:bg-[color:var(--inverse-surface)]"
            >
              {location.pathname === '/login' ? 'Create Account' : 'Sign In'}
            </Link>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[color:var(--outline-variant)] text-[color:var(--on-surface)] md:hidden"
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
                <a href="#features" onClick={closeMenu} className="rounded-md px-3 py-2 text-sm font-medium text-[color:var(--on-surface-variant)] hover:bg-[color:var(--surface-container-low)] hover:text-[color:var(--on-surface)]">Features</a>
                <a href="#how-it-works" onClick={closeMenu} className="rounded-md px-3 py-2 text-sm font-medium text-[color:var(--on-surface-variant)] hover:bg-[color:var(--surface-container-low)] hover:text-[color:var(--on-surface)]">How It Works</a>
                <a href="#product" onClick={closeMenu} className="rounded-md px-3 py-2 text-sm font-medium text-[color:var(--on-surface-variant)] hover:bg-[color:var(--surface-container-low)] hover:text-[color:var(--on-surface)]">Product</a>
              </>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            {appMode ? (
              <Link
                to="/"
                onClick={closeMenu}
                className="w-full rounded-md border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-4 py-2 text-center text-sm font-medium text-[color:var(--on-surface)]"
              >
                Back to Site
              </Link>
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
                {location.pathname === '/login' ? 'Create Account' : 'Sign In'}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
