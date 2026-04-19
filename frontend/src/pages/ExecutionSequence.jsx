import { useEffect, useState } from 'react';
import { taskApi } from '../api/taskApi';
import useTaskStore from '../store/useTaskStore';

export default function ExecutionSequence() {
  const { tasks, fetchTasks } = useTaskStore();
  const [sequence, setSequence] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getUserId = () => {
    try {
      const payload = JSON.parse(atob(localStorage.getItem('access_token').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.user_id || 1;
    } catch {
      return 1;
    }
  };

  const USER_ID = getUserId();
  
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
    <div className="min-h-screen brand-page-bg p-6 pb-24 md:pb-6">
      <div className="max-w-3xl mx-auto space-y-8 mt-6">
        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-3xl text-[color:var(--primary)]">rocket_launch</span>
              <h1 className="font-headline text-3xl font-bold text-[color:var(--on-surface)] tracking-tight">My Today's Plan</h1>
            </div>
            <p className="text-[color:var(--on-surface-variant)] text-sm mt-1">AI-optimized execution sequence for maximum efficiency</p>
          </div>
          <button 
            onClick={loadSequence} 
            className="flex items-center justify-center p-2 bg-[color:var(--surface-container-lowest)] border border-[color:var(--outline-variant)]/50 rounded-full hover:bg-[color:var(--surface-container)] transition-colors shadow-sm text-[color:var(--on-surface-variant)]"
            title="Refresh Sequence"
          >
            <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>sync</span>
          </button>
        </header>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
            <span className="material-symbols-outlined text-[color:var(--primary)] animate-spin text-4xl">autorenew</span>
            <p className="text-sm font-bold text-[color:var(--primary)] animate-pulse">Intelligent engine is sequencing your tasks...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-center">
            <p className="text-sm text-red-600 font-semibold">{error}</p>
          </div>
        )}

        {!loading && sequence.length === 0 && !error && (
          <div className="text-center py-20 opacity-30 text-[color:var(--on-surface-variant)]">
            <span className="material-symbols-outlined text-6xl">inventory_2</span>
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
                   <div className="w-10 h-10 rounded-full bg-[color:var(--primary)] text-[color:var(--on-primary)] flex items-center justify-center font-black shadow-lg z-10 shrink-0 font-mono">
                     {item.sequence}
                   </div>
                   {index < sequence.length - 1 && <div className="w-0.5 h-full bg-[color:var(--outline-variant)] mt-2" />}
                </div>

                <div className="flex-1 bg-[color:var(--surface-container-lowest)] rounded-2xl border border-[color:var(--outline-variant)]/50 p-5 shadow-sm hover:shadow-md transition-all group-hover:translate-x-1">
                   <div className="flex justify-between items-start gap-3">
                     <div>
                       <h3 className="font-headline text-lg font-bold text-[color:var(--on-surface)]">{task.title}</h3>
                       <div className="mt-2 text-xs font-bold text-[color:var(--on-secondary-container)] bg-[color:var(--secondary-container)] inline-flex items-center gap-1 px-2 py-1 rounded-lg">
                          <span className="material-symbols-outlined text-[14px]">lightbulb</span> {item.reason}
                       </div>
                     </div>
                     <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded bg-[color:var(--surface-container)] text-[color:var(--on-surface-variant)]`}>
                        {task.status.replace('_', ' ')}
                     </span>
                   </div>

                   <div className="mt-4 flex items-center gap-4 text-[10px] text-[color:var(--on-surface-variant)] font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">hourglass_bottom</span> {task.effort} Effort
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">local_fire_department</span> {task.priority_score.toFixed(0)} Score
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
