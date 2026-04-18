import React from 'react';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
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
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${borderColor} p-4 flex flex-col gap-3 hover:shadow-md transition-shadow relative`}>
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
        <span className="text-sm font-bold text-gray-700">{scoreNum.toFixed(1)}</span>
      </div>

      {/* Title */}
      <h3 className="font-bold text-gray-900 leading-tight line-clamp-2" title={title}>
        {title}
      </h3>

      {/* Middle row */}
      <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
        <span>Due: {deadline ? format(new Date(deadline), "MMM d, h:mm a") : 'No deadline'}</span>
        <span>Effort: {effortDots}</span>
        <span>Impact: {impact}/5</span>
      </div>

      {/* AI Reasoning */}
      {ai_reasoning && (
        <div className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded border border-gray-100">
          🤖 {ai_reasoning}
        </div>
      )}

      {/* Assignee */}
      {assignee && (
        <div className="flex items-center gap-2 mt-auto pt-2">
          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
            {assignee.name ? assignee.name.charAt(0).toUpperCase() : '?'}
          </div>
          <span className="text-xs text-gray-700 truncate">{assignee.name}</span>
        </div>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-2">
        <div>
          {status === 'todo' && (
            <button 
              onClick={() => onStatusChange(id, 'in_progress')}
              className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
            >
              Start
            </button>
          )}
          {status === 'in_progress' && (
            <button 
              onClick={() => onStatusChange(id, 'done')}
              className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 transition-colors"
            >
              Complete ✓
            </button>
          )}
          {status === 'done' && (
            <span className="text-xs font-bold text-green-600">
              Done ✓
            </span>
          )}
        </div>
        
        <button 
          onClick={() => onDelete(id)}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Delete task"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
