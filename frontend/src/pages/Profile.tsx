import { Link } from 'react-router-dom';
import { formatNGN, tierColor } from '../utils/format';

export default function Profile({ user, onLogout }: { user: any; onLogout: () => void }) {
  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
          {user?.name?.charAt(0)}
        </div>
        <h1 className="text-2xl font-bold">{user?.name}</h1>
        <p className="text-stone-400">{user?.phone}</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-stone-400">Tier</span>
            <span className={`px-3 py-1 rounded-xl text-sm font-bold ${tierColor(user?.tier)}`}>{user?.tier}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-stone-400">Status</span>
            <span className={`font-bold ${user?.status === 'ACTIVE' ? 'text-emerald-600' : 'text-red-600'}`}>{user?.status}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-stone-400">Outstanding Balance</span>
            <span className="font-bold">{formatNGN(user?.outstanding_balance || 0)}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-stone-400">Clean Cycles</span>
            <span className="font-bold">{user?.clean_cycles || 0}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-stone-400">Max Subsidy (per order)</span>
            <span className="font-bold">{formatNGN(user?.tierLimit?.max_subsidy || 0)}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-stone-400">Credit Cap (total debt)</span>
            <span className="font-bold">{formatNGN(user?.tierLimit?.credit_cap || 5000)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-stone-400">Settlement Window</span>
            <span className="font-bold">{user?.tierLimit?.window_days || 7} days</span>
          </div>
        </div>

        {user?.wallet_address && (
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <h3 className="font-bold mb-2">KINDRED Wallet</h3>
            <div className="text-sm text-stone-400 truncate">{user.wallet_address}</div>
            <div className="mt-2 flex justify-between">
              <span className="text-stone-400">$KIND Balance</span>
              <span className="font-bold">{user.kind_balance} $KIND</span>
            </div>
          </div>
        )}

        <button
          onClick={onLogout}
          className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors border border-red-200"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
