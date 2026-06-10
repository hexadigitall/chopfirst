import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { formatNGN, daysUntil, isOverdue, tierColor, statusColor } from '../utils/format';

export default function Dashboard({ user, setUser }: { user: any; setUser: (u: any) => void }) {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [info, setInfo] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getMerchants().then(setMerchants).catch(() => {});
    if (user) {
      api.getMe().then(u => { setUser(u); }).catch(() => {});
      api.getOrders().then(setOrders).catch(() => {});
    }
    api.getPlatformInfo().then(setInfo).catch(() => {});
  }, []);

  const isFrozen = user?.status === 'FROZEN';
  const isSuspended = user?.status === 'SUSPENDED';
  const hasDebt = (user?.outstanding_balance || 0) > 0;

  const handlePay = async (amount: number) => {
    setPaying(true);
    setPayMsg('');
    try {
      const result = await api.payUser(amount);
      setUser(result);
      if (result.fullyCleared) setPayMsg('Balance fully cleared! 🎉');
      else setPayMsg(`Payment of ${formatNGN(result.paid)} received. ${formatNGN(result.outstanding_balance)} remaining.`);
      setPayAmount('');
      // Refresh orders
      api.getOrders().then(setOrders).catch(() => {});
    } catch (e: any) {
      setPayMsg(e.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {isFrozen && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <div className="text-2xl">⛔</div>
          <div>
            <h3 className="font-bold text-red-800">Account Frozen</h3>
            <p className="text-sm text-red-600">
              Your remaining credit of {formatNGN((user?.tierLimit?.credit_cap || 5000) - (user?.outstanding_balance || 0))} 
              is too small to cover any available item (cheapest: {formatNGN(info?.stats?.cheapestItemPrice || 500)}).
              Clear some debt to free up credit and continue ordering.
            </p>
            <Link to="/tasks" className="inline-block mt-2 text-sm font-medium text-red-700 hover:text-red-800 underline">
              View available tasks →
            </Link>
          </div>
        </div>
      )}

      {/* Welcome & Tier */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
          <p className="text-stone-500">What would you like to eat today?</p>
        </div>
        <div className={`px-3 py-1.5 rounded-xl text-sm font-bold ${tierColor(user?.tier)}`}>
          {user?.tier} Tier
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-sm text-emerald-100">Outstanding Balance</div>
            <div className="text-3xl font-bold">{formatNGN(user?.outstanding_balance || 0)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-emerald-100">Status</div>
            <div className={`font-bold ${user?.status === 'ACTIVE' ? 'text-emerald-200' : 'text-red-300'}`}>
              {user?.status}
            </div>
          </div>
        </div>
        <div className="flex gap-4 text-sm flex-wrap">
          <div className="bg-emerald-700 rounded-lg px-3 py-2">
            <div className="text-emerald-200">Clean Cycles</div>
            <div className="font-bold">{user?.clean_cycles || 0}</div>
          </div>
          <div className="bg-emerald-700 rounded-lg px-3 py-2">
            <div className="text-emerald-200">Per-Order Limit</div>
            <div className="font-bold">{formatNGN(user?.tierLimit?.max_subsidy || 0)}</div>
          </div>
          <div className="bg-emerald-700 rounded-lg px-3 py-2">
            <div className="text-emerald-200">Window</div>
            <div className="font-bold">{user?.tierLimit?.window_days || 7}d</div>
          </div>
        </div>
        {/* Credit cap bar */}
        <div className="mt-4 bg-emerald-700 rounded-lg px-3 py-2">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-emerald-200">Credit Cap Usage</span>
            <span className="font-bold">
              {formatNGN(user?.outstanding_balance || 0)} / {formatNGN(user?.tierLimit?.credit_cap || 5000)}
            </span>
          </div>
          <div className="bg-emerald-600 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${Math.min(100, ((user?.outstanding_balance || 0) / (user?.tierLimit?.credit_cap || 5000)) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Clear Balance */}
      {hasDebt && (
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="text-lg font-bold mb-3">Clear Balance</h2>
          <p className="text-sm text-stone-500 mb-4">
            You owe {formatNGN(user?.outstanding_balance)}. Pay down your balance to free up credit.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handlePay(user?.outstanding_balance)}
              disabled={paying}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:bg-emerald-300 transition-colors"
            >
              {paying ? 'Processing...' : `Pay in Full (${formatNGN(user?.outstanding_balance)})`}
            </button>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max={user?.outstanding_balance || 0}
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                placeholder="Amount"
                className="w-28 px-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => handlePay(Number(payAmount))}
                disabled={paying || !payAmount || Number(payAmount) <= 0}
                className="px-5 py-2.5 bg-stone-700 text-white rounded-xl font-medium hover:bg-stone-800 disabled:bg-stone-400 transition-colors"
              >
                Pay
              </button>
            </div>
          </div>
          {payMsg && (
            <p className="mt-3 text-sm font-medium text-emerald-600">{payMsg}</p>
          )}
        </div>
      )}

      {/* Quick Actions */}
      {!isSuspended && (
        <div>
          <h2 className="text-lg font-bold mb-3">Partner Restaurants</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {merchants.filter(m => m.is_active).map(m => (
              <button
                key={m.id}
                onClick={() => {
                  if (isFrozen) { navigate('/tasks'); return; }
                  navigate(`/menu/${m.id}`);
                }}
                className="text-left bg-white rounded-xl border border-stone-200 p-5 hover:border-emerald-300 hover:shadow-md transition-all group"
              >
                <div className="text-3xl mb-2">
                  {m.name.includes('Mama') ? '🍲' : m.name.includes('Buka') ? '🥘' : '🥩'}
                </div>
                <h3 className="font-bold text-stone-800 group-hover:text-emerald-700 transition-colors">{m.name}</h3>
                <p className="text-sm text-stone-500">{m.location}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600 font-medium">
                  <span>{m.total_prepaid} meals served</span>
                  <span>→</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Orders */}
      {orders.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3">Recent Orders</h2>
          <div className="space-y-3">
            {orders.slice(0, 5).map((o: any) => (
              <div key={o.id} className="bg-white rounded-xl border border-stone-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{o.merchant_name}</div>
                    <div className="text-sm text-stone-500">
                      {formatNGN(o.total_cost)} · {o.status}
                    </div>
                  </div>
                  <div className="text-right">
                    {o.status === 'PREPAID' && (
                      <div className={`text-sm font-medium ${isOverdue(o.due_at) ? 'text-red-500' : 'text-amber-500'}`}>
                        {isOverdue(o.due_at) ? 'Overdue' : `${daysUntil(o.due_at)}d left`}
                      </div>
                    )}
                    <div className={`text-xs font-medium ${o.status === 'COMPLETED' ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {formatNGN(o.outstanding)} outstanding
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform Stats */}
      {info && (
        <div className="bg-stone-100 rounded-xl p-4">
          <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-3">Platform Impact</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-stone-800">{info.stats.totalMealsServed}</div>
              <div className="text-xs text-stone-500">Meals Served</div>
            </div>
            <div>
              <div className="text-xl font-bold text-stone-800">{info.stats.activeMerchants}</div>
              <div className="text-xs text-stone-500">Merchants</div>
            </div>
            <div>
              <div className="text-xl font-bold text-stone-800">{formatNGN(info.stats.totalSubsidyDispersed)}</div>
              <div className="text-xs text-stone-500">Total Subsidy</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
