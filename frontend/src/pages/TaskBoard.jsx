import { useEffect, useState } from 'react';
import useTaskStore from '../store/useTaskStore';
import TaskCard from '../components/TaskCard';
import PriorityHeader from '../components/PriorityHeader';
import PriorityFooter from '../components/PriorityFooter';

// ─── Skeleton loader ───────────────────────────────────────────────────────────
function TaskSkeleton() {
  return (
    <div className="rounded-xl border border-[color:var(--outline-variant)]/60 bg-[color:var(--surface-container-lowest)] p-5 shadow-sm animate-pulse space-y-3">
      <div className="h-4 w-3/4 rounded bg-[color:var(--surface-container-highest)]" />
      <div className="h-3 w-1/3 rounded bg-[color:var(--surface-container)]" />
      <div className="h-3 w-1/4 rounded bg-[color:var(--surface-container)]" />
    </div>
  );
}

// ─── Create Task Modal ─────────────────────────────────────────────────────────
const EMPTY_TASK = { id: null, title: '', description: '', assignee: '', deadline: '', effort: '', impact: '', status: 'todo', priority_score: 0, complaint_boost: 0, reasoning: '' };

function CreateTaskModal({ onClose }) {
  const { createTask } = useTaskStore();
  const [form, setForm] = useState({ title: '', description: '', assignee: '', deadline: '', effort: '', impact: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handle = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required');
    setBusy(true);
    setError('');
    try {
      const payload = {
        ...form,
        effort:   form.effort   !== '' ? Number(form.effort)   : undefined,
        impact:   form.impact   !== '' ? Number(form.impact)   : undefined,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
        status:   'todo',
      };
      await createTask(payload);
      onClose();
    } catch {
      setError('Failed to create task. Please try again.');
    } finally {
      setBusy(false);

    }
  };

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[color:var(--outline-variant)]/50 px-6 py-4">
          <h2 className="text-lg font-bold text-[color:var(--on-surface)]">New Task</h2>
          <button onClick={onClose} className="text-[color:var(--on-surface-variant)] hover:text-[color:var(--on-surface)] transition-colors text-xl">✕</button>
        </div>
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {[
            { name: 'title',       label: 'Title',             type: 'text',          required: true  },
            { name: 'description', label: 'Description',       type: 'textarea'                       },
            { name: 'assignee',    label: 'Assignee',          type: 'text'                           },
            { name: 'deadline',    label: 'Deadline',          type: 'datetime-local'                 },
            { name: 'effort',      label: 'Effort (1-10)',     type: 'number', min: 1, max: 10        },
            { name: 'impact',      label: 'Impact (1-10)',     type: 'number', min: 1, max: 10        },
          ].map(({ name, label, type, required, min, max }) => (
            <div key={name} className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--on-surface-variant)]">{label}</label>
              {type === 'textarea' ? (
                <textarea name={name} value={form[name]} onChange={handle} rows={3}
                  className="resize-none rounded-lg border border-[color:var(--outline-variant)] px-3 py-2 text-sm text-[color:var(--on-surface)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]" />
              ) : (
                <input type={type} name={name} value={form[name]} onChange={handle} required={required} min={min} max={max}
                  className="rounded-lg border border-[color:var(--outline-variant)] px-3 py-2 text-sm text-[color:var(--on-surface)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]" />
              )}
            </div>
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
        <div className="flex items-center justify-end gap-3 border-t border-[color:var(--outline-variant)]/50 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-[color:var(--on-surface-variant)] hover:bg-[color:var(--surface-container-low)] transition-colors">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-[color:var(--on-surface)] px-5 py-2 text-sm font-semibold text-[color:var(--surface-container-lowest)] hover:bg-[color:var(--inverse-surface)] transition-colors disabled:opacity-60">
            {busy ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Filter bar ────────────────────────────────────────────────────────────────
const STATUS_FILTERS = [
  { value: 'all',         label: 'All'         },
  { value: 'todo',        label: 'Todo'        },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done',        label: 'Done'        },
];

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TaskBoard() {
  const { tasks, loading, error, fetchTasks } = useTaskStore();
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filtered = tasks.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      t.title?.toLowerCase().includes(q) ||
      t.assignee?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="brand-page-bg min-h-screen">
      <PriorityHeader appMode />

      <main className="mx-auto w-full max-w-6xl px-6 py-10 space-y-6">
        <section className="stagger-enter rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-[color:var(--primary)]">Execution Console</p>
              <h1 className="mt-1 text-3xl font-headline font-bold tracking-tight text-[color:var(--on-surface)]">
                Task Board
              </h1>
              <p className="mt-1 text-sm text-[color:var(--on-surface-variant)]">
                {tasks.length} task{tasks.length !== 1 ? 's' : ''} prioritized by AI score.
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[color:var(--on-surface)] px-4 py-2 text-sm font-semibold text-[color:var(--surface-container-lowest)] transition-colors hover:bg-[color:var(--inverse-surface)]"
            >
              <span className="material-symbols-outlined text-base">add</span>
              New Task
            </button>
          </div>
        </section>

        <section className="stagger-enter rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-4 shadow-sm" style={{ animationDelay: '90ms' }}>
        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base text-[color:var(--on-surface-variant)]">search</span>
            <input
              type="text"
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] py-2 pl-10 pr-4 text-sm text-[color:var(--on-surface)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
            />
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-1 rounded-lg border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-low)] p-1">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all duration-150
                  ${statusFilter === value
                    ? 'bg-[color:var(--primary)] text-[color:var(--on-primary)] shadow-sm'
                    : 'text-[color:var(--on-surface-variant)] hover:bg-[color:var(--surface-container-highest)]'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        </section>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4">
            <span className="material-symbols-outlined text-xl text-rose-500">warning</span>
            <div>
              <p className="text-sm font-semibold text-rose-700">Failed to load tasks</p>
              <p className="mt-0.5 text-xs text-rose-500">{error}</p>
            </div>
            <button
              onClick={fetchTasks}
              className="ml-auto rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Task list ── */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <TaskSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] py-24 text-center">
            <span className="material-symbols-outlined text-5xl text-[color:var(--on-surface-variant)]">stacked_inbox</span>
            <p className="text-lg font-semibold text-[color:var(--on-surface)]">No tasks found</p>
            <p className="text-sm text-[color:var(--on-surface-variant)]">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first task to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 stagger-enter" style={{ animationDelay: '140ms' }}>
            {filtered.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </main>

      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} />}

      <PriorityFooter />
    </div>
  );
}
