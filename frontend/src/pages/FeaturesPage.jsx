import { Link } from 'react-router-dom';

import PriorityFooter from '../components/PriorityFooter';
import PriorityHeader from '../components/PriorityHeader';

const featureBlocks = [
  {
    title: 'Adaptive Priority Engine',
    description:
      'Tasks are scored from impact, effort, deadline pressure, complaint context, and completion behavior so teams can execute in the right order.',
  },
  {
    title: 'Real-Time Reprioritization',
    description:
      'When a task status, deadline, or workload changes, score and rank update instantly without manual sorting.',
  },
  {
    title: 'Admin Overrides',
    description:
      'Leads can pin strategic work and apply controlled boost values when urgent business context needs immediate attention.',
  },
  {
    title: 'Complaint-Aware Workflows',
    description:
      'Customer complaints are converted into structured signals and linked to execution tasks for faster mitigation.',
  },
  {
    title: 'Alerting and SLA Coverage',
    description:
      'Proactive alerts identify due-soon, overdue, and SLA breach risk early so teams can react before escalations.',
  },
  {
    title: 'Execution Visibility',
    description:
      'Dashboard views provide team throughput, bottlenecks, and risk snapshots across departments and users.',
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--on-background)]">
      <PriorityHeader />

      <main className="px-6 py-16">
        <div className="mx-auto w-full max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--primary)]">Platform Features</p>
          <h1 className="mt-3 font-headline text-4xl font-bold tracking-tight text-[color:var(--on-surface)] md:text-5xl">
            Smart Work Prioritization for high-output teams
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[color:var(--on-surface-variant)] md:text-lg">
            Roz-Lakshya combines planning, complaint operations, and AI scoring in a single execution system.
            These capabilities are designed for daily use by managers and team members, not just analysts.
          </p>

          <section className="mt-10 grid gap-6 md:grid-cols-2">
            {featureBlocks.map((block) => (
              <article key={block.title} className="rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-6">
                <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">{block.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[color:var(--on-surface-variant)]">{block.description}</p>
              </article>
            ))}
          </section>

          <div className="mt-12 flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="rounded-md bg-[color:var(--on-surface)] px-5 py-2.5 text-sm font-medium text-[color:var(--surface-container-lowest)] transition-colors hover:bg-[color:var(--inverse-surface)]"
            >
              Create Account
            </Link>
            <Link
              to="/product"
              className="rounded-md border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-5 py-2.5 text-sm font-medium text-[color:var(--on-surface)] hover:bg-[color:var(--surface-container-low)]"
            >
              View Product Overview
            </Link>
          </div>
        </div>
      </main>

      <PriorityFooter />
    </div>
  );
}
