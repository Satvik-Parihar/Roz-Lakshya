import { Link } from 'react-router-dom';

import PriorityFooter from '../components/PriorityFooter';
import PriorityHeader from '../components/PriorityHeader';

const modules = [
  {
    name: 'Task Board',
    details: 'Ranked cards, status controls, and score reasoning for everyday execution.',
    route: '/tasks',
  },
  {
    name: 'Execution Sequence',
    details: 'AI-suggested order of work for each assignee.',
    route: '/plan',
  },
  {
    name: 'Complaint Engine',
    details: 'Create and process complaints with SLA and task linkage.',
    route: '/complaints',
  },
  {
    name: 'Operations Dashboard',
    details: 'Department-level visibility, bottleneck indicators, and alert summaries.',
    route: '/dashboard',
  },
];

export default function ProductPage() {
  return (
    <div className="min-h-screen flex flex-col bg-transparent text-[color:var(--on-background)]">
      <PriorityHeader />

      <main className="flex-1 px-6 py-16">
        <div className="mx-auto w-full max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--primary)]">Product Overview</p>
          <h1 className="mt-3 font-headline text-4xl font-bold tracking-tight text-[color:var(--on-surface)] md:text-5xl">
            One workspace for prioritization and execution
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[color:var(--on-surface-variant)] md:text-lg">
            Roz-Lakshya combines daily task operations with complaint-aware prioritization. Teams can move from signal to action in one flow.
          </p>

          <section className="mt-10 grid gap-5 md:grid-cols-2">
            {modules.map((module) => (
              <article key={module.name} className="rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-6">
                <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">{module.name}</h2>
                <p className="mt-3 text-sm text-[color:var(--on-surface-variant)]">{module.details}</p>
                <Link
                  to={module.route}
                  className="mt-4 inline-flex rounded-md border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-low)] px-4 py-2 text-sm font-medium text-[color:var(--on-surface)] hover:bg-[color:var(--surface-container)]"
                >
                  Open {module.name}
                </Link>
              </article>
            ))}
          </section>

          <div className="mt-12 rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-low)] p-6">
            <h3 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">Access model</h3>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--on-surface-variant)]">
              All app routes require a valid session token. Admin-specific controls are available only for users with admin role.
            </p>
          </div>
        </div>
      </main>

      <PriorityFooter />
    </div>
  );
}
