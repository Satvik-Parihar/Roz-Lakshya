import { useMemo, useState } from 'react';

import { adminApi } from '../api/taskApi';
import useTaskStore from '../store/useTaskStore';
import { getAuthSnapshot } from '../utils/auth';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import EditTaskModal from './EditTaskModal';
import PriorityBadge from './PriorityBadge';
import TaskExpandView from './TaskExpandView';

export default function TaskCard({ task }) {
  const [expanded, setExpanded] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const [boostValue, setBoostValue] = useState(Number(task.manual_priority_boost || 0));
  const [isPinned, setIsPinned] = useState(Boolean(task.is_pinned));
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideMessage, setOverrideMessage] = useState('');
  const [overrideError, setOverrideError] = useState('');

  const { fetchTasks } = useTaskStore();

  const isAdminUser = useMemo(() => {
    return getAuthSnapshot().isAdmin;
  }, []);

  const score = task.priority_score ?? 0;
  const leftBorderColor =
    score >= 70 ? 'border-l-rose-500'
      : score >= 40 ? 'border-l-amber-500'
        : 'border-l-emerald-500';

  const handleApplyOverride = async () => {
    setOverrideLoading(true);
    setOverrideMessage('');
    setOverrideError('');

    try {
      await adminApi.overrideTask(task.id, {
        manual_priority_boost: Number(boostValue || 0),
        is_pinned: Boolean(isPinned),
        override_reason: overrideReason.trim() || undefined,
      });

      setOverrideMessage('Priority override applied!');
      await fetchTasks();
    } catch {
      setOverrideError('Override failed. Try again.');
    } finally {
      setOverrideLoading(false);
    }
  };

  return (
    <>
      <article
        className={`group rounded-xl border border-[color:var(--outline-variant)]/50 border-l-4 ${leftBorderColor} bg-[color:var(--surface-container-lowest)] p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
      >
        {/* Compact header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {task.title}
              </h3>
              {task.complaint_boost > 0 && (
                <span
                  title="Priority boosted by complaint"
                  className="material-symbols-outlined text-sm text-orange-500 leading-none cursor-help"
                >
                  notifications_active
                </span>
              )}
              {task.is_pinned && (
                <span 
                  title="Pinned by admin" 
                  className="material-symbols-outlined text-sm text-indigo-600 leading-none cursor-help"
                >
                  push_pin
                </span>
              )}
              <PriorityBadge score={score} />
            </div>

            {/* Assignee + score compact */}
            <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
              {task.assignee && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">person</span>
                  {task.assignee}
                </span>
              )}
              <span>Score: <strong className="text-[color:var(--on-surface)]">{score.toFixed(2)}</strong></span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
            <button
              onClick={() => setShowEdit(true)}
              className="rounded-lg p-1.5 text-[color:var(--on-surface-variant)] transition-colors hover:bg-[color:var(--surface-container)] hover:text-[color:var(--primary)]"
              title="Edit task"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="rounded-lg p-1.5 text-[color:var(--on-surface-variant)] transition-colors hover:bg-rose-100 hover:text-rose-600"
              title="Delete task"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-[color:var(--primary)] transition-colors hover:text-[color:var(--primary-container)]"
        >
          <span
            className="inline-block transition-transform duration-200"
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            ▶
          </span>
          {expanded ? 'Collapse' : 'View Details'}
        </button>

        {/* Expanded content with smooth height transition */}
        <div
          className="overflow-hidden transition-all duration-300"
          style={{ maxHeight: expanded ? '1400px' : '0px', opacity: expanded ? 1 : 0 }}
        >
          <TaskExpandView task={task} />

          {isAdminUser && (
            <section className="mt-4 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-4">
              <h4 className="text-sm font-bold text-indigo-700">⚡ Admin Priority Controls</h4>
              <p className="mt-1 text-xs text-indigo-600">Override AI scoring for this task</p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Manual Boost: +{Number(boostValue || 0)} points
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={boostValue}
                    onChange={(e) => setBoostValue(Number(e.target.value || 0))}
                    className="mt-2 w-full accent-indigo-600"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  📌 Pin to Top (Score = 100)
                </label>

                <div>
                  <label className="block text-xs font-semibold text-slate-600">Override Reason (optional)</label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g. Client escalation, board review"
                    className="mt-1 w-full rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleApplyOverride}
                  disabled={overrideLoading}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {overrideLoading ? 'Applying Override...' : 'Apply Override'}
                </button>

                {overrideMessage && <p className="text-sm font-medium text-green-600">✅ {overrideMessage}</p>}
                {overrideError && <p className="text-sm font-medium text-red-600">❌ {overrideError}</p>}
              </div>
            </section>
          )}
        </div>
      </article>

      {showEdit && <EditTaskModal task={task} onClose={() => setShowEdit(false)} />}
      {showDelete && <DeleteConfirmDialog task={task} onClose={() => setShowDelete(false)} />}
    </>
  );
}
