import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  
  const navItems = [
    { path: '/tasks', label: 'Tasks', icon: '📋' },
    { path: '/plan', label: "Today's Plan", icon: '🚀' },
    { path: '/complaints', label: 'Complaints', icon: '📢' },
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 z-50 md:sticky md:top-0 md:border-b md:border-t-0 py-2">
      <div className="max-w-4xl mx-auto flex items-center justify-around md:justify-start md:gap-8 px-6">
        <div className="hidden md:block font-black text-indigo-600 text-xl tracking-tighter mr-4">RL</div>
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
        {/* Role Switcher placeholder */}
        <div className="hidden md:flex items-center ml-auto gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full">
           <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Role:</span>
           <span className="text-xs font-bold text-indigo-500">Manager</span>
        </div>
      </div>
    </nav>
  );
}
