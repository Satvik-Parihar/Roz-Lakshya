import { useEffect, useState } from 'react';
import { taskApi } from '../api/taskApi';
import useTaskStore from '../store/useTaskStore';

export default function ExecutionSequence() {
  const { tasks, fetchTasks } = useTaskStore();
  const [sequence, setSequence] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fixed for demo/phase 3 — assuming User 1
  const USER_ID = 1; 

  useEffect(() => {
    loadSequence();
  }, []);

  const loadSequence = async () => {
    setLoading(true);
    setError('');
    try {
      await fetchTasks(); // Ensure state is fresh
      const res = await taskApi.getSequence(USER_ID);
      setSequence(res.data);
    } catch (err) {
      setError('AI could not compute sequence at this time.');
    } finally {
      setLoading(false);
    }
  };

  const getTaskDetails = (id) => tasks.find(t => t.id === id);

  return (
    <div className="min-h-screen bg-slate-50 p-6 pb-24 md:pb-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">🚀 My Today's Plan</h1>
            <p className="text-slate-500 text-sm mt-1">AI-optimized execution sequence for maximum efficiency</p>
          </div>
          <button 
            onClick={loadSequence} 
            className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm"
            title="Refresh Sequence"
          >
            🔄
          </button>
        </header>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-indigo-600 animate-pulse">Groq LLM is sequencing your tasks...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-center">
            <p className="text-sm text-red-600 font-semibold">{error}</p>
          </div>
        )}

        {!loading && sequence.length === 0 && !error && (
          <div className="text-center py-20 opacity-30">
            <p className="text-5xl">🏮</p>
            <p className="mt-4 font-bold uppercase tracking-widest text-xs">No pending tasks to sequence</p>
          </div>
        )}

        <div className="space-y-4">
          {sequence.map((item, index) => {
            const task = getTaskDetails(item.task_id);
            if (!task) return null;

            return (
              <div key={item.task_id} className="relative group flex gap-6">
                {/* Timeline vertical bar */}
                <div className="flex flex-col items-center">
                   <div className="w-10 h-10 rounded-full bg-white border-2 border-indigo-500 text-indigo-600 flex items-center justify-center font-black shadow-lg z-10 shrink-0">
                     {item.sequence}
                   </div>
                   {index < sequence.length - 1 && <div className="w-0.5 h-full bg-slate-200 mt-2" />}
                </div>

                <div className="flex-1 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all group-hover:translate-x-1">
                   <div className="flex justify-between items-start gap-3">
                     <div>
                       <h3 className="text-lg font-bold text-slate-800">{task.title}</h3>
                       <div className="mt-2 text-xs font-bold text-indigo-500 bg-indigo-50 inline-block px-2 py-1 rounded-lg">
                          💡 {item.reason}
                       </div>
                     </div>
                     <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded bg-slate-100 text-slate-500`}>
                        {task.status}
                     </span>
                   </div>

                   <div className="mt-4 flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <span>⌛</span> {task.effort} Effort
                      </div>
                      <div className="flex items-center gap-1">
                        <span>🔥</span> {task.priority_score.toFixed(0)} Score
                      </div>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
