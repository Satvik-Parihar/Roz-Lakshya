import { useCallback, useEffect, useMemo, useState } from 'react';
import { taskApi } from '../api/taskApi';
import { getAuthSnapshot } from '../utils/auth';
import PriorityHeader from '../components/PriorityHeader';
import PriorityFooter from '../components/PriorityFooter';

export default function ExecutionSequence() {
  const [tasks, setTasks] = useState([]);
  const [sequence, setSequence] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const auth = useMemo(() => getAuthSnapshot(), []);
  const USER_ID = Number(auth.userId || 0);
  const IS_ADMIN = Boolean(auth.isAdmin);

  const loadSequence = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!USER_ID) {
        setTasks([]);
        setSequence([]);
        setError('Unable to resolve current user for sequence generation.');
        return;
      }

      const taskRequest = IS_ADMIN
        ? taskApi.getAll(200)
        : taskApi.getMine(USER_ID, 200);

      const [taskRes, seqRes] = await Promise.all([
        taskRequest,
        taskApi.getSequence(USER_ID, 200),
      ]);

      const taskRows = Array.isArray(taskRes?.data) ? taskRes.data : [];
      setTasks(taskRows);

      const rawSequence = Array.isArray(seqRes?.data) ? seqRes.data : [];
      if (rawSequence.length > 0) {
        setSequence(rawSequence);
      } else {
        const fallback = taskRows
          .filter((t) => String(t.status || 'todo') !== 'done')
          .sort((a, b) => Number(b.priority_score || 0) - Number(a.priority_score || 0))
          .slice(0, 25)
          .map((t, index) => ({
            task_id: t.id,
            sequence: index + 1,
            reason: 'Fallback sequence based on current AI priority score.',
          }));
        setSequence(fallback);
      }
    } catch {
      setTasks([]);
      setError('AI could not compute sequence at this time.');
    } finally {
      setLoading(false);
    }
  }, [IS_ADMIN, USER_ID]);

  useEffect(() => {
    loadSequence();
  }, [loadSequence]);

  const getTaskDetails = (id) => tasks.find((t) => t.id === id);

  return (
    <div className="flex min-h-screen flex-col ">
      <PriorityHeader appMode />

      <main className="flex-grow mx-auto w-full max-w-3xl space-y-6 px-3 py-6 sm:px-6 sm:py-10">
        {/* ── Page header ── */}
        <section className="stagger-enter rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-[color:var(--primary)]">AI Engine</p>
              <h1 className="mt-1 text-2xl font-headline font-bold tracking-tight text-[color:var(--on-surface)] sm:text-3xl">
                🚀 My Today's Plan
              </h1>
              <p className="mt-1 text-sm text-[color:var(--on-surface-variant)]">
                AI-optimized execution sequence for maximum efficiency
              </p>
            </div>
            <button
              onClick={loadSequence}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-low)] px-4 py-2 text-sm font-medium text-[color:var(--on-surface)] transition-colors hover:bg-[color:var(--surface-container)] disabled:opacity-60 sm:w-auto"
              title="Refresh Sequence"
            >
              🔄 Refresh
            </button>
          </div>
        </section>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] py-20 gap-4">
            <div className="w-12 h-12 border-4 border-[color:var(--primary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-[color:var(--primary)] animate-pulse text-center px-4">
              Intelligent engine is sequencing your tasks...
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4">
            <span className="material-symbols-outlined text-xl text-rose-500">warning</span>
            <p className="text-sm font-semibold text-rose-700">{error}</p>
            <button
              onClick={loadSequence}
              className="ml-auto rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && sequence.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] py-24 text-center">
            <span className="text-5xl">🏮</span>
            <p className="text-lg font-semibold text-[color:var(--on-surface)]">No pending tasks to sequence</p>
            <p className="text-sm text-[color:var(--on-surface-variant)]">
              All tasks are done, or none are assigned to you yet.
            </p>
          </div>
        )}

        {/* ── Sequence list ── */}
        {!loading && sequence.length > 0 && (
          <div className="space-y-0">
            {sequence.map((item, index) => {
              const task = getTaskDetails(item.task_id);
              if (!task) return null;
              const score = Number(task.priority_score || 0);

              return (
                <div key={item.task_id} className="relative flex gap-4 sm:gap-6">
                  {/* Timeline column */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[color:var(--surface-container-lowest)] border-2 border-[color:var(--primary)] text-[color:var(--primary)] flex items-center justify-center font-black shadow-lg z-10 text-sm">
                      {item.sequence}
                    </div>
                    {index < sequence.length - 1 && (
                      <div className="w-0.5 flex-1 bg-[color:var(--outline-variant)]/40 mt-1 min-h-8" />
                    )}
                  </div>

                  {/* Card */}
                  <div className="flex-1 mb-4 rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-4 shadow-sm hover:shadow-md transition-all sm:p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-[color:var(--on-surface)] break-words">
                          {task.title}
                        </h3>
                        <div className="mt-2 inline-flex items-start gap-1.5 rounded-lg bg-[color:var(--secondary-container)] px-2 py-1 text-xs font-semibold text-[color:var(--on-secondary-container)] max-w-full">
                          <span className="shrink-0">💡</span>
                          <span className="break-words leading-relaxed">{item.reason}</span>
                        </div>
                      </div>
                      <span className="self-start shrink-0 rounded-md border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-low)] px-2 py-1 text-xs font-bold uppercase text-[color:var(--on-surface-variant)] whitespace-nowrap">
                        {String(task.status || 'todo').replace('-', ' ')}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[color:var(--on-surface-variant)] font-semibold uppercase tracking-wider">
                      <span>⌛ Effort: {task.effort ?? 'N/A'}</span>
                      <span>🔥 Score: {score.toFixed(2)}</span>
                      {task.deadline_days && (
                        <span>📅 {task.deadline_days}d deadline</span>
                      )}
                      {task.assignee && task.assignee !== 'Unassigned' && (
                        <span>👤 {task.assignee}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <PriorityFooter />
    </div>
  );
}
