import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/tasks', label: 'Tasks', icon: '📋' },
  { path: '/merchant', label: 'Merchant', icon: '🏪' },
  { path: '/admin', label: 'Admin', icon: '⚙️' },
];

export default function Layout({ user, onLogout }: { user: any; onLogout: () => void }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-stone-800">
            <img src="/logo-small.png" alt="Chop First" className="w-8 h-8" />
            <span>Chop First</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === item.path
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                )}
              >
                <span className="mr-1.5">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {user && (
              <Link to="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors">
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                  {user.name?.charAt(0)}
                </div>
                <span className="text-sm font-medium text-stone-700 hidden sm:block">{user.name}</span>
              </Link>
            )}
          </div>
        </div>
        {/* Mobile nav */}
        <div className="md:hidden flex border-t border-stone-100">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex-1 text-center py-2 text-xs font-medium transition-colors',
                location.pathname === item.path
                  ? 'text-emerald-700 border-b-2 border-emerald-500'
                  : 'text-stone-400'
              )}
            >
              <div className="text-lg">{item.icon}</div>
              {item.label}
            </Link>
          ))}
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
