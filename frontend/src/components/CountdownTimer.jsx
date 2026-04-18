import { useEffect, useState } from 'react';

function parse(deadline) {
  if (!deadline) return null;
  const d = new Date(deadline);
  return isNaN(d.getTime()) ? null : d;
}

function format(ms) {
  if (ms <= 0) return { text: 'Overdue', urgent: true, warning: false };
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 1) return { text: `${d}d ${h % 24}h left`, urgent: false, warning: d <= 2 };
  if (h > 0) return { text: `${h}h ${m % 60}m left`, urgent: false, warning: true };
  return { text: `${m}m ${s % 60}s left`, urgent: true, warning: false };
}

export default function CountdownTimer({ deadline }) {
  const target = parse(deadline);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return <span className="text-gray-400 text-xs">No deadline</span>;

  const { text, urgent, warning } = format(target - Date.now());
  const cls = urgent
    ? 'text-red-600 font-semibold'
    : warning
    ? 'text-yellow-600 font-medium'
    : 'text-green-700';

  return (
    <span className={`text-xs ${cls} tabular-nums`}>
      ⏱ {text}
    </span>
  );
}
