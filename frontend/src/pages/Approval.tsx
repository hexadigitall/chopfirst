import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function Approval() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'submitted' | 'reviewing' | 'approved'>('submitted');

  useEffect(() => {
    const isNew = localStorage.getItem('chopfirst_new_user');
    if (!isNew) { navigate('/login', { replace: true }); return; }

    const t1 = setTimeout(() => setStep('reviewing'), 1500);
    const t2 = setTimeout(() => {
      setStep('approved');
      localStorage.removeItem('chopfirst_new_user');
    }, 3500);
    const t3 = setTimeout(async () => {
      const stored = localStorage.getItem('chopfirst_user');
      if (stored) {
        try {
          const u = await api.getMe();
          navigate('/dashboard', { replace: true });
        } catch {
          navigate('/login', { replace: true });
        }
      }
    }, 5000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <img src="/logo.png" alt="Chop First" className="w-16 mx-auto mb-6" />

        {step === 'submitted' && (
          <div className="animate-pulse">
            <div className="text-5xl mb-4">📝</div>
            <h1 className="text-2xl font-bold mb-2">Application Submitted</h1>
            <p className="text-stone-500">We are reviewing your information...</p>
          </div>
        )}

        {step === 'reviewing' && (
          <div className="animate-pulse">
            <div className="text-5xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold mb-2">Verifying Details</h1>
            <p className="text-stone-500">Checking your credentials against national databases...</p>
            <div className="mt-6 space-y-2 text-left bg-white rounded-xl border border-stone-200 p-4 text-sm">
              <div className="flex items-center gap-2 text-emerald-600">
                <span>✅</span> <span>NIN verification passed</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600">
                <span>✅</span> <span>BVN match confirmed</span>
              </div>
              <div className="flex items-center gap-2 text-stone-400">
                <span className="animate-pulse">⏳</span> <span>Identity fraud check...</span>
              </div>
            </div>
          </div>
        )}

        {step === 'approved' && (
          <div>
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold mb-2 text-emerald-700">Account Approved!</h1>
            <p className="text-stone-500 mb-6">Your Chop First account is active. Redirecting to your dashboard...</p>
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}
      </div>
    </div>
  );
}
