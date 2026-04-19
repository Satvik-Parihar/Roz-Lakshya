import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import useTaskStore from '../store/useTaskStore';

export default function DeleteConfirmDialog({ task, onClose }) {
  const { deleteTask } = useTaskStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

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

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-md" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm space-y-5 rounded-xl border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] p-6 shadow-2xl">
        {/* Icon */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <span className="text-2xl">🗑️</span>
        </div>

        <div className="space-y-1 text-center">
          <h2 className="text-lg font-bold text-[color:var(--on-surface)]">Delete Task?</h2>
          <p className="text-sm text-[color:var(--on-surface-variant)]">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-[color:var(--on-surface)]">&ldquo;{task.title}&rdquo;</span>?
            This cannot be undone.
          </p>
        </div>

        {error && <p className="text-center text-sm text-red-600">{error}</p>}

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
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
