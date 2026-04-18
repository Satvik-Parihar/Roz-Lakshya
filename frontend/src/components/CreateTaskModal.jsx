import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createTask } from '../api/tasks';
import { useTaskStore } from '../store/taskStore';

// Fallback useToast in case shadcn/ui is not fully initialized by other team members
const useToastFallback = () => ({
  toast: ({ title, description }) => alert(`${title}\n${description}`)
});

export default function CreateTaskModal({ isOpen, onClose }) {
  const addTask = useTaskStore((state) => state.addTask);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee: 'Alice',
    deadline: '',
    effort: 3,
    impact: 3,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await createTask(formData);
      addTask(result);
      
      // Attempt to show toast
      try {
        // This is a placeholder for real shadcn toast logic
        const { toast } = useToastFallback();
        toast({ title: 'Task Created', description: 'The task has been successfully created.' });
      } catch(tErr) {
        alert('Task created successfully!');
      }

      setFormData({
        title: '', description: '', assignee: 'Alice', deadline: '', effort: 3, impact: 3
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Create New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input 
              type="text" name="title" required maxLength={100}
              value={formData.title} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="E.g., Fix login redirect bug"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <textarea 
              name="description" rows={3}
              value={formData.description} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
              placeholder="Additional details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Assignee</label>
              <select 
                name="assignee" value={formData.assignee} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="Alice">Alice</option>
                <option value="Bob">Bob</option>
                <option value="Charlie">Charlie</option>
                <option value="Diana">Diana</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Deadline <span className="text-red-500">*</span></label>
              <input 
                type="datetime-local" name="deadline" required
                value={formData.deadline} onChange={handleChange}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-gray-700">Effort (1-5)</label>
                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{formData.effort}</span>
              </div>
              <input 
                type="range" name="effort" min="1" max="5" 
                value={formData.effort} onChange={handleChange}
                className="w-full accent-indigo-600"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-gray-700">Impact (1-5)</label>
                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{formData.impact}</span>
              </div>
              <input 
                type="range" name="impact" min="1" max="5" 
                value={formData.impact} onChange={handleChange}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
            <button 
              type="button" onClick={onClose} disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-gray-300"
            >
              Cancel
            </button>
            <button 
              type="submit" disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 disabled:bg-indigo-400"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
