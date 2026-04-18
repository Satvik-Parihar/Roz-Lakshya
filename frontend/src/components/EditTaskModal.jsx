import { useState } from 'react';
import useTaskStore from '../store/useTaskStore';

const FIELDS = [
  { name: 'title',       label: 'Title',       type: 'text',   required: true  },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'assignee',    label: 'Assignee',    type: 'text'    },
  { name: 'deadline',    label: 'Deadline',    type: 'datetime-local' },
  { name: 'effort',      label: 'Effort (1-10)',  type: 'number', min: 1, max: 10 },
  { name: 'impact',      label: 'Impact (1-10)',  type: 'number', min: 1, max: 10 },
];

function toLocalDatetime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  // format to YYYY-MM-DDTHH:mm
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditTaskModal({ task, onClose }) {
  const { updateTask } = useTaskStore();
  const [form, setForm] = useState({
    title:       task.title       ?? '',
    description: task.description ?? '',
    assignee:    task.assignee    ?? '',
    deadline:    toLocalDatetime(task.deadline),
    effort:      task.effort      ?? '',
    impact:      task.impact      ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handle = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        ...form,
        effort: form.effort !== '' ? Number(form.effort) : undefined,
        impact: form.impact !== '' ? Number(form.impact) : undefined,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
      };
      await updateTask(task.id, payload);
      onClose();
    } catch {
      setError('Failed to update task. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Edit Task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {FIELDS.map(({ name, label, type, required, min, max }) =>
            type === 'textarea' ? (
              <div key={name} className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {label}
                </label>
                <textarea
                  name={name}
                  value={form[name]}
                  onChange={handle}
                  rows={3}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>
            ) : (
              <div key={name} className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {label}
                </label>
                <input
                  type={type}
                  name={name}
                  value={form[name]}
                  onChange={handle}
                  required={required}
                  min={min}
                  max={max}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
