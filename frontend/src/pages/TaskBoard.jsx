import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { getTasks, createTask, updateTask, deleteTask } from '../api/tasks';
import useUserStore from '../store/useUserStore';
import TaskCard from '../components/TaskCard';

export default function TaskBoard() {
  const { currentUser } = useUserStore();
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [creatingTask, setCreatingTask] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    effort: 3,
    impact: 3
  });

  const loadTasks = async () => {
    setLoading(true);
    try {
      const response = await getTasks();
      const tasksData = response.data || response;
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (error) {
      console.error("Failed to load tasks", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    const interval = setInterval(() => {
      loadTasks();
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateTask(id, { status: newStatus });
      loadTasks();
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask(id);
      loadTasks();
    } catch (error) {
      console.error("Failed to delete task", error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setCreatingTask(true);
    try {
      await createTask({
        ...formData,
        assignee_id: currentUser?.id,
        effort: Number(formData.effort),
        impact: Number(formData.impact)
      });
      setShowCreateModal(false);
      setFormData({ title: '', description: '', deadline: '', effort: 3, impact: 3 });
      
      setTimeout(() => {
        setCreatingTask(false);
        loadTasks();
      }, 2000);
      
    } catch (error) {
      console.error("Failed to create task", error);
      setCreatingTask(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus === 'all') return true;
    return task.status === filterStatus;
  });

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Task Board</h1>
          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
            {tasks.length} tasks
          </span>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={loadTasks} 
            className="flex items-center justify-center p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 bg-white"
            title="Refresh tasks"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Add Task
          </button>
        </div>
      </div>

      {creatingTask && (
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 flex items-center justify-center gap-2 font-medium animate-pulse">
          <RefreshCw size={18} className="animate-spin" />
          ⏳ AI scoring task priority...
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-1 overflow-x-auto scrollbar-hide">
        {['all', 'todo', 'in_progress', 'done'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              filterStatus === status 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {status === 'all' ? 'All' : status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </button>
        ))}
      </div>

      {/* Task Grid */}
      {loading && tasks.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 h-48 animate-pulse flex flex-col gap-3 shadow-sm border-l-4 border-l-gray-300">
              <div className="h-5 bg-gray-200 rounded w-1/4"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
              <div className="mt-auto flex justify-between">
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-8"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 border-dashed rounded-xl p-12 text-center">
          <p className="text-gray-500 font-medium text-lg">No tasks yet. Add your first task &rarr;</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onStatusChange={handleStatusChange} 
              onDelete={handleDelete} 
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Create New Task</h2>
            </div>
            
            <form onSubmit={handleCreateTask} className="p-4 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
                <input 
                  type="text" required name="title"
                  value={formData.title} onChange={handleFormChange}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="What needs to be done?"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea 
                  name="description" rows={3}
                  value={formData.description} onChange={handleFormChange}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Task details..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Deadline *</label>
                <input 
                  type="datetime-local" required name="deadline"
                  value={formData.deadline} onChange={handleFormChange}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Effort: {formData.effort}</label>
                  <input 
                    type="range" min="1" max="5" name="effort"
                    value={formData.effort} onChange={handleFormChange}
                    className="w-full accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1 (Low)</span>
                    <span>5 (High)</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Impact: {formData.impact}</label>
                  <input 
                    type="range" min="1" max="5" name="impact"
                    value={formData.impact} onChange={handleFormChange}
                    className="w-full accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1 (Low)</span>
                    <span>5 (High)</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-transparent"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
