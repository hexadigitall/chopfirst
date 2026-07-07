import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { formatNGN } from '../utils/format';

export default function Tasks({ user, setUser }: { user: any; setUser: (u: any) => void }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  const load = () => {
    setLoadError('');
    api.getTasks().then(all => {
      setTasks(all.filter((t: any) => t.status === 'OPEN'));
      setMyTasks(all.filter((t: any) => t.status === 'ASSIGNED' || t.status === 'COMPLETED_PENDING'));
    }).catch((e) => setLoadError(e.message));
  };

  useEffect(load, []);

  const handleAssign = async (taskId: string) => {
    setActionError('');
    setLoading(taskId);
    try {
      await api.assignTask(taskId);
      load();
    } catch (e: any) { setActionError(e.message); }
    setLoading(null);
  };

  const handleComplete = async (taskId: string) => {
    setActionError('');
    setLoading(taskId);
    try {
      await api.completeTask(taskId);
      load();
    } catch (e: any) { setActionError(e.message); }
    setLoading(null);
  };

  const categoryIcon = (cat: string) => {
    switch (cat) {
      case 'PLATFORM': return '📱';
      case 'MERCHANT': return '🏪';
      case 'COMMUNITY': return '🤝';
      default: return '📋';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Community Tasks</h1>
          <p className="text-stone-400">Complete tasks to clear your outstanding balance</p>
        </div>
        <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-bold text-lg">
          {formatNGN(user?.outstanding_balance || 0)}
        </div>
      </div>

      {(loadError || actionError) && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center">
          {loadError || actionError}
        </div>
      )}

      {/* My active tasks */}
      {myTasks.length > 0 && (
        <div>
          <h2 className="font-bold text-stone-600 mb-3">Your Active Tasks</h2>
          <div className="space-y-3">
            {myTasks.map((t: any) => (
              <div key={t.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="text-2xl">{categoryIcon(t.category)}</div>
                    <div>
                      <h3 className="font-semibold text-amber-800">{t.title}</h3>
                      <p className="text-sm text-amber-600">{t.description}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 font-medium">
                          {t.status === 'ASSIGNED' ? 'In Progress' : 'Pending Verification'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">
                          {formatNGN(t.credit_value)} credit
                        </span>
                      </div>
                    </div>
                  </div>
                  {t.status === 'ASSIGNED' && (
                    <button
                      onClick={() => handleComplete(t.id)}
                      disabled={loading === t.id}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:bg-amber-300 transition-colors"
                    >
                      {loading === t.id ? '...' : 'Mark Complete'}
                    </button>
                  )}
                  {t.status === 'COMPLETED_PENDING' && (
                    <span className="text-sm font-medium text-amber-600">Awaiting verification</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Tasks */}
      <div>
        <h2 className="font-bold text-stone-600 mb-3">Available Tasks</h2>
        <div className="space-y-3">
          {tasks.length === 0 && (
            <div className="text-center py-8 text-stone-500">
              <div className="text-4xl mb-2">✅</div>
              <p>All tasks are assigned. Check back later!</p>
            </div>
          )}
          {tasks.map((t: any) => (
            <div key={t.id} className="bg-white rounded-xl border border-stone-200 p-4 hover:border-emerald-200 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex gap-3 flex-1">
                  <div className="text-2xl">{categoryIcon(t.category)}</div>
                  <div>
                    <h3 className="font-semibold">{t.title}</h3>
                    <p className="text-sm text-stone-500">{t.description}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">{t.category}</span>
                      {t.merchant_name && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">{t.merchant_name}</span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                        {formatNGN(t.credit_value)} credit
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleAssign(t.id)}
                  disabled={loading === t.id}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-emerald-300 transition-colors shrink-0"
                >
                  {loading === t.id ? '...' : 'Assign'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
