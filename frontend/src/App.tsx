import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const stored = localStorage.getItem('chopfirst_user');
    if (stored) {
      api.getMe().then(u => {
        setUser(u);
        setLoading(false);
      }).catch(() => {
        localStorage.removeItem('chopfirst_user');
        setLoading(false);
        if (location.pathname !== '/') navigate('/');
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (userId: string) => {
    localStorage.setItem('chopfirst_user', userId);
    const u = await api.getMe();
    setUser(u);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('chopfirst_user');
    setUser(null);
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <img src="/logo-white.png" alt="Chop First" className="w-16 animate-pulse" />
      </div>
    );
  }

  return (
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
      <Route path="/signup" element={<Signup />} />
      <Route path="/approval" element={<Approval />} />
      <Route element={<Layout user={user} onLogout={handleLogout} />}>
        <Route path="/dashboard" element={<Dashboard user={user} setUser={setUser} />} />
        <Route path="/menu/:merchantId" element={<MenuPage user={user} />} />
        <Route path="/checkout/:merchantId" element={<Checkout user={user} setUser={setUser} />} />
        <Route path="/tasks" element={<Tasks user={user} setUser={setUser} />} />
        <Route path="/merchant" element={<MerchantDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/profile" element={<Profile user={user} onLogout={handleLogout} />} />
      </Route>
    </Routes>
  );
}
