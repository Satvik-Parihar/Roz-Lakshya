import { useEffect, useMemo, useRef, useState } from 'react';
import useTaskStore from '../store/useTaskStore';
import { usersApi } from '../api/taskApi';
import TaskCard from '../components/TaskCard';
import PriorityHeader from '../components/PriorityHeader';
import PriorityFooter from '../components/PriorityFooter';
import { getAuthSnapshot } from '../utils/auth';

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
function CreateTaskModal({ onClose }) {
  const { createTask } = useTaskStore();
  const [form, setForm] = useState({
    title: '',
    description: '',
    assignee_id: '',
    deadline: '',
    effort: '',
    impact: '',
    workload: 5,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const assigneeMenuRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const fetchUsers = async () => {
      setUsersLoading(true);
      setUsersError('');
      try {
        const response = await usersApi.getAll();
        if (!mounted) return;
        const items = Array.isArray(response?.data) ? response.data : [];
        setUsers(items);
      } catch {
        if (!mounted) return;
        setUsersError('Unable to load assignees right now.');
        setUsers([]);
      } finally {
        if (mounted) setUsersLoading(false);
      }
    };

    fetchUsers();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!assigneeMenuRef.current) return;
      if (!assigneeMenuRef.current.contains(event.target)) {
        setAssigneeOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedAssignee = useMemo(
    () => users.find((user) => String(user.id) === String(form.assignee_id)) || null,
    [users, form.assignee_id],
  );

  const filteredUsers = useMemo(() => {
    const query = assigneeSearch.trim().toLowerCase();
    if (!query) return users.slice(0, 1500);

    return users
      .filter((user) => {
        const name = String(user.name || '').toLowerCase();
        const email = String(user.email || '').toLowerCase();
        const idText = String(user.id);
        return name.includes(query) || email.includes(query) || idText.includes(query);
      })
      .slice(0, 1500);
  }, [users, assigneeSearch]);

  const handle = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const getAssigneeLabel = (user) => {
    if (!user) return '';
    if (user.email) return `${user.name} (${user.email})`;
    return `${user.name} (ID ${user.id})`;
  };

  const handleAssigneeSelect = (user) => {
    setForm((prev) => ({ ...prev, assignee_id: String(user.id) }));
    setAssigneeSearch(getAssigneeLabel(user));
    setAssigneeOpen(false);
  };

  const clearAssignee = () => {
    setForm((prev) => ({ ...prev, assignee_id: '' }));
    setAssigneeSearch('');
    setAssigneeOpen(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required');
    setBusy(true);
    setError('');
    try {
      const payload = {
        ...form,
        effort: form.effort !== '' ? Number(form.effort) : undefined,
        impact: form.impact !== '' ? Number(form.impact) : undefined,
        workload: form.workload !== '' ? Number(form.workload) : undefined,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
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
          <div className="flex flex-col gap-1" ref={assigneeMenuRef}>
            <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--on-surface-variant)]">Assignee (Optional)</label>
            <div className="relative">
              <input
                type="text"
                value={assigneeSearch}
                onFocus={() => setAssigneeOpen(true)}
                onChange={(e) => {
                  setAssigneeSearch(e.target.value);
                  setAssigneeOpen(true);
                  if (form.assignee_id) setForm((prev) => ({ ...prev, assignee_id: '' }));
                }}
                placeholder="Search by name, email, or ID"
                className="w-full rounded-lg border border-[color:var(--outline-variant)] px-3 py-2 pr-20 text-sm text-[color:var(--on-surface)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
              />
              {(assigneeSearch || selectedAssignee) && (
                <button
                  type="button"
                  onClick={clearAssignee}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-[color:var(--on-surface-variant)] hover:bg-[color:var(--surface-container-low)]"
                >
                  Clear
                </button>
              )}
            </div>

            {assigneeOpen && (
              <div className="max-h-56 overflow-y-auto rounded-lg border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] shadow-lg">
                {usersLoading ? (
                  <p className="px-3 py-2 text-sm text-[color:var(--on-surface-variant)]">Loading users...</p>
                ) : usersError ? (
                  <p className="px-3 py-2 text-sm text-red-600">{usersError}</p>
                ) : filteredUsers.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-[color:var(--on-surface-variant)]">No matching users found.</p>
                ) : (
                  <ul>
                    {filteredUsers.map((user) => {
                      const active = String(form.assignee_id) === String(user.id);
                      return (
                        <li key={user.id}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleAssigneeSelect(user)}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                              active
                                ? 'bg-[color:var(--surface-container-high)] text-[color:var(--on-surface)]'
                                : 'text-[color:var(--on-surface)] hover:bg-[color:var(--surface-container-low)]'
                            }`}
                          >
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-[color:var(--on-surface-variant)]">
                              {user.email || `ID ${user.id}`} • {user.role}
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
            {selectedAssignee && !assigneeOpen && (
              <p className="text-xs text-[color:var(--on-surface-variant)]">Selected: {getAssigneeLabel(selectedAssignee)}</p>
            )}
          </div>

          {[
            { name: 'title', label: 'Title', type: 'text', required: true },
            { name: 'description', label: 'Description', type: 'textarea' },
            { name: 'deadline', label: 'Deadline', type: 'datetime-local' },
            { name: 'effort', label: 'Effort (1-19)', type: 'number', min: 1, max: 19 },
            { name: 'impact', label: 'Impact (1-10)', type: 'number', min: 1, max: 10 },
            { name: 'workload', label: 'Workload (1-10)', type: 'number', min: 1, max: 10 },
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
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'Todo' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const normalizeStatus = (status) => String(status || 'todo').toLowerCase().replace(/_/g, '-');

const PRIORITY_FILTERS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TaskBoard() {
  const { tasks, loading, error, fetchTasks } = useTaskStore();
  const auth = useMemo(() => getAuthSnapshot(), []);
  const isAdmin = Boolean(auth.isAdmin);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filtered = tasks.filter((t) => {
    const matchesStatus = statusFilter === 'all' || normalizeStatus(t.status) === statusFilter;
    const matchesPriority = priorityFilter === 'all' || String(t.priority_label || '').toLowerCase() === priorityFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      t.title?.toLowerCase().includes(q) ||
      t.assignee?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q);
    return matchesStatus && matchesPriority && matchesSearch;
  }).sort((a, b) => {
    const ranks = { 'High': 3, 'Medium': 2, 'Low': 1 };
    const rankA = ranks[a.priority_label] || 0;
    const rankB = ranks[b.priority_label] || 0;
    return sortOrder === 'desc' ? rankB - rankA : rankA - rankB;
  });

  return (
    <div className=" min-h-screen flex flex-col">
      <PriorityHeader appMode />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-3 py-6 sm:px-6 sm:py-10">
        <section className="stagger-enter rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="mt-1 text-2xl font-headline font-bold tracking-tight text-[color:var(--on-surface)] sm:text-3xl">
                Task Board
              </h1>
              <p className="mt-1 text-sm text-[color:var(--on-surface-variant)]">
                {tasks.length} task{tasks.length !== 1 ? 's' : ''} prioritized by AI score.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchTasks({ force: true })}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-low)] px-4 py-2 text-sm font-semibold text-[color:var(--on-surface)] transition-colors hover:bg-[color:var(--surface-container)]"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                Refresh
              </button>

              {isAdmin && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[color:var(--on-surface)] px-4 py-2 text-sm font-semibold text-[color:var(--surface-container-lowest)] transition-colors hover:bg-[color:var(--inverse-surface)]"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  New Task
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="stagger-enter rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-4 shadow-sm" style={{ animationDelay: '90ms' }}>
        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[180px] flex-1">
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

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-3 py-1.5 text-xs font-semibold text-[color:var(--on-surface)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] hover:bg-[color:var(--surface-container-low)] cursor-pointer"
          >
            {PRIORITY_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          {/* Sort order toggle */}
          <button
            onClick={() => setSortOrder(v => v === 'desc' ? 'asc' : 'desc')}
            className="inline-flex items-center gap-1 min-w-[140px] justify-center rounded-lg border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-3 py-1.5 text-xs font-semibold text-[color:var(--on-surface)] transition-colors hover:bg-[color:var(--surface-container-low)]"
          >
            <span className="material-symbols-outlined text-[16px]">
              {sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'}
            </span>
            Sort: Priority {sortOrder === 'desc' ? '(High→Low)' : '(Low→High)'}
          </button>
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
              onClick={() => fetchTasks({ force: true })}
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

      {showCreate && isAdmin && <CreateTaskModal onClose={() => setShowCreate(false)} />}

      <PriorityFooter />
    </div>
  );
}
