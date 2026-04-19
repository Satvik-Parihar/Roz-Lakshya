import React from 'react';
import { format } from 'date-fns';
import PriorityBadge from './PriorityBadge';

export default function TaskCard({ task, onStatusChange, onDelete }) {
  const {
    id, title, description, deadline, effort, impact,
    status, priority_score, complaint_boost, ai_reasoning,
    assignee
  } = task;

  const scoreNum = Number(priority_score) || 0;
  
  let borderColor = 'border-l-green-500';
  if (scoreNum >= 75) borderColor = 'border-l-red-500';
  else if (scoreNum >= 50) borderColor = 'border-l-amber-500';

  const effortDots = Array.from({ length: 5 }, (_, i) => i < effort ? '●' : '○').join('');

  return (
    <div className={`bg-[color:var(--surface-container-lowest)] rounded-lg shadow-sm border border-[color:var(--outline-variant)]/40 border-l-4 ${borderColor} p-4 flex flex-col gap-3 hover:shadow-md transition-shadow relative`}>
      {/* Top row */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge score={scoreNum} />
          {complaint_boost > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              ⚡ +{Number(complaint_boost).toFixed(0)} complaint boost
            </span>
          )}
        </div>
        <span className="text-sm font-bold font-mono text-[color:var(--on-surface-variant)]">{scoreNum.toFixed(1)}</span>
      </div>

      {/* Title */}
      <h3 className="font-headline font-bold text-[color:var(--on-surface)] leading-tight line-clamp-2" title={title}>
        {title}
      </h3>

      {/* Middle row */}
      <div className="text-[11px] uppercase tracking-wider font-bold text-[color:var(--on-surface-variant)] flex flex-wrap gap-x-4 gap-y-1">
        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_today</span> {deadline ? format(new Date(deadline), "MMM d, h:mm a") : 'No deadline'}</span>
        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">hourglass_bottom</span> {effortDots}</span>
        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">trending_up</span> {impact}/5</span>
      </div>

      {/* AI Reasoning */}
      {ai_reasoning && (
        <div className="text-xs text-[color:var(--on-surface-variant)] leading-relaxed bg-[color:var(--surface-container)]/50 p-2.5 rounded border border-[color:var(--outline-variant)]/30 flex gap-2">
          <span className="material-symbols-outlined text-[16px] text-[color:var(--primary)] shrink-0">vital_signs</span>
          <span>{ai_reasoning}</span>
        </div>
      )}

      {/* Assignee */}
      {assignee && (
        <div className="flex items-center gap-2 mt-auto pt-2">
          <div className="w-6 h-6 rounded-full bg-[color:var(--on-surface)] text-[color:var(--surface-container-lowest)] flex items-center justify-center text-xs font-bold shrink-0">
            {assignee.name ? assignee.name.charAt(0).toUpperCase() : '?'}
          </div>
          <span className="text-xs text-[color:var(--on-surface-variant)] font-semibold truncate">{assignee.name}</span>
        </div>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between border-t border-[color:var(--outline-variant)]/30 pt-3 mt-2">
        <div>
          {status === 'todo' && (
            <button 
              onClick={() => onStatusChange(id, 'in_progress')}
              className="text-xs font-semibold px-3 py-1.5 bg-[color:var(--on-surface)] text-[color:var(--surface-container-lowest)] rounded hover:bg-[color:var(--inverse-surface)] transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">play_arrow</span>
              Start
            </button>
          )}
          {status === 'in_progress' && (
            <button 
              onClick={() => onStatusChange(id, 'done')}
              className="text-xs font-semibold px-3 py-1.5 bg-[color:var(--primary)] text-[color:var(--surface-container-lowest)] rounded hover:bg-[color:var(--primary-container)] transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">check</span>
              Complete
            </button>
          )}
          {status === 'done' && (
            <span className="text-xs font-bold text-green-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              Done
            </span>
          )}
        </div>
        
        <button 
          onClick={() => onDelete(id)}
          className="p-1.5 text-[color:var(--on-surface-variant)] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Delete task"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
    </div>
  );
}
