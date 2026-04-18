import { useState } from 'react';
import useTaskStore from '../store/useTaskStore';

export default function DeleteConfirmDialog({ task, onClose }) {
  const { deleteTask } = useTaskStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setBusy(true);
    setError('');
    try {
      await deleteTask(task.id);
      onClose();
    } catch {
      setError('Failed to delete task. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm space-y-5 rounded-xl border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] p-6 shadow-2xl">
        {/* Icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mx-auto">
          <span className="text-2xl">🗑️</span>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-[color:var(--on-surface)]">Delete Task?</h2>
          <p className="text-sm text-[color:var(--on-surface-variant)]">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-[color:var(--on-surface)]">&ldquo;{task.title}&rdquo;</span>?
            This cannot be undone.
          </p>
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[color:var(--outline-variant)] px-4 py-2 text-sm font-medium text-[color:var(--on-surface-variant)] transition-colors hover:bg-[color:var(--surface-container-low)]"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
