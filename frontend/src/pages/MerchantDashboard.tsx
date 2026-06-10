import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { formatNGN } from '../utils/format';

export default function MerchantDashboard() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getMerchants().then(setMerchants).catch(() => {});
    api.getAllTasks().then(setTasks).catch(() => {});
  }, []);

  const loadMerchant = (id: string) => {
    setError('');
    api.getMerchant(id).then(setSelected).catch((e) => setError(e.message));
  };

  const pendingTasks = tasks.filter((t: any) => t.status === 'COMPLETED_PENDING' && t.merchant_id === selected?.id);
  const prepaidOrders = selected?.recentOrders?.filter((o: any) => o.status === 'PREPAID') || [];

  const handleVerify = async (taskId: string) => {
    try {
      await api.verifyTask(taskId);
      const updated = tasks.filter((t: any) => t.id !== taskId);
      setTasks(updated);
      api.getAllTasks().then(setTasks).catch(() => {});
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Merchant Dashboard</h1>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      {/* Merchant selector */}
      <div className="flex gap-2 flex-wrap">
        {merchants.filter((m: any) => m.is_active).map((m: any) => (
          <button
            key={m.id}
            onClick={() => loadMerchant(m.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              selected?.id === m.id ? 'bg-emerald-600 text-white' : 'bg-white border border-stone-200 hover:border-emerald-300'
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      {selected && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            {/* Info card */}
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">🏪</div>
                <div>
                  <h2 className="font-bold text-lg">{selected.name}</h2>
                  <p className="text-sm text-stone-500">{selected.location}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-stone-50 rounded-lg p-3">
                  <div className="text-stone-500">Total Orders</div>
                  <div className="text-xl font-bold">{selected.stats?.total_orders || 0}</div>
                </div>
                <div className="bg-stone-50 rounded-lg p-3">
                  <div className="text-stone-500">Revenue</div>
                  <div className="text-xl font-bold text-emerald-600">{formatNGN(selected.stats?.revenue || 0)}</div>
                </div>
              </div>
            </div>

            {/* Incoming prepaid tickets */}
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                🎫 Incoming Prepaid Tickets
                {prepaidOrders.length > 0 && (
                  <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">{prepaidOrders.length}</span>
                )}
              </h3>
              {prepaidOrders.length === 0 ? (
                <p className="text-sm text-stone-400">No pending prepaid tickets.</p>
              ) : (
                <div className="space-y-2">
                  {prepaidOrders.map((o: any) => (
                    <div key={o.id} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{o.user_name}</div>
                        <div className="text-xs text-stone-400">{formatNGN(o.total_cost)} · {new Date(o.created_at).toLocaleString()}</div>
                      </div>
                      <span className="text-xs px-2 py-1 bg-emerald-200 text-emerald-800 rounded-full font-medium">PREPAID</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Menu management */}
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <h3 className="font-bold mb-3">Menu Management</h3>
              <div className="space-y-2">
                {(selected.menu || []).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                    <div>
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-stone-400">{formatNGN(item.price)}</div>
                    </div>
                    <button
                      onClick={() => {
                        api.toggleMenuItem(selected.id, item.id).then(() => loadMerchant(selected.id));
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        item.available ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {item.available ? 'Available' : 'Unavailable'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Task verification */}
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <h3 className="font-bold mb-3">Verify Community Tasks</h3>
              {pendingTasks.length === 0 ? (
                <p className="text-sm text-stone-400">No tasks pending verification.</p>
              ) : (
                <div className="space-y-3">
                  {pendingTasks.map((t: any) => (
                    <div key={t.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-sm">{t.title}</div>
                          <div className="text-xs text-stone-400">by {t.assigned_user} · {formatNGN(t.credit_value)} credit</div>
                        </div>
                        <button
                          onClick={() => handleVerify(t.id)}
                          className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                        >
                          Verify & Credit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent activity */}
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <h3 className="font-bold mb-3">Recent Orders</h3>
              <div className="space-y-2">
                {(selected.recentOrders || []).slice(0, 5).map((o: any) => (
                  <div key={o.id} className="flex justify-between items-center py-1.5 text-sm">
                    <div>
                      <span className="font-medium">{o.user_name}</span>
                      <span className="text-stone-400 ml-2">{formatNGN(o.total_cost)}</span>
                    </div>
                    <span className={`text-xs font-medium ${o.status === 'PREPAID' ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {o.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!selected && (
        <div className="text-center py-12 text-stone-400">
          <div className="text-4xl mb-2">👈</div>
          <p>Select a merchant to view their dashboard</p>
        </div>
      )}
    </div>
  );
}
