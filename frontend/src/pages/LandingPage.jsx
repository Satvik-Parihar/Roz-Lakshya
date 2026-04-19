import { Link } from 'react-router-dom';
import PriorityHeader from '../components/PriorityHeader';
import PriorityFooter from '../components/PriorityFooter';

const featureCards = [
  {
    icon: 'analytics',
    title: 'AI Scoring Engine',
    text: 'Prioritizes by impact, effort, urgency, and complaint pressure in one score.',
  },
  {
    icon: 'sort',
    title: 'Dynamic Reordering',
    text: 'Task order updates as constraints shift, without manual reprioritization.',
  },
  {
    icon: 'notifications_active',
    title: 'Smart Alerts',
    text: 'Flags overdue tasks and SLA risk before customers escalate.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-transparent text-[color:var(--on-background)]">
      <PriorityHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden px-6 pb-24 pt-20">
          <div className="pointer-events-none absolute -left-24 top-10 h-56 w-56 rounded-full bg-sky-200/35 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-lime-200/30 blur-3xl" />

          <div className="mx-auto flex w-full max-w-6xl flex-col items-center text-center">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[color:var(--outline-variant)]/60 bg-[color:var(--surface-container-low)] px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-[color:var(--primary-container)]" />
              <span className="font-mono text-xs uppercase tracking-widest text-[color:var(--primary)]">Smart Work Prioritization</span>
            </div>

            <h1 className="max-w-4xl font-headline text-5xl font-bold tracking-tight text-[color:var(--on-surface)] md:text-7xl">
              Stop guessing what to work on next.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[color:var(--on-surface-variant)]">
              Roz-Lakshya scores every task and complaint signal in real time, so your team executes high-value work first.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link to="/signup" className="rounded-md bg-[color:var(--on-surface)] px-6 py-3 text-sm font-medium text-[color:var(--surface-container-lowest)] transition-colors hover:bg-[color:var(--inverse-surface)]">
                Get Started
              </Link>
              <Link to="/tasks" className="rounded-md border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-6 py-3 text-sm font-medium text-[color:var(--on-surface)] transition-colors hover:bg-[color:var(--surface-container-low)]">
                See Live Board
              </Link>
            </div>

            <div id="product" className="mt-14 w-full max-w-4xl rounded-xl border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] shadow-sm">
              <div className="flex items-center justify-between border-b border-[color:var(--outline-variant)] bg-[color:var(--surface-container-low)] px-4 py-3 text-xs text-[color:var(--on-surface-variant)]">
                <div className="flex gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--outline-variant)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--outline-variant)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--outline-variant)]" />
                </div>
                Priority Queue
              </div>

              <div className="space-y-3 p-5 text-left">
                <div className="flex items-center justify-between rounded-lg border border-[color:var(--outline-variant)]/30 p-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-rose-600">priority_high</span>
                    <p className="font-medium text-[color:var(--on-surface)]">Resolve delayed distributor shipment complaint</p>
                  </div>
                  <span className="rounded-sm border border-[color:var(--outline-variant)]/50 bg-[color:var(--secondary-container)] px-2 py-1 font-mono text-xs text-[color:var(--on-secondary-container)]">95.6</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[color:var(--outline-variant)]/30 p-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[color:var(--primary)]">circle</span>
                    <p className="font-medium text-[color:var(--on-surface)]">Finalize Q3 planning deck</p>
                  </div>
                  <span className="rounded-sm border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container)] px-2 py-1 font-mono text-xs text-[color:var(--on-surface)]">82.1</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[color:var(--outline-variant)]/30 p-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[color:var(--outline)]">panorama_fish_eye</span>
                    <p className="font-medium text-[color:var(--on-surface-variant)]">Refactor internal docs navigation</p>
                  </div>
                  <span className="rounded-sm border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-low)] px-2 py-1 font-mono text-xs text-[color:var(--on-surface-variant)]">61.4</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-y border-[color:var(--outline-variant)]/30 bg-[color:var(--surface-container-low)] px-6 py-20">
          <div className="mx-auto w-full max-w-6xl">
            <h2 className="font-headline text-3xl font-bold tracking-tight text-[color:var(--on-surface)]">Precision Engineering</h2>
            <p className="mt-2 max-w-2xl text-[color:var(--on-surface-variant)]">Everything you need to orchestrate focus without clutter.</p>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {featureCards.map((card) => (
                <article key={card.title} className="rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-[color:var(--outline-variant)]/50 bg-transparent">
                    <span className="material-symbols-outlined text-[color:var(--primary-container)]">{card.icon}</span>
                  </div>
                  <h3 className="font-headline text-lg font-bold text-[color:var(--on-surface)]">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--on-surface-variant)]">{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="px-6 py-20">
          <div className="mx-auto w-full max-w-6xl">
            <h2 className="text-center font-headline text-3xl font-bold tracking-tight text-[color:var(--on-surface)]">Simple by design</h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {[
                ['01', 'Connect', 'Bring tasks and complaints into one operating view.'],
                ['02', 'Process', 'Scoring engine computes urgency and business impact continuously.'],
                ['03', 'Execute', 'Team follows the queue and closes the highest-value work first.'],
              ].map(([num, title, text]) => (
                <article key={num} className="rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-6">
                  <p className="font-mono text-5xl font-bold text-[color:var(--surface-container-highest)]">{num}</p>
                  <h3 className="mt-3 font-headline text-xl font-bold text-[color:var(--on-surface)]">{title}</h3>
                  <p className="mt-3 border-t border-[color:var(--outline-variant)]/30 pt-3 text-sm text-[color:var(--on-surface-variant)]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PriorityFooter />
    </div>
  );
}
