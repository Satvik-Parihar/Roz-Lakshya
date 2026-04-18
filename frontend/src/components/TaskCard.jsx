import React, { useState } from 'react';
import PriorityBadge from './PriorityBadge';
import { differenceInHours, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, Bell, Edit2, Trash2, CheckCircle2 } from 'lucide-react';

export default function TaskCard({ task, onEdit, onDelete, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);

  const hoursToDeadline = differenceInHours(parseISO(task.deadline), new Date());
  
  let deadlineColor = 'text-gray-600';
  if (hoursToDeadline < 24 && hoursToDeadline > 0) {
    deadlineColor = 'text-red-600 font-bold';
  } else if (hoursToDeadline < 48 && hoursToDeadline > 0) {
    deadlineColor = 'text-yellow-600 font-bold';
  } else if (hoursToDeadline <= 0) {
    deadlineColor = 'text-red-800 font-bold';
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'todo': return 'bg-gray-100 text-gray-700';
      case 'in-progress': return 'bg-blue-100 text-blue-700';
      case 'done': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formattedDate = new Date(task.deadline).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative">
      <div className="flex justify-between items-start mb-2 gap-4">
        <h3 className="text-lg font-bold text-gray-900 line-clamp-2 leading-tight">
          {task.title}
        </h3>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <PriorityBadge score={task.priority_score} />
          <span className="text-xs font-semibold text-gray-500">{task.priority_score.toFixed(1)} Pts</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3 mb-3 text-sm flex-wrap">
        <span className={`px-2 py-1 rounded-md capitalize font-medium ${getStatusColor(task.status)}`}>
          {task.status.replace('-', ' ')}
        </span>
        
        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
            {task.assignee.charAt(0).toUpperCase()}
          </div>
          <span className="text-gray-700 font-medium text-xs">{task.assignee}</span>
        </div>

        <span className={`text-xs ${deadlineColor}`}>
          🕒 {formattedDate}
        </span>
      </div>

      <div className="border-t border-gray-100 pt-3 flex items-center justify-between mt-2">
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="text-indigo-600 text-sm font-medium flex items-center gap-1 hover:text-indigo-800 transition-colors"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          AI Reasoning
        </button>

        <div className="flex items-center gap-2">
           <button 
             onClick={() => onStatusChange(task.id, task.status === 'done' ? 'todo' : 'done')}
             className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
             title="Toggle Status"
           >
             <CheckCircle2 size={18} />
           </button>
           <button 
             onClick={() => onEdit(task)}
             className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
             title="Edit Task"
           >
             <Edit2 size={18} />
           </button>
           <button 
             onClick={() => onDelete(task.id)}
             className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
             title="Delete Task"
           >
             <Trash2 size={18} />
           </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-gray-700 mb-2 leading-relaxed"><strong>AI Insight:</strong> {task.reasoning}</p>
          {task.complaint_boost > 0 && (
            <div className="flex items-start gap-1.5 text-red-700 bg-red-50 p-2 rounded-md border border-red-100 font-medium">
              <Bell size={16} className="mt-0.5 flex-shrink-0" />
              <span>Priority boosted (+{task.complaint_boost}) by linked complaint.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
