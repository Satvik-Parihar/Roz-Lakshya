import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { Zap, RefreshCw, Calendar, Clock } from 'lucide-react';
import useUserStore from '../store/useUserStore';
import { getExecutionSequence } from '../api/sequence';
import SequenceCard from '../components/SequenceCard';

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-5 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-8 bg-gray-100 rounded w-full" />
      </div>
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm text-sm text-gray-600 font-medium">
      <Icon className="w-4 h-4 text-indigo-500" />
      <span>{label}</span>
    </div>
  );
}

// ─── Estimated time helper ────────────────────────────────────────────────────
function estimatedTime(sequence) {
  const totalMin = sequence.reduce((acc, t) => acc + (Number(t.effort) || 0) * 30, 0);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m total`;
  if (m === 0) return `${h}h total`;
  return `${h}h ${m}m total`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TodaysPlan() {
  const { currentUser } = useUserStore();
  const [sequence, setSequence] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const loadSequence = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getExecutionSequence(currentUser.id);
      setSequence(res.data ?? []);
      setLastUpdated(new Date());
    } catch {
      setError('Failed to load plan. Retry?');
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadSequence();
  }, [loadSequence]);

  const inProgressCount = sequence.filter((t) => t.status === 'in_progress').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-start justify-between gap-4">
          {/* Title */}
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900 tracking-tight">
              <Zap className="w-6 h-6 text-amber-500" />
              Today's Execution Plan
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              AI-suggested order for{' '}
              <span className="font-semibold text-indigo-600">{currentUser?.name ?? 'You'}</span>
            </p>
          </div>

          {/* Right side */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {lastUpdated && (
              <span className="text-xs text-gray-400">
                Last updated:{' '}
                <strong className="text-gray-600">{format(lastUpdated, 'HH:mm')}</strong>
              </span>
            )}
            <button
              onClick={loadSequence}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 active:scale-95 transition-all duration-150 disabled:opacity-60"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh Plan
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* ── Stats bar ── */}
        {!loading && sequence.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <StatPill icon={Calendar} label={`${sequence.length} Task${sequence.length !== 1 ? 's' : ''}`} />
            <StatPill icon={Zap}      label={`${inProgressCount} In Progress`} />
            <StatPill icon={Clock}    label={estimatedTime(sequence)} />
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 flex items-center gap-3">
            <span className="text-red-500 text-xl">⚠️</span>
            <p className="flex-1 text-sm font-medium text-red-700">{error}</p>
            <button
              onClick={loadSequence}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Loading skeletons ── */}
        {loading && (
          <div className="relative ml-6 border-l-2 border-slate-200 pl-6 space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && sequence.length === 0 && (
          <div className="flex flex-col items-center justify-center py-28 text-center gap-3">
            <span className="text-6xl">🎉</span>
            <p className="text-xl font-bold text-gray-700">You're all caught up!</p>
            <p className="text-sm text-gray-400">No pending tasks. Enjoy the calm.</p>
          </div>
        )}

        {/* ── Timeline task list ── */}
        {!loading && sequence.length > 0 && (
          <div className="relative ml-6 border-l-2 border-slate-200 pl-6 space-y-4">
            {sequence.map((task) => (
              <SequenceCard key={task.id} task={task} />
            ))}
          </div>
        )}

        {/* ── Focus tip ── */}
        {!loading && sequence.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 px-5 py-4 flex items-start gap-3">
            <span className="text-2xl mt-0.5">💡</span>
            <div>
              <p className="text-sm font-bold text-amber-800">Focus Tip</p>
              <p className="text-sm text-amber-700 mt-0.5 leading-relaxed">
                Start with{' '}
                <span className="font-semibold">"{sequence[0]?.title}"</span>
                {' '}— it's your highest priority task.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
