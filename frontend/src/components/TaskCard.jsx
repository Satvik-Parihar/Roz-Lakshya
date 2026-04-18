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
    score >= 70 ? 'border-l-red-500'
    : score >= 40 ? 'border-l-yellow-500'
    : 'border-l-green-500';

  return (
    <>
      <article
        className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${leftBorderColor} shadow-sm hover:shadow-md transition-all duration-200 p-5 group`}
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
              <span>Score: <strong className="text-gray-600">{score}</strong></span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              onClick={() => setShowEdit(true)}
              className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
              title="Edit task"
            >
              ✏️
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete task"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
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
