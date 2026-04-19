import { Link } from 'react-router-dom';
import { getAuthSnapshot } from '../utils/auth';

export default function PriorityFooter() {
  const auth = getAuthSnapshot();

  const handleScrollTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="border-t border-[color:var(--outline-variant)]/60 bg-[color:var(--surface-container)] py-4">
      <div className="grid w-full grid-cols-1 items-center gap-3 px-6 md:grid-cols-[1fr_auto_1fr] md:px-10">
        <div className="flex items-center justify-start">
          <button
            type="button"
            onClick={handleScrollTop}
            className="flex items-center gap-2 text-left"
            aria-label="Scroll to top"
          >
            <img
              src="/roz-lakshya-logo.webp"
              alt="Roz-Lakshya logo"
              className="h-8 w-8 rounded-md object-cover"
            />
            <span className="font-headline text-2xl font-bold tracking-tight text-[color:var(--on-surface)]">Roz-Lakshya</span>
          </button>
        </div>

        <div className="text-center leading-tight">
          <p className="text-xs text-[color:var(--on-surface-variant)]">Created by Team The Errorists</p>
          <p className="text-xs text-[color:var(--on-surface-variant)]">Copyright © 2026 Roz-Lakshya. All rights reserved.</p>
        </div>

        <div className="flex items-center justify-start gap-4 text-xs uppercase tracking-widest text-[color:var(--on-surface-variant)] md:justify-end">
          <Link to="/privacy" state={{ fromApp: auth.isAuthenticated }} className="hover:text-[color:var(--primary)]">Privacy</Link>
          <Link to="/terms" state={{ fromApp: auth.isAuthenticated }} className="hover:text-[color:var(--primary)]">Terms</Link>
          <Link to="/status" state={{ fromApp: auth.isAuthenticated }} className="hover:text-[color:var(--primary)]">Status</Link>
        </div>
      </div>
    </footer>
  );
}
