import { useMemo } from 'react';
import PriorityFooter from '../components/PriorityFooter';
import PriorityHeader from '../components/PriorityHeader';
import useTaskStore from '../store/useTaskStore';

export default function Dashboard() {
  const tasks = useTaskStore((state) => state.tasks);

  const summary = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((task) => task.status === 'done').length;
    const active = tasks.filter((task) => task.status !== 'done').length;
    const avgScore = total
      ? (tasks.reduce((acc, task) => acc + (task.priority_score || 0), 0) / total).toFixed(1)
      : '0.0';

    return { total, done, active, avgScore };
  }, [tasks]);

  return (
    <div className="brand-page-bg min-h-screen">
      <PriorityHeader appMode />

      <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10">
        <section className="rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-6 shadow-sm">
          <p className="font-mono text-xs uppercase tracking-widest text-[color:var(--primary)]">Manager View</p>
          <h1 className="mt-1 font-headline text-3xl font-bold tracking-tight text-[color:var(--on-surface)]">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--on-surface-variant)]">
            Monitor workload distribution and priority execution quality across your active queue.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            ['Total Tasks', summary.total],
            ['Active Tasks', summary.active],
            ['Completed', summary.done],
            ['Avg Priority', summary.avgScore],
          ].map(([label, value]) => (
            <article key={label} className="rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-[color:var(--on-surface-variant)]">{label}</p>
              <p className="mt-3 font-mono text-4xl font-bold text-[color:var(--on-surface)]">{value}</p>
            </article>
          ))}
        </section>

        <section className="rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-6 shadow-sm">
          <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">Operational Notes</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <article className="rounded-lg border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface)] p-4">
              <h3 className="font-semibold text-[color:var(--on-surface)]">High-risk window</h3>
              <p className="mt-2 text-sm text-[color:var(--on-surface-variant)]">Next 24h has dense deadlines. Push complaint-linked tasks first.</p>
            </article>
            <article className="rounded-lg border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface)] p-4">
              <h3 className="font-semibold text-[color:var(--on-surface)]">Team throughput</h3>
              <p className="mt-2 text-sm text-[color:var(--on-surface-variant)]">Execution pace is stable. Consider reducing mid-priority context switching.</p>
            </article>
          </div>
        </section>
      </main>

      <PriorityFooter />
    </div>
  );
}
