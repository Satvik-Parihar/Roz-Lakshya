import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { alertsApi } from '../api/taskApi';
import { clearAuthStorage, getAuthSnapshot } from '../utils/auth';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const ALERT_CONFIG = {
    task_overdue: { color: 'bg-red-500', icon: '🔴', bar: 'bg-red-400' },
    task_due_soon: { color: 'bg-amber-500', icon: '🟡', bar: 'bg-amber-400' },
    sla_breach: { color: 'bg-blue-500', icon: '🔵', bar: 'bg-blue-400' },
  };
  
  const navItems = [
    { path: '/tasks', label: 'Tasks', icon: '📋' },
    { path: '/plan', label: "Today's Plan", icon: '🚀' },
    { path: '/complaints', label: 'Complaints', icon: '📢' },
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  ];

  const fetchAlerts = async () => {
    setAlertsLoading(true);
    try {
      const res = await alertsApi.getActive();
      setAlerts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  };

  const relativeTime = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const getUserEmail = () => {
    return getAuthSnapshot().email || 'User';
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  const handleMarkRead = async (id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try {
      await alertsApi.markRead(id);
    } catch {
      fetchAlerts();
    }
  };

  const handleMarkAllRead = async () => {
    setAlerts([]);
    setDropdownOpen(false);
    try {
      await alertsApi.markAllRead();
    } catch {
      fetchAlerts();
    }
  };

  const handleLogout = () => {
    clearAuthStorage();
    navigate('/login');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 z-50 md:sticky md:top-0 md:border-b md:border-t-0 py-2">
      <div className="max-w-4xl mx-auto flex items-center justify-around md:justify-start md:gap-8 px-6">
        <Link to="/" className="hidden md:flex items-center gap-2 mr-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white">
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
              dataset
            </span>
          </div>
          <span className="font-black text-slate-800 text-lg tracking-tight">Roz-Lakshya</span>
        </Link>
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path}
            className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 px-3 rounded-xl transition-all duration-200
              ${location.pathname === item.path 
                ? 'text-indigo-600 font-bold scale-105' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          >
            <span className="text-xl md:text-base">{item.icon}</span>
            <span className="text-[10px] md:text-sm uppercase tracking-wider md:capitalize md:tracking-normal">{item.label}</span>
          </Link>
        ))}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="relative hidden md:flex p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <span>🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                {unreadCount >= 10 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className={`relative md:hidden flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 ${
              dropdownOpen ? 'text-indigo-600 font-bold scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="text-xl">🔔</span>
            <span className="text-[10px] uppercase tracking-wider">Alerts</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-2.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {dropdownOpen && (
            <div className="fixed bottom-16 left-3 right-3 md:absolute md:right-0 md:left-auto md:top-full md:mt-2 md:w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="font-bold text-slate-800 text-sm">🔔 Alerts</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs text-indigo-600 font-semibold hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {alertsLoading ? (
                  <div>
                    <div className="h-12 animate-pulse bg-slate-100 rounded-lg m-2" />
                    <div className="h-12 animate-pulse bg-slate-100 rounded-lg m-2" />
                    <div className="h-12 animate-pulse bg-slate-100 rounded-lg m-2" />
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    <div className="text-lg">✅</div>
                    <div className="text-sm">All caught up!</div>
                  </div>
                ) : (
                  alerts.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => handleMarkRead(a.id)}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 border-b border-slate-50 ${a.is_read ? 'opacity-50' : ''}`}
                    >
                      <div className={`w-1 self-stretch rounded-full ${ALERT_CONFIG[a.type]?.bar || 'bg-slate-300'}`} />
                      <div className="pt-0.5">{ALERT_CONFIG[a.type]?.icon || '🔔'}</div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs text-slate-800 line-clamp-2"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {a.message}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{relativeTime(a.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Role Switcher placeholder */}
        <div className="hidden md:flex items-center ml-auto gap-2">
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors ml-2"
          >
            Logout
          </button>
          <button
            type="button"
            className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full"
          >
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Role:</span>
             <span className="text-xs font-bold text-indigo-500">{getUserEmail()}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
