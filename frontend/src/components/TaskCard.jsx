
import { useState } from 'react';
import PriorityBadge from './PriorityBadge';
import TaskExpandView from './TaskExpandView';
import EditTaskModal from './EditTaskModal';
import DeleteConfirmDialog from './DeleteConfirmDialog';

export default function TaskCard({ task }) {
  const [expanded, setExpanded] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const score = task.priority_score ?? 0;
  const leftBorderColor =
    score >= 70 ? 'border-l-rose-500'
    : score >= 40 ? 'border-l-amber-500'
    : 'border-l-emerald-500';

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
                  className="text-orange-500 cursor-help"
                >
                  🔔
                </span>
              )}
              <PriorityBadge score={score} />
            </div>

            {/* Assignee + score compact */}
            <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
              {task.assignee && <span>👤 {task.assignee}</span>}
              <span>Score: <strong className="text-[color:var(--on-surface)]">{score}</strong></span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              onClick={() => setShowEdit(true)}
              className="rounded-lg p-1.5 text-[color:var(--on-surface-variant)] transition-colors hover:bg-[color:var(--surface-container)] hover:text-[color:var(--primary)]"
              title="Edit task"
            >
              ✏️
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="rounded-lg p-1.5 text-[color:var(--on-surface-variant)] transition-colors hover:bg-rose-100 hover:text-rose-600"
              title="Delete task"
            >
              🗑️
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
          style={{ maxHeight: expanded ? '1000px' : '0px', opacity: expanded ? 1 : 0 }}
        >
          <TaskExpandView task={task} />
        </div>
      </article>

      {showEdit && <EditTaskModal task={task} onClose={() => setShowEdit(false)} />}
      {showDelete && <DeleteConfirmDialog task={task} onClose={() => setShowDelete(false)} />}
    </>

  );
}
