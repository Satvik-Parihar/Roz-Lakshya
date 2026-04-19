import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { alertsApi, dashboardApi, usersApi } from '../api/taskApi';
import PriorityFooter from '../components/PriorityFooter';
import PriorityHeader from '../components/PriorityHeader';
import useTaskStore from '../store/useTaskStore';
import { getAuthSnapshot } from '../utils/auth';

const EMPTY_SUMMARY = {
  total_tasks: 0,
  completed_today: 0,
  in_progress: 0,
  overdue: 0,
  high_priority_active: 0,
  open_complaints: 0,
  total_employees: 0,
  on_hold: 0,
};

const EMPTY_NOTES = {
  high_risk_window: 'Operational notes are loading from live metrics.',
  team_throughput: 'Throughput insight will appear after data fetch completes.',
  source: 'pending',
};

const kpiConfig = [
  { icon: '📋', label: 'Total Tasks', key: 'total_tasks' },
  { icon: '✅', label: 'Completed Today', key: 'completed_today' },
  { icon: '🔄', label: 'In Progress', key: 'in_progress' },
  { icon: '⚠️', label: 'Overdue', key: 'overdue' },
  { icon: '🔥', label: 'High Priority', key: 'high_priority_active' },
  { icon: '📢', label: 'Open Complaints', key: 'open_complaints' },
  { icon: '👥', label: 'Total Employees', key: 'total_employees' },
  { icon: '⏸️', label: 'On Hold', key: 'on_hold' },
];

const PIE_COLORS = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#10b981',
};

function abbreviateDepartment(name) {
  const map = {
    Engineering: 'Eng',
    Product: 'Prod',
    Marketing: 'Mkt',
    Finance: 'Fin',
    Operations: 'Ops',
    Sales: 'Sales',
    Legal: 'Legal',
    QA: 'QA',
    HR: 'HR',
    'Customer Support': 'Support',
  };
  return map[name] || name;
}

function truncateTitle(value) {
  const text = String(value || 'Untitled Task').trim();
  if (text.length <= 60) return text;
  return `${text.slice(0, 60)}...`;
}

function getPriorityBadgeClass(priorityLabel) {
  const label = (priorityLabel || '').toLowerCase();
  if (label === 'high') return 'bg-red-100 text-red-700 border-red-200';
  if (label === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-green-100 text-green-700 border-green-200';
}

function formatStatus(status) {
  const normalized = (status || 'todo').replace('_', '-').toLowerCase();
  if (normalized === 'in-progress') return 'In Progress';
  if (normalized === 'done') return 'Done';
  return 'Todo';
}

function getStatusPillClass(status) {
  const normalized = (status || '').replace('_', '-').toLowerCase();
  if (normalized === 'done') return 'bg-green-100 text-green-700';
  if (normalized === 'in-progress') return 'bg-amber-100 text-amber-700';
  return 'bg-indigo-100 text-indigo-700';
}

export default function Dashboard() {
  const { tasks, fetchTasks } = useTaskStore();
  const auth = useMemo(() => getAuthSnapshot(), []);
  const isAdmin = Boolean(auth.isAdmin);
  const [summary, setSummary] = useState(null);
  const [workloadMode, setWorkloadMode] = useState(() => (isAdmin ? 'department' : 'user'));
  const [workload, setWorkload] = useState([]);
  const [departmentWorkload, setDepartmentWorkload] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [bottlenecks, setBottlenecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [triggeringAlerts, setTriggeringAlerts] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({ name: '', email: '', role: 'team_member' });
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeCreated, setEmployeeCreated] = useState(null);
  const [employeeError, setEmployeeError] = useState('');
  const [operationalNotes, setOperationalNotes] = useState(EMPTY_NOTES);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);

  const loadAdminUsers = useCallback(async () => {
    if (!isAdmin) return;
    setAdminUsersLoading(true);
    try {
      const response = await usersApi.getAdmins(200);
      setAdminUsers(Array.isArray(response?.data) ? response.data : []);
    } catch {
      setAdminUsers([]);
    } finally {
      setAdminUsersLoading(false);
    }
  }, [isAdmin]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const needsExtraDepartmentCall = workloadMode === 'user';
      const requests = [
        dashboardApi.getSummary(),
        dashboardApi.getWorkload(workloadMode),
        dashboardApi.getBottlenecks(),
        dashboardApi.getDepartments(),
        dashboardApi.getOperationalNotes(),
      ];

      if (needsExtraDepartmentCall) {
        requests.push(dashboardApi.getWorkload('department'));
      }

      const settled = await Promise.allSettled(requests);
      const [summaryRes, workloadRes, bottlenecksRes, departmentsRes, notesRes, deptWorkloadRes] = settled;

      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value.data || EMPTY_SUMMARY);
      } else {
        setSummary(EMPTY_SUMMARY);
      }

      if (workloadRes.status === 'fulfilled') {
        setWorkload(Array.isArray(workloadRes.value.data) ? workloadRes.value.data : []);
      } else {
        setWorkload([]);
      }

      if (bottlenecksRes.status === 'fulfilled') {
        setBottlenecks(Array.isArray(bottlenecksRes.value.data) ? bottlenecksRes.value.data : []);
      } else {
        setBottlenecks([]);
      }

      if (departmentsRes.status === 'fulfilled') {
        setDepartments(Array.isArray(departmentsRes.value.data) ? departmentsRes.value.data : []);
      } else {
        setDepartments([]);
      }

      if (notesRes.status === 'fulfilled') {
        setOperationalNotes({ ...EMPTY_NOTES, ...(notesRes.value.data || {}) });
      } else {
        setOperationalNotes(EMPTY_NOTES);
      }

      if (workloadMode === 'department') {
        if (workloadRes.status === 'fulfilled') {
          setDepartmentWorkload(Array.isArray(workloadRes.value.data) ? workloadRes.value.data : []);
        } else {
          setDepartmentWorkload([]);
        }
      } else if (deptWorkloadRes?.status === 'fulfilled') {
        setDepartmentWorkload(Array.isArray(deptWorkloadRes.value.data) ? deptWorkloadRes.value.data : []);
      } else {
        setDepartmentWorkload([]);
      }

      const failedCount = settled.filter((item) => item.status === 'rejected').length;
      if (failedCount > 0) {
        setError(`Some dashboard blocks failed to load (${failedCount}). Showing available live data.`);
      }
    } catch {
      setError('Failed to load dashboard data. Is the backend running?');
      setSummary(EMPTY_SUMMARY);
      setWorkload([]);
      setDepartmentWorkload([]);
      setDepartments([]);
      setBottlenecks([]);
      setOperationalNotes(EMPTY_NOTES);
    } finally {
      setLoading(false);
    }
  }, [workloadMode]);

  useEffect(() => {
    fetchAll();
    fetchTasks();
    const interval = window.setInterval(() => {
      fetchAll();
      fetchTasks();
    }, 20000);
    return () => window.clearInterval(interval);
  }, [fetchAll, fetchTasks]);

  useEffect(() => {
    if (isAdmin && employeeForm.role === 'admin') {
      loadAdminUsers();
    }
  }, [isAdmin, employeeForm.role, loadAdminUsers]);

  const localSummary = useMemo(() => {
    const totalTasks = tasks.length;
    const completed = tasks.filter((task) => task.status === 'done').length;
    const inProgress = tasks.filter((task) => ['in-progress', 'in_progress'].includes(task.status)).length;
    const highPriorityActive = tasks.filter(
      (task) => (task.priority_label || '').toLowerCase() === 'high' && task.status !== 'done',
    ).length;
    const onHold = tasks.filter((task) => task.status === 'todo' && Number(task.priority_score || 0) < 20).length;

    return {
      ...EMPTY_SUMMARY,
      total_tasks: totalTasks,
      completed_today: completed,
      in_progress: inProgress,
      high_priority_active: highPriorityActive,
      on_hold: onHold,
    };
  }, [tasks]);

  const safeSummary = summary || localSummary;
  const visibleBottlenecks = bottlenecks.slice(0, 20);

  const workloadChartData = useMemo(() => {
    if (!Array.isArray(workload)) return [];
    if (workloadMode === 'department') {
      return workload.map((item) => ({
        ...item,
        label: abbreviateDepartment(item.department || item.user_name || 'My Tasks'),
      }));
    }
    return workload.map((item) => ({
      ...item,
      label: item.user_name,
    }));
  }, [workload, workloadMode]);

  const overdueChartData = useMemo(() => {
    const sorted = [...departments].sort((a, b) => Number(b.overdue_tasks || 0) - Number(a.overdue_tasks || 0));
    return sorted;
  }, [departments]);

  const priorityPieData = useMemo(() => {
    const totals = departmentWorkload.reduce((acc, item) => {
      acc.High += Number(item.high_priority_count || 0);
      acc.Medium += Number(item.medium_priority_count || 0);
      acc.Low += Number(item.low_priority_count || 0);
      return acc;
    }, { High: 0, Medium: 0, Low: 0 });

    return [
      { name: 'High', value: totals.High },
      { name: 'Medium', value: totals.Medium },
      { name: 'Low', value: totals.Low },
    ];
  }, [departmentWorkload]);

  const pieTotal = useMemo(
    () => priorityPieData.reduce((sum, item) => sum + Number(item.value || 0), 0),
    [priorityPieData],
  );

  const departmentTableData = useMemo(
    () => [...departments].sort((a, b) => Number(b.overdue_tasks || 0) - Number(a.overdue_tasks || 0)),
    [departments],
  );

  const handleForceAlertCheck = async () => {
    setTriggeringAlerts(true);
    try {
      await alertsApi.triggerCheck();
      window.setTimeout(() => {
        fetchAll();
      }, 3000);
    } catch {
      setError('Failed to trigger manual alert check.');
    } finally {
      setTriggeringAlerts(false);
    }
  };

  const handleCreateEmployee = async (event) => {
    event.preventDefault();
    setEmployeeError('');
    setEmployeeCreated(null);

    if (!employeeForm.name.trim() || !employeeForm.email.trim()) {
      setEmployeeError('Employee name and email are required.');
      return;
    }

    setEmployeeLoading(true);
    try {
      const response = await usersApi.createEmployee({
        name: employeeForm.name.trim(),
        email: employeeForm.email.trim(),
        role: employeeForm.role,
      });
      setEmployeeCreated(response.data);
      setEmployeeForm({ name: '', email: '', role: 'team_member' });
      await loadAdminUsers();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setEmployeeError(typeof detail === 'string' ? detail : 'Failed to create employee.');
    } finally {
      setEmployeeLoading(false);
    }
  };

  return (
    <div className=" min-h-screen flex flex-col">
      <PriorityHeader appMode />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-3 py-6 sm:px-6 sm:py-10">
        <section className="rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-4 shadow-sm sm:p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[color:var(--primary)]">Manager View</p>
          <h1 className="mt-1 font-headline text-2xl font-bold tracking-tight text-[color:var(--on-surface)] sm:text-3xl">Dashboard</h1>
          <p className="mt-2 text-sm text-[color:var(--on-surface-variant)]">
            Monitor workload distribution and priority execution quality across your active queue.
          </p>
        </section>

        {isAdmin && (
          <section className="rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-4 shadow-sm sm:p-6">
            <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">Add Employee</h2>
            <p className="mt-1 text-sm text-[color:var(--on-surface-variant)]">
              Create employee login and generate a temporary password for first-time sign-in.
            </p>

            <form onSubmit={handleCreateEmployee} className="mt-4 grid gap-3 md:grid-cols-4">
              <input
                id="employee-name"
                name="employee-name"
                type="text"
                placeholder="Employee name"
                value={employeeForm.name}
                onChange={(e) => setEmployeeForm((prev) => ({ ...prev, name: e.target.value }))}
                className="rounded-md border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-3 py-2 text-sm text-[color:var(--on-surface)] outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
              />
              <input
                id="employee-email"
                name="employee-email"
                type="email"
                placeholder="employee@company.com"
                value={employeeForm.email}
                onChange={(e) => setEmployeeForm((prev) => ({ ...prev, email: e.target.value }))}
                className="rounded-md border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-3 py-2 text-sm text-[color:var(--on-surface)] outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
              />
              <select
                id="employee-role"
                name="employee-role"
                value={employeeForm.role}
                onChange={(e) => setEmployeeForm((prev) => ({ ...prev, role: e.target.value }))}
                className="rounded-md border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-3 py-2 text-sm text-[color:var(--on-surface)] outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
              >
                <option value="team_member">Team Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={employeeLoading}
                className="rounded-md bg-[color:var(--on-surface)] px-4 py-2 text-sm font-semibold text-[color:var(--surface-container-lowest)] hover:bg-[color:var(--inverse-surface)] disabled:opacity-60"
              >
                {employeeLoading ? 'Creating...' : 'Create Employee'}
              </button>
            </form>

            {employeeError && <p className="mt-3 text-sm text-red-600">{employeeError}</p>}

            {employeeCreated && (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <p className="font-semibold">Employee created successfully</p>
                <p className="mt-1">Email: {employeeCreated.email}</p>
                <p>Temporary Password: <span className="font-bold">{employeeCreated.temp_password}</span></p>
                <p className="mt-1 text-xs">Employee must reset password on first login.</p>
              </div>
            )}

            {employeeForm.role === 'admin' && (
              <div className="mt-4 rounded-md border border-[color:var(--outline-variant)]/60 bg-[color:var(--surface-container-low)] p-4">
                <p className="text-sm font-semibold text-[color:var(--on-surface)]">Current Admin Users</p>
                {adminUsersLoading ? (
                  <p className="mt-2 text-xs text-[color:var(--on-surface-variant)]">Loading admins...</p>
                ) : adminUsers.length === 0 ? (
                  <p className="mt-2 text-xs text-[color:var(--on-surface-variant)]">No admin users found in this company scope.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-xs text-[color:var(--on-surface-variant)]">
                    {adminUsers.map((u) => (
                      <li key={u.id}>
                        {u.name} {u.email ? `(${u.email})` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        )}

        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-sm text-[color:var(--on-surface-variant)]">Live team performance overview</p>
          <button
            type="button"
            onClick={fetchAll}
            disabled={loading}
            className="w-full rounded-xl border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] px-4 py-2 text-sm font-semibold text-[color:var(--on-surface)] shadow-sm hover:bg-[color:var(--surface-container-low)] disabled:opacity-60 sm:w-auto"
          >
            🔄 Refresh
          </button>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-800">📈 KPI Snapshot</h2>
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6 animate-pulse space-y-3">
                  <div className="h-4 w-20 rounded bg-slate-200" />
                  <div className="h-8 w-16 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiConfig.map((card) => (
                <article key={card.key} className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    <span className="mr-1">{card.icon}</span>
                    {card.label}
                  </p>
                  <p
                    className={`text-2xl font-black sm:text-3xl ${
                      card.key === 'overdue' && safeSummary.overdue > 0
                        ? 'text-red-600'
                        : card.key === 'high_priority_active' && safeSummary.high_priority_active > 0
                          ? 'text-orange-600'
                          : 'text-gray-900'
                    }`}
                  >
                    {safeSummary[card.key] ?? 0}
                  </p>
                </article>
              ))}
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleForceAlertCheck}
              disabled={triggeringAlerts}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            >
              {triggeringAlerts ? 'Triggering...' : '🔔 Force Alert Check (Demo)'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-800">🏢 Department Workload</h2>
            {isAdmin && (
              <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setWorkloadMode('department')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                    workloadMode === 'department' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                  }`}
                >
                  By Department
                </button>
                <button
                  type="button"
                  onClick={() => setWorkloadMode('user')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                    workloadMode === 'user' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                  }`}
                >
                  By User
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="h-[320px] rounded-xl bg-slate-100 animate-pulse" />
          ) : workloadChartData.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-slate-400 font-semibold">
              No team workload data yet
            </div>
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadChartData} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="in_progress" name="In Progress" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="todo" name="Todo" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <article className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5 space-y-4">
            <h2 className="text-xl font-bold text-slate-800">🚨 Overdue Tasks by Department</h2>
            {loading ? (
              <div className="h-[320px] rounded-xl bg-slate-100 animate-pulse" />
            ) : overdueChartData.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-slate-400 font-semibold">
                No department data available
              </div>
            ) : (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overdueChartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} stroke="#64748b" tickLine={false} axisLine={false} />
                    <YAxis dataKey="department" type="category" stroke="#64748b" tickLine={false} axisLine={false} width={110} />
                    <Tooltip />
                    <Bar dataKey="overdue_tasks" name="Overdue" fill="#ef4444" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5 space-y-4">
            <h2 className="text-xl font-bold text-slate-800">🎯 Priority Distribution</h2>
            {loading ? (
              <div className="h-[280px] rounded-xl bg-slate-100 animate-pulse" />
            ) : pieTotal === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-slate-400 font-semibold">
                No priority distribution data yet
              </div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={92}
                      label={({ value }) => `${((Number(value || 0) / pieTotal) * 100).toFixed(1)}%`}
                    >
                      {priorityPieData.map((entry) => (
                        <Cell key={entry.name} fill={PIE_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => Number(value).toLocaleString()} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </article>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800">🚨 Stalled Tasks</h2>
            {!loading && bottlenecks.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                {bottlenecks.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-11 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : visibleBottlenecks.length === 0 ? (
            <div className="rounded-xl bg-green-50 border border-green-100 text-green-700 font-semibold px-4 py-3">
              ✅ No stalled tasks — great work!
            </div>
          ) : (
            <div className="space-y-3">
              {/* Mobile card view */}
              <div className="sm:hidden space-y-3">
                {visibleBottlenecks.map((task) => (
                  <div key={task.task_id} className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{truncateTitle(task.title || `Task #${task.task_id}`)}</p>
                        <p className="text-xs text-slate-400">Task #{task.task_id} · {task.assignee_name || 'Unassigned'}</p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold border ${getPriorityBadgeClass(task.priority_label)}`}>
                        {task.priority_label || 'Low'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${getStatusPillClass(task.status)}`}>{formatStatus(task.status)}</span>
                      <span className={`font-semibold ${Number(task.hours_stalled || 0) > 48 ? 'text-red-600' : 'text-amber-600'}`}>
                        ⏱ {Number(task.hours_stalled || 0).toFixed(1)}h stalled
                      </span>
                      <span className="text-slate-500">📅 {Number(task.deadline_days || 0)}d deadline</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table view */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left min-w-[640px]">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                      <th className="py-2">Task</th>
                      <th className="py-2">Assignee</th>
                      <th className="py-2">Priority</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Hours Stalled</th>
                      <th className="py-2">Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleBottlenecks.map((task) => (
                      <tr key={task.task_id} className="border-b border-slate-50">
                        <td className="py-3">
                          <p className="text-sm font-semibold text-slate-800">{truncateTitle(task.title || `Task #${task.task_id}`)}</p>
                          <p className="text-xs text-slate-400">Task #{task.task_id}</p>
                        </td>
                        <td className="py-3 text-sm text-slate-700 font-medium">{task.assignee_name || 'Unassigned'}</td>
                        <td className="py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getPriorityBadgeClass(task.priority_label)}`}>
                            {task.priority_label || 'Low'}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusPillClass(task.status)}`}>
                            {formatStatus(task.status)}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`text-sm font-semibold ${Number(task.hours_stalled || 0) > 48 ? 'text-red-600' : 'text-amber-600'}`}>
                            {Number(task.hours_stalled || 0).toFixed(1)}h
                          </span>
                        </td>
                        <td className="py-3 text-sm text-slate-600">{Number(task.deadline_days || 0)} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5 space-y-4">
          <h2 className="text-xl font-bold text-slate-800">📊 Department Overview</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-11 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : departmentTableData.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
              No department overview data yet
            </div>
          ) : (
            <div>
              {/* Mobile card view */}
              <div className="sm:hidden space-y-3">
                {departmentTableData.map((row) => (
                  <div key={row.department} className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                    <p className="text-sm font-bold text-slate-800">{row.department}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span>👥 {Number(row.employee_count || 0)} employees</span>
                      <span>📋 {Number(row.total_tasks_assigned || 0)} total tasks</span>
                      <span>📂 {Number(row.open_tasks || 0)} open</span>
                      <span className={Number(row.overdue_tasks || 0) > 5 ? 'font-bold text-red-600' : ''}>
                        ⚠️ {Number(row.overdue_tasks || 0)} overdue
                      </span>
                      <span>📢 {Number(row.complaints_handled || 0)} complaints</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table view */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full min-w-[600px] text-left">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                      <th className="py-3">Department</th>
                      <th className="py-3">Employees</th>
                      <th className="py-3">Total Tasks</th>
                      <th className="py-3">Open</th>
                      <th className="py-3">Overdue</th>
                      <th className="py-3">Complaints Handled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentTableData.map((row, index) => (
                      <tr key={row.department} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="py-3 px-1 text-sm font-semibold text-slate-800">{row.department}</td>
                        <td className="py-3 px-1 text-sm text-slate-700">{Number(row.employee_count || 0).toLocaleString()}</td>
                        <td className="py-3 px-1 text-sm text-slate-700">{Number(row.total_tasks_assigned || 0).toLocaleString()}</td>
                        <td className="py-3 px-1 text-sm text-slate-700">{Number(row.open_tasks || 0).toLocaleString()}</td>
                        <td className={`py-3 px-1 text-sm ${Number(row.overdue_tasks || 0) > 5 ? 'font-bold text-red-600' : 'text-slate-700'}`}>
                          {Number(row.overdue_tasks || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-1 text-sm text-slate-700">{Number(row.complaints_handled || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-6 shadow-sm">
          <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">Operational Notes</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <article className="rounded-lg border border-[color:var(--outline-variant)]/50 bg-transparent p-4">
              <h3 className="font-semibold text-[color:var(--on-surface)]">High-risk window</h3>
              <p className="mt-2 text-sm text-[color:var(--on-surface-variant)]">{operationalNotes.high_risk_window}</p>
            </article>
            <article className="rounded-lg border border-[color:var(--outline-variant)]/50 bg-transparent p-4">
              <h3 className="font-semibold text-[color:var(--on-surface)]">Team throughput</h3>
              <p className="mt-2 text-sm text-[color:var(--on-surface-variant)]">{operationalNotes.team_throughput}</p>
            </article>
          </div>
          <p className="mt-3 text-xs text-[color:var(--on-surface-variant)]">Source: {String(operationalNotes.source || 'unknown').toUpperCase()}</p>
        </section>
      </main>

      <PriorityFooter />
    </div>
  );
}
