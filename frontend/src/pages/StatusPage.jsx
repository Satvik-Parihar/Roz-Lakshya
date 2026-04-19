import { useMemo } from 'react';
import PriorityFooter from '../components/PriorityFooter';
import PriorityHeader from '../components/PriorityHeader';
import { getAuthSnapshot } from '../utils/auth';

const items = [
  { component: 'API', state: 'Operational', note: 'Core task and complaint routes are healthy.' },
  { component: 'Scoring Engine', state: 'Operational', note: 'Priority model available and serving scores.' },
  { component: 'Scheduler', state: 'Operational', note: 'Deadline checks and SLA jobs are running.' },
  { component: 'Frontend', state: 'Operational', note: 'Dashboard and board pages are reachable.' },
];

export default function StatusPage() {
  const auth = useMemo(() => getAuthSnapshot(), []);

  return (
    <div className="flex min-h-screen flex-col bg-transparent text-[color:var(--on-background)]">
      <PriorityHeader appMode={auth.isAuthenticated} />

      <main className="flex-1 px-6 py-16">
        <div className="mx-auto w-full max-w-5xl">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--primary)]">System</p>
          <h1 className="mt-3 font-headline text-4xl font-bold tracking-tight text-[color:var(--on-surface)]">Service Status</h1>
          <p className="mt-3 text-sm text-[color:var(--on-surface-variant)]">
            Current service state for this deployment environment.
          </p>

          <div className="mt-8 overflow-hidden rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)]">
            <div className="grid grid-cols-12 border-b border-[color:var(--outline-variant)]/40 bg-[color:var(--surface-container-low)] px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[color:var(--on-surface-variant)]">
              <p className="col-span-4">Component</p>
              <p className="col-span-3">Status</p>
              <p className="col-span-5">Details</p>
            </div>

            {items.map((item) => (
              <div key={item.component} className="grid grid-cols-12 border-b border-[color:var(--outline-variant)]/20 px-5 py-4 text-sm last:border-b-0">
                <p className="col-span-4 font-medium text-[color:var(--on-surface)]">{item.component}</p>
                <p className="col-span-3">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">{item.state}</span>
                </p>
                <p className="col-span-5 text-[color:var(--on-surface-variant)]">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <PriorityFooter />
    </div>
  );
}
