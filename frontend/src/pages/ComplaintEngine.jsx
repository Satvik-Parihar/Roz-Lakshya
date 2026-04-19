import { useEffect, useMemo, useRef, useState } from 'react';

import PriorityFooter from '../components/PriorityFooter';
import PriorityHeader from '../components/PriorityHeader';
import { complaintApi, taskApi } from '../api/taskApi';

export default function ComplaintEngine() {
  const [text, setText] = useState('');
  const [channel, setChannel] = useState('email');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskLookupError, setTaskLookupError] = useState('');
  const [taskQuery, setTaskQuery] = useState('');
  const [taskOpen, setTaskOpen] = useState(false);
  const [message, setMessage] = useState('');
  const taskMenuRef = useRef(null);

  useEffect(() => {
    loadComplaints();
    loadTasks();
  }, []);

  useEffect(() => {
    const handleOutside = (event) => {
      if (!taskMenuRef.current) return;
      if (!taskMenuRef.current.contains(event.target)) {
        setTaskOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const loadComplaints = async () => {
    try {
      const res = await complaintApi.getAll();
      setComplaints(res.data);
    } catch (err) {
      console.error('Failed to load complaints', err);
    }
  };

  const loadTasks = async () => {
    setTasksLoading(true);
    setTaskLookupError('');
    try {
      const res = await taskApi.getAll(300);
      const rows = Array.isArray(res?.data) ? res.data : [];
      const relevant = rows.filter((t) => String(t.status || '').toLowerCase() !== 'done');
      setTasks(relevant);
    } catch {
      setTasks([]);
      setTaskLookupError('Unable to load tasks for complaint linkage right now.');
    } finally {
      setTasksLoading(false);
    }
  };

  const selectedTask = useMemo(() => {
    const byTaskNumber = tasks.find((t) => String(t.task_id) === String(taskQuery).trim());
    if (byTaskNumber) return byTaskNumber;
    return null;
  }, [tasks, taskQuery]);

  const filteredTasks = useMemo(() => {
    const q = String(taskQuery || '').trim().toLowerCase();
    if (!q) return tasks.slice(0, 80);
    return tasks
      .filter((t) => {
        const taskNumber = String(t.task_id || '');
        const title = String(t.title || '').toLowerCase();
        const assignee = String(t.assignee_name || t.assignee || '').toLowerCase();
        return taskNumber.includes(q) || title.includes(q) || assignee.includes(q);
      })
      .slice(0, 80);
  }, [tasks, taskQuery]);

  const handleTaskSelect = (task) => {
    setTaskQuery(String(task.task_id));
    setTaskOpen(false);
  };

  const clearTaskSelection = () => {
    setTaskQuery('');
    setTaskOpen(false);
  };

  const getTaskLabel = (task) => {
    const member = task.assignee_name || task.assignee || 'Unassigned';
    return `#${task.task_id} - ${task.title || 'Untitled'} (${member})`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setResult(null);
    setMessage('');

    try {
      const payload = {
        text,
        channel,
        linked_task_id: selectedTask?.id,
      };
      const res = await complaintApi.create(payload);
      setResult(res.data);
      setText('');
      setTaskQuery('');
      await loadComplaints();
      await loadTasks();
      setMessage('Complaint classified and recorded successfully. Linked task priority was refreshed.');
    } catch (err) {
      setMessage('Error submitting complaint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className=" min-h-screen flex flex-col">
      <PriorityHeader appMode />

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-3 py-6 sm:px-6 sm:py-10">
        <section className="stagger-enter rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-lowest)] p-4 shadow-sm sm:p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[color:var(--primary)]">Complaint Engine</p>
          <h1 className="mt-1 text-2xl font-headline font-bold tracking-tight text-[color:var(--on-surface)] sm:text-3xl">
            Complaint Engine
          </h1>
          <p className="mt-1 text-sm text-[color:var(--on-surface-variant)]">
            Intelligent classification and priority boosting
          </p>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Register New Complaint</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="email">Email</option>
                <option value="call">Call</option>
                <option value="direct">Direct</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Input Text</label>
              <textarea
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Describe the issue in detail..."
                className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>

            <div className="flex flex-col gap-1" ref={taskMenuRef}>
              <label className="text-xs font-bold text-slate-400 uppercase">Task Number / Title (Optional)</label>
              <div className="relative">
                <input
                  type="text"
                  value={taskQuery}
                  onFocus={() => setTaskOpen(true)}
                  onChange={(e) => {
                    setTaskQuery(e.target.value);
                    setTaskOpen(true);
                  }}
                  placeholder="Search by task number, title, or member"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-16 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                {taskQuery && (
                  <button
                    type="button"
                    onClick={clearTaskSelection}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                  >
                    Clear
                  </button>
                )}
              </div>

              {taskOpen && (
                <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow">
                  {tasksLoading ? (
                    <p className="px-3 py-2 text-sm text-slate-500">Loading tasks...</p>
                  ) : taskLookupError ? (
                    <p className="px-3 py-2 text-sm text-red-600">{taskLookupError}</p>
                  ) : filteredTasks.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-slate-500">No matching tasks found.</p>
                  ) : (
                    <ul>
                      {filteredTasks.map((task) => (
                        <li key={task.id}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleTaskSelect(task)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                          >
                            {getTaskLabel(task)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Linked Member</label>
              <input
                type="text"
                readOnly
                value={selectedTask ? (selectedTask.assignee_name || selectedTask.assignee || 'Unassigned') : 'Not selected'}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'AI Classifying...' : 'Submit Complaint'}
            </button>
          </form>

          {message && <p className={`mt-3 text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>}
        </section>

        {result && (
          <section className="animate-in slide-in-from-bottom-4 fade-in rounded-2xl bg-indigo-600 p-4 text-white shadow-xl duration-500 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded uppercase tracking-widest">{result.category}</span>
                <h3 className="mt-2 text-xl font-bold sm:text-2xl">AI Classification Result</h3>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold opacity-70 uppercase">Priority</p>
                <p className={`text-xl font-black ${result.priority === 'High' ? 'text-red-300' : 'text-yellow-300'}`}>{result.priority}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold opacity-70 uppercase mb-2">Resolution Steps</p>
                  <ul className="space-y-2">
                    {result.resolution_steps?.map((step, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="bg-white/20 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-4 space-y-4 border border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-sm">SLA Deadline</span>
                  <span className="text-sm font-bold bg-white text-indigo-600 px-2 py-0.5 rounded">{result.sla_hours} hours</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Urgency Score</span>
                  <span className="font-bold underline">{Number(result.urgency_score || 0).toFixed(1)}/100</span>
                </div>
                {result.linked_task_id && (
                  <div className="pt-2 border-t border-white/20">
                    <p className="text-[10px] font-bold opacity-70 uppercase mb-1">Impact Bridge</p>
                    <p className="text-sm">
                      Linked to Task #{result.linked_task_number || result.linked_task_id}
                      {result.linked_member_name ? ` (${result.linked_member_name})` : ''}
                    </p>
                    <p className="text-[10px] text-indigo-200">Automatically boosted associated task priority score.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Recent Complaints</h2>
          <div className="grid grid-cols-1 gap-4">
            {complaints.map((c) => (
              <div key={c.id} className="group flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-10 rounded ${c.priority === 'High' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 line-clamp-1">{c.text}</p>
                    {c.linked_task_id && (
                      <p className="mt-1 text-xs text-slate-500">
                        Linked Task #{c.linked_task_number || c.linked_task_id}
                        {c.linked_member_name ? ` • ${c.linked_member_name}` : ''}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase px-1.5 py-0.5 border border-slate-100 rounded bg-slate-50">{c.category}</span>
                      <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded capitalize ${c.status === 'open' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <PriorityFooter />
    </div>
  );
}
