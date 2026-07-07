import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { api } from './api/client';
import { isStandalone } from './lib/utils';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import MenuPage from './pages/MenuPage';
import Checkout from './pages/Checkout';
import Tasks from './pages/Tasks';
import MerchantDashboard from './pages/MerchantDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import DemoLogin from './pages/DemoLogin';
import Signup from './pages/Signup';
import Approval from './pages/Approval';
import Profile from './pages/Profile';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function RequireAdmin({ user, children }: { user: any; children: React.ReactNode }) {
  if (!user) return <Navigate to="/login" replace />;
  if (user.tier !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function RequireRealUser({ user, children }: { user: any; children: React.ReactNode }) {
  if (!user) return <Navigate to="/login" replace />;
  if (user.id?.startsWith('id_')) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('chopfirst_token');
    if (token) {
      api.getMe().then(u => {
        setUser(u);
        setLoading(false);
      }).catch(() => {
        localStorage.removeItem('chopfirst_token');
        setLoading(false);
        if (location.pathname !== '/') navigate('/login');
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (_userId: string) => {
    const u = await api.getMe();
    setUser(u);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('chopfirst_token');
    setUser(null);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <img src="/logo-white.png" alt="Chop First" className="w-16 animate-pulse" />
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Routes>
        <Route path="/" element={
          user && !user.id?.startsWith('id_')
            ? <Navigate to="/dashboard" replace />
            : isStandalone()
              ? <Navigate to="/signup" replace />
              : <Landing user={user} onLogin={handleLogin} />
        } />
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/demo-login" element={<DemoLogin onLogin={handleLogin} />} />
        <Route path="/signup" element={<Signup onLogin={handleLogin} />} />
        <Route path="/approval" element={<Approval />} />
        <Route element={<Layout user={user} onLogout={handleLogout} />}>
          <Route path="/dashboard" element={<Dashboard user={user} setUser={setUser} />} />
          <Route path="/menu/:merchantId" element={<MenuPage user={user} />} />
          <Route path="/checkout/:merchantId" element={<Checkout user={user} setUser={setUser} />} />
          <Route path="/tasks" element={<Tasks user={user} setUser={setUser} />} />
          <Route path="/merchant" element={<RequireRealUser user={user}><MerchantDashboard /></RequireRealUser>} />
          <Route path="/admin" element={<RequireAdmin user={user}><AdminDashboard /></RequireAdmin>} />
          <Route path="/profile" element={<Profile user={user} onLogout={handleLogout} />} />
        </Route>
      </Routes>
    </GoogleOAuthProvider>
  );
}
