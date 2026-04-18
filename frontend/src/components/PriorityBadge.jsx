import React from 'react';

export default function PriorityBadge({ score, className = '' }) {
  let bgColor = 'bg-green-100';
  let textColor = 'text-green-700';
  let text = 'LOW';
  let dotColor = 'bg-green-500';

  if (score >= 75) {
    bgColor = 'bg-red-100';
    textColor = 'text-red-700';
    text = 'HIGH';
    dotColor = 'bg-red-500';
  } else if (score >= 50) {
    bgColor = 'bg-amber-100';
    textColor = 'text-amber-700';
    text = 'MED';
    dotColor = 'bg-amber-500';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${bgColor} ${textColor} ${className}`}>
      <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${dotColor}`}></span>
      {text}
    </span>
  );
}
