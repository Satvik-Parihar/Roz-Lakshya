import { useState } from 'react';
import useTaskStore from '../store/useTaskStore';

const STATUS = {
  todo:        { next: 'in-progress', label: 'Mark In Progress', cls: 'bg-blue-600 hover:bg-blue-700 text-white' },
  'in-progress': { next: 'done',      label: 'Mark Done',        cls: 'bg-green-600 hover:bg-green-700 text-white' },
  in_progress: { next: 'done',        label: 'Mark Done',        cls: 'bg-green-600 hover:bg-green-700 text-white' },
  done:        { next: null,          label: 'Completed ✓',      cls: 'bg-gray-200 text-gray-500 cursor-default'   },
};

const normalizeStatus = (status) => String(status || 'todo').toLowerCase().replace(/_/g, '-');

export default function StatusButtons({ task }) {
  const { updateTask } = useTaskStore();
  const [busy, setBusy] = useState(false);
  const cfg = STATUS[normalizeStatus(task.status)] ?? STATUS.todo;

  if (!cfg.next) {
    return (
      <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${cfg.cls}`}>
        {cfg.label}
      </span>
    );
  }

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await updateTask(task.id, { status: cfg.next });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 disabled:opacity-60 ${cfg.cls}`}
    >
      {busy ? 'Updating…' : cfg.label}
    </button>
  );
}
