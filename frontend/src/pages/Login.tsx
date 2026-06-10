import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function Login({ onLogin }: { onLogin: (id: string) => void }) {
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credential.trim() || !password) { setError('Phone/email and password required'); return; }
    setLoading(true);
    setError('');
    try {
      const user = await api.login(credential.trim(), password);
      onLogin(user.id);
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Chop First" className="w-16 mx-auto mb-3" />
          <h1 className="text-2xl font-bold">Sign In</h1>
          <p className="text-stone-500 mt-1">Welcome back to Chop First</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center">
              {error}
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-stone-600 mb-1 block">Phone or Email</label>
            <input
              value={credential}
              onChange={e => setCredential(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="+2348012345678 or email@example.com"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-600 mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Enter your password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition-colors disabled:bg-emerald-300"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <p className="text-center text-sm text-stone-400">
            Don't have an account?{' '}
            <Link to="/signup" className="text-emerald-600 font-medium hover:underline">Create one</Link>
          </p>
          <div className="border-t border-stone-100 pt-4 text-center">
            <Link to="/demo-login" className="text-xs text-stone-400 hover:text-stone-600 underline">
              Try demo accounts
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
