import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { formatNGN, tierColor } from '../utils/format';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#d6d3d1', '#34d399', '#f59e0b'];

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [creditTarget, setCreditTarget] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState('');

  const load = () => {
    setError('');
    api.getMetrics().then(setMetrics).catch((e) => setError(e.message));
    api.getAdminUsers().then(setUsers).catch((e) => setError(e.message));
    api.getAllTasks().then(setTasks).catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const handleFreeze = async (userId: string) => {
    setError('');
    setActionLoading(userId);
    try {
      await api.toggleFreeze(userId);
      load();
    } catch (e: any) { setError(e.message); }
    setActionLoading(null);
  };

  const handleCredit = async (userId: string) => {
    if (!creditAmount || isNaN(Number(creditAmount)) || Number(creditAmount) <= 0) return;
    setError('');
    setActionLoading(userId);
    try {
      await api.manualCredit(userId, Number(creditAmount));
      setCreditTarget(null);
      setCreditAmount('');
      load();
    } catch (e: any) { setError(e.message); }
    setActionLoading(null);
  };

  if (!metrics) return <div className="text-center py-12 text-stone-400">Loading metrics...</div>;

  const tierPie = metrics.tierBreakdown?.map((t: any) => ({ name: t.tier, value: t.count })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-stone-400">Platform oversight & risk management</p>
        </div>
        <button onClick={load} className="px-4 py-2 bg-stone-800 text-white rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors">
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: metrics.totalUsers, color: 'text-stone-800' },
          { label: 'Active', value: metrics.activeUsers, color: 'text-emerald-600' },
          { label: 'Frozen', value: metrics.frozenUsers, color: 'text-red-600' },
          { label: 'Total Orders', value: metrics.totalOrders, color: 'text-amber-600' },
          { label: 'Prepaid (Active)', value: metrics.prepaidOrders, color: 'text-amber-600' },
          { label: 'Total Subsidy', value: formatNGN(metrics.totalSubsidy), color: 'text-emerald-600' },
          { label: 'Revenue', value: formatNGN(metrics.totalRevenue), color: 'text-emerald-600' },
          { label: 'Default Rate', value: `${metrics.defaultRate}%`, color: metrics.defaultRate > 20 ? 'text-red-600' : 'text-amber-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="text-sm text-stone-400 mb-1">{kpi.label}</div>
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Daily Revenue */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="font-bold mb-4">Daily Transaction Volume</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(metrics.dailyRevenue || []).reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v) => v?.slice(5) || ''} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatNGN(v)} />
                <Bar dataKey="revenue" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tier Distribution */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="font-bold mb-4">User Tier Distribution</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tierPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {tierPie.map((_: any, idx: number) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      {/* Credit Modal */}
      {creditTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => { setCreditTarget(null); setCreditAmount(''); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">Manual Credit</h3>
            <p className="text-sm text-stone-500 mb-4">Enter amount to credit {users.find(u => u.id === creditTarget)?.name}'s balance:</p>
            <input
              type="number"
              value={creditAmount}
              onChange={e => setCreditAmount(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
              placeholder="Amount in NGN"
              min="1"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleCredit(creditTarget)}
                disabled={actionLoading === creditTarget || !creditAmount || Number(creditAmount) <= 0}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:bg-emerald-300 transition-colors"
              >
                {actionLoading === creditTarget ? 'Processing...' : 'Apply Credit'}
              </button>
              <button
                onClick={() => { setCreditTarget(null); setCreditAmount(''); }}
                className="px-4 py-2.5 bg-stone-100 text-stone-600 rounded-xl font-medium hover:bg-stone-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Management */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h3 className="font-bold mb-4">User Management</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-stone-400">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Tier</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Debt / Cap</th>
                <th className="pb-2 font-medium">Cycles</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => {
                const cap = u.credit_cap || (u.tier === 'UNVERIFIED' ? 5000 : u.tier === 'VERIFIED' ? 30000 : u.tier === 'TRUSTED' ? 50000 : u.tier === 'ADVANCED' ? 100000 : 150000);
                return (
                <tr key={u.id} className="border-b border-stone-100">
                  <td className="py-3 font-medium">{u.name}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tierColor(u.tier)}`}>{u.tier}</span>
                  </td>
                  <td className="py-3">
                    <span className={`font-medium ${u.status === 'ACTIVE' ? 'text-emerald-600' : u.status === 'FROZEN' ? 'text-red-600' : 'text-stone-400'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className={u.outstanding_balance >= cap ? 'text-red-500 font-bold' : ''}>{formatNGN(u.outstanding_balance)}</span>
                      <span className="text-stone-300">/</span>
                      <span className="text-xs text-stone-400">{formatNGN(cap)}</span>
                    </div>
                  </td>
                  <td className="py-3">{u.clean_cycles}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFreeze(u.id)}
                        disabled={actionLoading === u.id}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          u.status === 'FROZEN' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {u.status === 'FROZEN' ? 'Unfreeze' : 'Freeze'}
                      </button>
                      <button
                        onClick={() => { setCreditTarget(u.id); setCreditAmount(''); }}
                        disabled={actionLoading === u.id}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                      >
                        Credit
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h3 className="font-bold mb-4">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-stone-400">
                <th className="pb-2 font-medium">User</th>
                <th className="pb-2 font-medium">Merchant</th>
                <th className="pb-2 font-medium">Total</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {(metrics.recentOrders || []).map((o: any) => (
                <tr key={o.id} className="border-b border-stone-100">
                  <td className="py-2.5">{o.user_name}</td>
                  <td className="py-2.5">{o.merchant_name}</td>
                  <td className="py-2.5 font-medium">{formatNGN(o.total_cost)}</td>
                  <td className="py-2.5">
                    <span className={`text-xs font-medium ${o.status === 'PREPAID' ? 'text-amber-500' : 'text-emerald-500'}`}>{o.status}</span>
                  </td>
                  <td className="py-2.5 text-stone-400">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Management */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h3 className="font-bold mb-3">⚠️ Risk Management</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-stone-50 rounded-lg p-4">
            <div className="text-sm font-medium text-stone-500">Freeze Guardrail</div>
            <div className="text-2xl font-bold text-stone-800">{metrics.frozenUsers}</div>
            <div className="text-xs text-stone-400">Accounts currently frozen</div>
          </div>
          <div className="bg-stone-50 rounded-lg p-4">
            <div className="text-sm font-medium text-stone-500">Active Subsidy Exposure</div>
            <div className="text-2xl font-bold text-amber-600">{formatNGN(metrics.totalSubsidy)}</div>
            <div className="text-xs text-stone-400">Total subsidy disbursed</div>
          </div>
          <div className="bg-stone-50 rounded-lg p-4">
            <div className="text-sm font-medium text-stone-500">Default Rate</div>
            <div className={`text-2xl font-bold ${metrics.defaultRate > 20 ? 'text-red-600' : 'text-emerald-600'}`}>
              {metrics.defaultRate}%
            </div>
            <div className="text-xs text-stone-400">Orders still outstanding</div>
          </div>
        </div>
      </div>
    </div>
  );
}
