import PriorityBadge from './PriorityBadge';
import CountdownTimer from './CountdownTimer';
import StatusButtons from './StatusButtons';

const statusMeta = {
  todo:        { label: 'Todo',        cls: 'bg-[color:var(--surface-container)] text-[color:var(--on-surface-variant)]' },
  'in-progress': { label: 'In Progress', cls: 'bg-[color:var(--secondary-container)] text-[color:var(--on-secondary-container)]' },
  in_progress: { label: 'In Progress', cls: 'bg-[color:var(--secondary-container)] text-[color:var(--on-secondary-container)]' },
  done:        { label: 'Done',        cls: 'bg-emerald-100 text-emerald-700' },
};

export default function TaskExpandView({ task }) {
  const sm = statusMeta[task.status] ?? statusMeta.todo;

  return (
    <div className="mt-4 space-y-4 border-t border-[color:var(--outline-variant)]/40 pt-4 animate-fade-in">
      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status badge */}
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${sm.cls}`}>
          {sm.label}
        </span>

        {/* Priority */}
        <PriorityBadge score={task.priority_score} />

        {/* Complaint boost */}
        {task.complaint_boost > 0 && (
          <span
            title="Priority boosted by complaint"
            className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 cursor-help"
          >
            🔔 +{task.complaint_boost} boost
          </span>
        )}

        {/* Assignee */}
        {task.assignee && (
          <span className="flex items-center gap-1.5 rounded-full bg-[color:var(--surface-container)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--on-surface)]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--secondary-container)] text-[10px] font-bold text-[color:var(--on-secondary-container)]">
              {task.assignee[0]?.toUpperCase()}
            </span>
            {task.assignee}
          </span>
        )}

        {/* Countdown */}
        <CountdownTimer deadline={task.deadline} />
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm leading-relaxed text-[color:var(--on-surface-variant)]">{task.description}</p>
      )}

      {/* AI Reasoning */}
      {task.reasoning && (
        <div className="rounded-xl border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-low)] p-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--primary)]">
            🤖 AI Reasoning
          </p>
          <p className="text-sm leading-relaxed text-[color:var(--on-surface)]">{task.reasoning}</p>
        </div>
      )}

      {/* Scores */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Priority Score', value: typeof task.priority_score === 'number' ? task.priority_score.toFixed(2) : (task.priority_score ?? '—') },
          { label: 'Effort',         value: task.effort         ?? '—' },
          { label: 'Impact',         value: task.impact         ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-[color:var(--outline-variant)]/50 bg-[color:var(--surface)] p-3 text-center">
            <p className="text-lg font-bold text-[color:var(--on-surface)]">{value}</p>
            <p className="mt-0.5 text-[11px] text-[color:var(--on-surface-variant)]">{label}</p>
          </div>
        ))}
      </div>

      {/* Status actions */}
      <div className="flex items-center justify-end">
        <StatusButtons task={task} />
      </div>
    </div>
  );
}
