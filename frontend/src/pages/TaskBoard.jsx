import { useEffect, useState } from 'react';
import useTaskStore from '../store/useTaskStore';
import TaskCard from '../components/TaskCard';
import EditTaskModal from '../components/EditTaskModal';

// ─── Skeleton loader ───────────────────────────────────────────────────────────
function TaskSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-gray-200 shadow-sm p-5 animate-pulse space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-100 rounded w-1/3" />
      <div className="h-3 bg-gray-100 rounded w-1/4" />
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
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors text-xl">✕</button>
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
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
              {type === 'textarea' ? (
                <textarea name={name} value={form[name]} onChange={handle} rows={3}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
              ) : (
                <input type={type} name={name} value={form[name]} onChange={handle} required={required} min={min} max={max}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              )}
            </div>
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={submit} disabled={busy} className="px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-60">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
      {/* ── Topbar ── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              📋 Task Board
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} · Sorted by Work Priority
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all duration-150 shadow-sm"
          >
            <span className="text-lg leading-none">＋</span>
            New Task
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-1.5 bg-white rounded-xl border border-gray-200 p-1">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-150
                  ${statusFilter === value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 flex items-center gap-3">
            <span className="text-red-500 text-xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-red-700">Failed to load tasks</p>
              <p className="text-xs text-red-500 mt-0.5">{error}</p>
            </div>
            <button
              onClick={fetchTasks}
              className="ml-auto px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
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
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <span className="text-5xl">🗂️</span>
            <p className="text-lg font-semibold text-gray-600">No tasks found</p>
            <p className="text-sm text-gray-400">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first task to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </main>

      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} />}

    </div>
  );
}
