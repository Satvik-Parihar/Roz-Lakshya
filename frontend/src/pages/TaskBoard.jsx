import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Filter, AlertCircle, LayoutList } from 'lucide-react';
import { fetchTasks, updateTask, deleteTask } from '../api/tasks';
import { useTaskStore } from '../store/taskStore';
import TaskCard from '../components/TaskCard';
import CreateTaskModal from '../components/CreateTaskModal';

export default function TaskBoard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  const { tasks, setTasks, updateTask: updateStoreTask, removeTask } = useTaskStore();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => fetchTasks(),
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (data) {
      setTasks([...data].sort((a, b) => b.priority_score - a.priority_score));
    }
  }, [data, setTasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchAssignee = assigneeFilter === 'all' || task.assignee === assigneeFilter;
      return matchSearch && matchStatus && matchAssignee;
    });
  }, [tasks, searchQuery, statusFilter, assigneeFilter]);

  const highPriorityCount = filteredTasks.filter(t => t.priority_score >= 75).length;

  const handleEdit = (task) => {
    // P4 will implement the real edit modal logic later
    alert(`Edit task: ${task.title}\n(Edit functionality owned by P4)`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(id);
      removeTask(id);
    } catch (err) {
      alert('Failed to delete task.');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      updateStoreTask(id, { status: newStatus });
      await updateTask(id, { status: newStatus });
    } catch (err) {
      // Revert if error
      refetch();
      alert('Failed to update status.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Task Board</h1>
          <p className="text-gray-500 mt-1 font-medium">
            {filteredTasks.length} tasks · <span className="text-red-500">{highPriorityCount} high priority</span>
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={20} />
          New Task
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        
        <div className="flex flex-1 md:flex-none gap-4">
          <div className="relative w-full md:w-40">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">All Status</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          
          <div className="relative w-full md:w-40">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
              value={assigneeFilter} 
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">All Assignees</option>
              <option value="Alice">Alice</option>
              <option value="Bob">Bob</option>
              <option value="Charlie">Charlie</option>
              <option value="Diana">Diana</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">
          <AlertCircle size={32} className="mx-auto mb-3 text-red-500" />
          <h3 className="font-bold text-lg">Failed to load tasks</h3>
          <p className="mt-1 text-sm">Please check your connection and try again.</p>
          <button 
            onClick={() => refetch()} 
            className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded-lg font-semibold hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm min-h-[160px] flex flex-col justify-between animate-pulse">
              <div className="w-3/4 h-5 bg-gray-200 rounded mb-4"></div>
              <div className="flex gap-2 mb-4">
                <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
                <div className="w-20 h-6 bg-gray-200 rounded-full"></div>
              </div>
              <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !isError && filteredTasks.length === 0 && (
        <div className="bg-white border flex flex-col items-center justify-center border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <div className="bg-indigo-50 p-4 rounded-full mb-4">
            <LayoutList size={32} className="text-indigo-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-500 max-w-sm mb-6">
            Get started by creating a new task, or adjust your filters to see more results.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1"
          >
            <Plus size={18} /> Create your first task
          </button>
        </div>
      )}

      {!isLoading && !isError && filteredTasks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredTasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateTaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
