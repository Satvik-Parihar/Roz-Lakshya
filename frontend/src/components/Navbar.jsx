import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { alertsApi } from '../api/taskApi';

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
    { path: '/tasks', label: 'Tasks', icon: 'list_alt' },
    { path: '/plan', label: "Today's Plan", icon: 'rocket_launch' },
    { path: '/complaints', label: 'Complaints', icon: 'campaign' },
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
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

  const getJwtPayload = () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return { name: 'Guest', role: 'Viewer' };
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      return {
        name: payload.name || payload.sub || 'User',
        role: payload.role ? payload.role.replace('_', ' ') : 'Member'
      };
    } catch {
      return { name: 'User', role: 'Member' };
    }
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
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[color:var(--surface)]/80 backdrop-blur-md border-t border-[color:var(--outline-variant)]/50 z-50 md:sticky md:top-0 md:border-b md:border-t-0 py-2">
      <div className="max-w-4xl mx-auto flex items-center justify-around md:justify-start md:gap-8 px-6">
        <div className="hidden md:block mr-4">
          <img src="/logo.png" alt="Roz-Lakshya Logo" className="h-12 w-auto" />
        </div>
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path}
            className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 px-3 rounded-xl transition-all duration-200
              ${location.pathname === item.path 
                ? 'text-[color:var(--primary)] bg-[color:var(--surface-container-highest)] font-bold scale-105' 
                : 'text-[color:var(--on-surface-variant)] hover:text-[color:var(--on-surface)] hover:bg-[color:var(--surface-container)]'}`}
          >
            <span className="material-symbols-outlined text-xl md:text-base">{item.icon}</span>
            <span className="text-[10px] font-headline md:text-sm uppercase tracking-wider md:capitalize md:tracking-normal">{item.label}</span>
          </Link>
        ))}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="relative hidden md:flex p-2 rounded-xl text-[color:var(--on-surface-variant)] hover:bg-[color:var(--surface-container-highest)] hover:text-[color:var(--on-surface)] transition-colors"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-2 min-w-[18px] h-[18px] bg-red-500 text-[color:var(--on-primary)] text-[10px] font-black rounded-full flex items-center justify-center px-1">
                {unreadCount >= 10 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className={`relative md:hidden flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 ${
              dropdownOpen ? 'text-[color:var(--primary)] font-bold scale-105' : 'text-[color:var(--on-surface-variant)] hover:text-[color:var(--on-surface)] hover:bg-[color:var(--surface-container)]'
            }`}
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            <span className="text-[10px] uppercase tracking-wider font-headline">Alerts</span>
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
        <div className="hidden md:flex items-center ml-auto gap-4">
          <div className="text-right">
             <div className="text-[10px] font-mono text-[color:var(--on-surface-variant)] uppercase tracking-widest">{getJwtPayload().role}</div>
             <div className="text-sm font-headline font-bold text-[color:var(--on-surface)]">Hi, {getJwtPayload().name}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center h-8 w-8 rounded-full border border-[color:var(--outline-variant)] bg-[color:var(--surface-container-lowest)] text-[color:var(--on-surface-variant)] hover:text-[color:var(--on-surface)] hover:bg-[color:var(--surface-variant)] transition-colors"
            title="Logout"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
