import { useNavigate } from 'react-router-dom';
import { format, parseISO, isValid } from 'date-fns';

// ─── Sequence number circle colours ──────────────────────────────────────────
function sequenceCircleClass(seq) {
  if (seq === 1) return 'bg-amber-400 text-white ring-4 ring-amber-100';
  if (seq === 2) return 'bg-gray-400 text-white ring-4 ring-gray-100';
  if (seq === 3) return 'bg-amber-700 text-white ring-4 ring-amber-100';
  return 'bg-slate-600 text-white ring-2 ring-slate-100';
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_BADGE = {
  todo:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  done:        'bg-green-100 text-green-700',
};
const STATUS_LABEL = {
  todo:        'Todo',
  in_progress: 'In Progress',
  done:        'Done',
};

function formatDeadline(raw) {
  if (!raw) return '—';
  try {
    const d = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
    return isValid(d) ? format(d, 'MMM d, HH:mm') : '—';
  } catch {
    return '—';
  }
}

export default function SequenceCard({ task }) {
  const navigate = useNavigate();
  const seq = task.sequence ?? 0;
  const borderColor = seq === 1 ? 'border-l-amber-400' : 'border-l-slate-200';
  const badgeCls = STATUS_BADGE[task.status] ?? STATUS_BADGE.todo;
  const badgeLabel = STATUS_LABEL[task.status] ?? 'Todo';
  const canAct = task.status === 'todo' || task.status === 'in_progress';

  return (
    <div
      className={`relative bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 ${borderColor} p-5 flex gap-5 group hover:shadow-md transition-shadow duration-200`}
    >
      {/* ── Sequence circle ── */}
      <div className="shrink-0 flex flex-col items-center">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${sequenceCircleClass(seq)}`}
        >
          {seq}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Row 1 – title + status badge */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-gray-900 leading-snug">
            {task.title}
          </h3>
          <span
            className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeCls}`}
          >
            {badgeLabel}
          </span>
        </div>

        {/* Row 2 – meta info */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
          <span>📅 Due: <strong className="text-gray-600">{formatDeadline(task.deadline)}</strong></span>
          <span className="text-gray-200">|</span>
          <span>⚡ Effort: <strong className="text-gray-600">{task.effort ?? '—'}/5</strong></span>
          <span className="text-gray-200">|</span>
          <span>🎯 Impact: <strong className="text-gray-600">{task.impact ?? '—'}/5</strong></span>
          <span className="text-gray-200">|</span>
          <span>
            Score:{' '}
            <strong className="text-gray-600">
              {task.priority_score != null ? Number(task.priority_score).toFixed(1) : '—'}
            </strong>
          </span>
        </div>

        {/* Row 3 – sequence reason */}
        {task.reason && (
          <p className="text-sm text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2 leading-relaxed">
            📋 {task.reason}
          </p>
        )}

        {/* Row 4 – AI scoring note */}
        {task.ai_reasoning && (
          <p className="text-sm text-violet-700 bg-violet-50 rounded-lg px-3 py-2 leading-relaxed">
            🤖 {task.ai_reasoning}
          </p>
        )}

        {/* Row 5 – complaint boost */}
        {task.complaint_boost > 0 && (
          <p className="text-xs font-medium text-orange-600">
            ⚡ Priority boosted by complaint (+{Number(task.complaint_boost).toFixed(0)})
          </p>
        )}

        {/* Bottom right – view in board */}
        {canAct && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => navigate('/tasks')}
              className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              → View in Board
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
