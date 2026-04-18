import PriorityFooter from '../components/PriorityFooter';
import PriorityHeader from '../components/PriorityHeader';

const pipeline = [
  {
    title: 'Open Complaints',
    value: 12,
    tone: 'bg-sky-100 text-sky-700',
  },
  {
    title: 'Near SLA Breach',
    value: 4,
    tone: 'bg-amber-100 text-amber-700',
  },
  {
    title: 'Breached',
    value: 1,
    tone: 'bg-rose-100 text-rose-700',
  },
];

export default function ComplaintEngine() {
  return (
    <div className="brand-page-bg min-h-screen">
      <PriorityHeader appMode />

      <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10">
        <section className="rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-6 shadow-sm">
          <p className="font-mono text-xs uppercase tracking-widest text-[color:var(--primary)]">Response Console</p>
          <h1 className="mt-1 font-headline text-3xl font-bold tracking-tight text-[color:var(--on-surface)]">Complaint Engine</h1>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--on-surface-variant)]">
            Track complaint urgency and route high-risk cases to prioritized execution queues.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {pipeline.map((item) => (
            <article key={item.title} className="rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-5 shadow-sm">
              <p className="text-sm text-[color:var(--on-surface-variant)]">{item.title}</p>
              <div className="mt-3 flex items-center justify-between">
                <p className="font-mono text-4xl font-bold text-[color:var(--on-surface)]">{item.value}</p>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.tone}`}>
                  Live
                </span>
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[color:var(--outline-variant)]/40 pb-4">
            <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">Recent Signals</h2>
            <button className="rounded-md bg-[color:var(--on-surface)] px-3 py-1.5 text-xs font-semibold text-[color:var(--surface-container-lowest)] hover:bg-[color:var(--inverse-surface)]">
              Refresh
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {[
              ['High', 'Product', 'App crash reported by enterprise client', '4h SLA'],
              ['Medium', 'Packaging', 'Invoice PDF formatting issue', '8h SLA'],
              ['Low', 'Process', 'Notification wording feedback', '24h SLA'],
            ].map(([priority, category, text, sla]) => (
              <article key={text} className="rounded-lg border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[color:var(--surface-container)] px-2 py-0.5 text-xs font-semibold text-[color:var(--on-surface)]">{priority}</span>
                  <span className="rounded-full bg-[color:var(--secondary-container)] px-2 py-0.5 text-xs font-semibold text-[color:var(--on-secondary-container)]">{category}</span>
                  <span className="ml-auto text-xs font-mono text-[color:var(--on-surface-variant)]">{sla}</span>
                </div>
                <p className="mt-2 text-sm text-[color:var(--on-surface)]">{text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <PriorityFooter />
    </div>
  );
}
