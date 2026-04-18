import { useState, useEffect } from 'react';

import PriorityFooter from '../components/PriorityFooter';
import PriorityHeader from '../components/PriorityHeader';
import { complaintApi } from '../api/taskApi';

export default function ComplaintEngine() {
  const [text, setText] = useState('');
  const [channel, setChannel] = useState('email');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    try {
      const res = await complaintApi.getAll();
      setComplaints(res.data);
    } catch (err) {
      console.error('Failed to load complaints', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setResult(null);
    setMessage('');

    try {
      const res = await complaintApi.create({ text, channel });
      setResult(res.data);
      setText('');
      await loadComplaints();
      setMessage('Complaint classified and recorded successfully!');
    } catch (err) {
      setMessage('Error submitting complaint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="brand-page-bg min-h-screen">
      <PriorityHeader appMode />

      <main className="mx-auto w-full max-w-4xl space-y-8 px-6 py-10">
        <header>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Complaint Engine</h1>
          <p className="text-slate-500">Intelligent classification and priority boosting</p>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold mb-4">Register New Complaint</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="email">Email</option>
                <option value="call">Call</option>
                <option value="direct">Direct</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Input Text</label>
              <textarea
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Describe the issue in detail..."
                className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'AI Classifying...' : 'Submit Complaint'}
            </button>
          </form>

          {message && <p className={`mt-3 text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>}
        </section>

        {result && (
          <section className="bg-indigo-600 rounded-2xl shadow-xl p-6 text-white animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded uppercase tracking-widest">{result.category}</span>
                <h3 className="text-2xl font-bold mt-2">AI Classification Result</h3>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold opacity-70 uppercase">Priority</p>
                <p className={`text-xl font-black ${result.priority === 'High' ? 'text-red-300' : 'text-yellow-300'}`}>{result.priority}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold opacity-70 uppercase mb-2">Resolution Steps</p>
                  <ul className="space-y-2">
                    {result.resolution_steps?.map((step, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="bg-white/20 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-4 space-y-4 border border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-sm">SLA Deadline</span>
                  <span className="text-sm font-bold bg-white text-indigo-600 px-2 py-0.5 rounded">{result.sla_hours} hours</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Urgency Score</span>
                  <span className="font-bold underline">{Number(result.urgency_score || 0).toFixed(1)}/100</span>
                </div>
                {result.linked_task_id && (
                  <div className="pt-2 border-t border-white/20">
                    <p className="text-[10px] font-bold opacity-70 uppercase mb-1">Impact Bridge</p>
                    <p className="text-sm">Linked to Task #{result.linked_task_id}</p>
                    <p className="text-[10px] text-indigo-200">Automatically boosted associated task priority score.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Recent Complaints</h2>
          <div className="grid grid-cols-1 gap-4">
            {complaints.map((c) => (
              <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-10 rounded ${c.priority === 'High' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 line-clamp-1">{c.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase px-1.5 py-0.5 border border-slate-100 rounded bg-slate-50">{c.category}</span>
                      <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded capitalize ${c.status === 'open' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <PriorityFooter />
    </div>
  );
}
