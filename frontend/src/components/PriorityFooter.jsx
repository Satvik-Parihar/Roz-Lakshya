export default function PriorityFooter() {
  return (
    <footer className="border-t border-[color:var(--outline-variant)]/40 bg-[color:var(--background)] py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-5 px-6 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[color:var(--on-surface)] text-[color:var(--surface-container-lowest)]">
            <span className="material-symbols-outlined text-sm">priority_high</span>
          </div>
          <span className="font-headline text-lg font-bold tracking-tight text-[color:var(--on-surface)]">Roz-Lakshya</span>
        </div>
        <p className="text-xs text-[color:var(--on-surface-variant)]">Built for focus-first execution and complaint-aware prioritization.</p>
        <div className="flex items-center gap-4 text-xs uppercase tracking-widest text-[color:var(--on-surface-variant)]">
          <a href="#" className="hover:text-[color:var(--primary)]">Privacy</a>
          <a href="#" className="hover:text-[color:var(--primary)]">Terms</a>
          <a href="#" className="hover:text-[color:var(--primary)]">Status</a>
        </div>
      </div>
    </footer>
  );
}
