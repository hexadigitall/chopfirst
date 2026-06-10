import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function Signup() {
  const [name, setName] = useState('');
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    if (!credential.trim()) { setError('Phone or email is required'); return; }
    if (!password) { setError('Password is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError('');
    try {
      const isEmail = credential.includes('@');
      const user = await api.createUser({
        name: name.trim(),
        ...(isEmail ? { email: credential.trim() } : { phone: credential.trim() }),
        password,
      });
      localStorage.setItem('chopfirst_user', user.id);
      localStorage.setItem('chopfirst_new_user', 'true');
      navigate('/approval', { replace: true });
    } catch (e: any) {
      setError(e.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Chop First" className="w-16 mx-auto mb-3" />
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-stone-500 mt-1">Join Chop First and start ordering</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center">
              {error}
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-stone-600 mb-1 block">Full Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Ada Okafor"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-600 mb-1 block">Phone or Email</label>
            <input
              value={credential}
              onChange={e => setCredential(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="+2348012345678 or ada@example.com"
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
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition-colors disabled:bg-emerald-300"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
          <p className="text-center text-sm text-stone-400">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-600 font-medium hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
