import { Link } from 'react-router-dom';

import PriorityFooter from '../components/PriorityFooter';
import PriorityHeader from '../components/PriorityHeader';

const steps = [
  {
    step: '01',
    title: 'Capture',
    text: 'Bring operational tasks and complaint signals into one shared queue.',
  },
  {
    step: '02',
    title: 'Score',
    text: 'The ML service calculates priority and updates reasoning as inputs change.',
  },
  {
    step: '03',
    title: 'Override',
    text: 'Admins can pin or boost tasks when strategic urgency exceeds model assumptions.',
  },
  {
    step: '04',
    title: 'Execute',
    text: 'Teams work through ranked cards, mark status, and trigger instant reprioritization.',
  },
  {
    step: '05',
    title: 'Monitor',
    text: 'Dashboard and alerting layers highlight risk, SLA breaches, and throughput trends.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col bg-transparent text-[color:var(--on-background)]">
      <PriorityHeader />

      <main className="flex-1 px-6 py-16">
        <div className="mx-auto w-full max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--primary)]">How It Works</p>
          <h1 className="mt-3 font-headline text-4xl font-bold tracking-tight text-[color:var(--on-surface)] md:text-5xl">
            From raw workload to clear next action
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[color:var(--on-surface-variant)] md:text-lg">
            The workflow is intentionally simple: collect inputs, score continuously, then help teams execute with confidence.
            Every step is visible and practical for daily operations.
          </p>

          <section className="mt-10 grid gap-5 md:grid-cols-2">
            {steps.map((item) => (
              <article key={item.step} className="rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-6">
                <p className="font-mono text-sm font-semibold tracking-widest text-[color:var(--primary)]">STEP {item.step}</p>
                <h2 className="mt-2 font-headline text-xl font-bold text-[color:var(--on-surface)]">{item.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[color:var(--on-surface-variant)]">{item.text}</p>
              </article>
            ))}
          </section>

          <div className="mt-12 rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-low)] p-6">
            <h3 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">Ready to try the workflow?</h3>
            <p className="mt-2 text-sm text-[color:var(--on-surface-variant)]">
              Sign in to access the live board and execution sequence views.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="rounded-md bg-[color:var(--on-surface)] px-5 py-2.5 text-sm font-medium text-[color:var(--surface-container-lowest)] hover:bg-[color:var(--inverse-surface)]"
              >
                Sign In
              </Link>
              <Link
                to="/tasks"
                className="rounded-md border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-5 py-2.5 text-sm font-medium text-[color:var(--on-surface)] hover:bg-[color:var(--surface-container)]"
              >
                Open Task Board
              </Link>
            </div>
          </div>
        </div>
      </main>

      <PriorityFooter />
    </div>
  );
}
