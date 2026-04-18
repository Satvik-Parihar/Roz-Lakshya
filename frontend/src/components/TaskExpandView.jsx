import PriorityBadge from './PriorityBadge';
import CountdownTimer from './CountdownTimer';
import StatusButtons from './StatusButtons';

const statusMeta = {
  todo:        { label: 'Todo',        cls: 'bg-gray-100 text-gray-600'   },
  in_progress: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700'   },
  done:        { label: 'Done',        cls: 'bg-green-100 text-green-700'  },
};

export default function TaskExpandView({ task }) {
  const sm = statusMeta[task.status] ?? statusMeta.todo;

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-fade-in">
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
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 cursor-help"
          >
            🔔 +{task.complaint_boost} boost
          </span>
        )}

        {/* Assignee */}
        {task.assignee && (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
            <span className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-800 font-bold text-[10px]">
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
        <p className="text-sm text-gray-600 leading-relaxed">{task.description}</p>
      )}

      {/* AI Reasoning */}
      {task.reasoning && (
        <div className="rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 p-4">
          <p className="text-xs font-semibold text-violet-600 mb-1.5 uppercase tracking-wide">
            🤖 AI Reasoning
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">{task.reasoning}</p>
        </div>
      )}

      {/* Scores */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Priority Score', value: task.priority_score ?? '—' },
          { label: 'Effort',         value: task.effort         ?? '—' },
          { label: 'Impact',         value: task.impact         ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-center">
            <p className="text-lg font-bold text-gray-800">{value}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
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
