import { useEffect, useState } from 'react';
import { api } from '../api/client';

const tierStyles: Record<string, string> = {
  UNVERIFIED: 'bg-stone-100 text-stone-600',
  VERIFIED: 'bg-emerald-100 text-emerald-700',
  COMMUNITY: 'bg-amber-100 text-amber-700',
};

export default function DemoLogin({ onLogin }: { onLogin: (id: string) => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getAdminUsers()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Chop First" className="w-16 mx-auto mb-3" />
          <h1 className="text-2xl font-bold">Demo Login</h1>
          <p className="text-stone-500 mt-1">Select a user to explore the Chop First platform</p>
        </div>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center">
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-center text-stone-500">Loading users...</div>
        ) : !error && (
          <div className="space-y-3">
            {users.map((u: any) => (
              <button
                key={u.id}
                onClick={() => onLogin(u.id)}
                className="w-full text-left p-4 rounded-xl border border-stone-200 bg-white hover:border-emerald-300 hover:shadow-md transition-all flex items-center gap-4 group"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  {u.name?.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-stone-800">{u.name}</div>
                  <div className="text-sm text-stone-500">{u.phone}</div>
                  <div className="flex gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tierStyles[u.tier] || ''}`}>
                      {u.tier}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {u.status}
                    </span>
                    {u.outstanding_balance > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                        ₦{u.outstanding_balance.toLocaleString()} owed
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-stone-400 group-hover:text-emerald-500 transition-colors">→</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
