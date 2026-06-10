import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { formatNGN } from '../utils/format';

export default function Checkout({ user, setUser }: { user: any; setUser: (u: any) => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { merchantId } = useParams();
  const state = location.state as any;

  const [downPayment, setDownPayment] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  if (!state?.items?.length) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">🛒</div>
        <h2 className="text-xl font-bold mb-2">Cart is empty</h2>
        <p className="text-stone-400 mb-4">Add items from the menu first.</p>
        <button onClick={() => navigate(`/menu/${merchantId}`)} className="text-emerald-600 font-medium hover:underline">← Back to menu</button>
      </div>
    );
  }

  const { items, merchant } = state;
  const total = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
  const down = parseFloat(downPayment) || 0;
  const fee = down < total ? Math.round((total - down) * 0.10 * 100) / 100 : 0;
  const outstanding = Math.max(0, total - down + fee);
  const perOrderLimit = user?.tierLimit?.max_subsidy || 2500;
  const creditCap = user?.tierLimit?.credit_cap || 5000;
  const currentDebt = user?.outstanding_balance || 0;
  const newTotalDebt = currentDebt + outstanding;
  const exceedsPerOrderLimit = outstanding > perOrderLimit;
  const exceedsCreditCap = down < total && newTotalDebt > creditCap;
  const creditRoom = Math.max(0, creditCap - currentDebt);

  const handleSubmit = async () => {
    if (down <= 0 || down > total) { setError('Enter a valid down payment amount'); return; }
    if (exceedsPerOrderLimit) { setError(`Outstanding ${formatNGN(outstanding)} exceeds your ${user.tier} per-order limit of ${formatNGN(perOrderLimit)}`); return; }
    if (exceedsCreditCap) { setError(`Total debt of ${formatNGN(newTotalDebt)} would exceed your ${user.tier} credit cap of ${formatNGN(creditCap)}. You can only accrue ${formatNGN(creditRoom)} more. Increase down payment or clear debt first.`); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.createOrder({
        merchantId: merchantId || merchant.id,
        items: items.map((i: any) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
        downPayment: down,
      });
      setResult(res);
      // Refresh user
      api.getMe().then(setUser).catch(() => {});
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  if (result) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-2">Order Confirmed!</h2>
        <p className="text-stone-500 mb-6">
          Your meal has been prepaid. The merchant has received full payment.
        </p>
        <div className="bg-stone-50 rounded-xl p-6 border border-stone-200 mb-6 text-left space-y-2">
          <div className="flex justify-between"><span className="text-stone-400">Total</span><span className="font-bold">{formatNGN(total)}</span></div>
          <div className="flex justify-between"><span className="text-stone-400">You paid</span><span className="font-bold text-emerald-600">{formatNGN(down)}</span></div>
          <div className="flex justify-between"><span className="text-stone-400">Chop First covered</span><span className="font-bold text-amber-600">{formatNGN(total - down)}</span></div>
          {result.outstanding > 0 && (
            <>
              <div className="border-t border-stone-200 pt-2 flex justify-between">
                <span className="text-stone-400">Outstanding</span>
                <span className="font-bold text-red-500">{formatNGN(result.outstanding)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-400">Fee (10%)</span>
                <span className="text-stone-500">{formatNGN(result.fee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-400">Due by</span>
                <span className="text-stone-500">{new Date(result.dueAt).toLocaleDateString()}</span>
              </div>
            </>
          )}
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors">
            Dashboard
          </button>
          {result.outstanding > 0 && (
            <button onClick={() => navigate('/tasks')} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors">
              Clear via Tasks →
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-stone-400 hover:text-stone-600 mb-4 flex items-center gap-1">
        ← Back to menu
      </button>

      <h1 className="text-2xl font-bold mb-1">Checkout</h1>
      <p className="text-stone-400 mb-6">{merchant?.name}</p>

      {/* Order Summary */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 mb-6">
        <h3 className="font-semibold mb-3">Order Summary</h3>
        <div className="space-y-2">
          {items.map((item: any, i: number) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{item.quantity}x {item.name}</span>
              <span className="font-medium">{formatNGN(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-stone-200 mt-3 pt-3 flex justify-between font-bold">
          <span>Total</span>
          <span>{formatNGN(total)}</span>
        </div>
      </div>

      {/* How Much You Get */}
      <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6 mb-6">
        <div className="text-3xl mb-2">💬</div>
        <h2 className="text-xl font-bold text-emerald-800 mb-1">How much you get?</h2>
        <p className="text-sm text-emerald-600 mb-4">Enter what you can afford to pay right now.</p>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-stone-400">₦</span>
          <input
            type="number"
            value={downPayment}
            onChange={e => { setDownPayment(e.target.value); setError(''); }}
            placeholder="e.g. 1500"
            className="w-full pl-10 pr-4 py-3.5 text-xl font-bold rounded-xl border-2 border-emerald-300 focus:border-emerald-500 focus:outline-none bg-white"
            max={total}
          />
        </div>

        {/* Dynamic breakdown */}
        {down > 0 && down <= total && (
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-stone-600">
              <span>Total meal cost</span>
              <span>{formatNGN(total)}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Your payment</span>
              <span className="text-emerald-600 font-medium">−{formatNGN(down)}</span>
            </div>
            {down < total && (
              <>
                <div className="flex justify-between text-stone-600">
                  <span>Chop First subsidy</span>
                  <span className="text-amber-600 font-medium">{formatNGN(total - down)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Processing fee (10%)</span>
                  <span>{formatNGN(fee)}</span>
                </div>
              </>
            )}
            <div className={`border-t pt-2 flex justify-between font-bold text-lg ${exceedsPerOrderLimit ? 'text-red-500' : 'text-emerald-700'}`}>
              <span>This order outstanding</span>
              <span>{formatNGN(outstanding)}</span>
            </div>
            <div className="flex justify-between text-xs text-stone-400">
              <span>Per-order subsidy limit</span>
              <span>{formatNGN(perOrderLimit)}</span>
            </div>
            {down < total && (
              <>
                <div className="border-t border-stone-100 pt-2 flex justify-between text-sm">
                  <span className="text-stone-500">Current total debt</span>
                  <span className="font-medium">{formatNGN(currentDebt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Total after this order</span>
                  <span className={`font-bold ${exceedsCreditCap ? 'text-red-500' : 'text-amber-600'}`}>{formatNGN(newTotalDebt)}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-400">
                  <span>{user?.tier} credit cap</span>
                  <span>{formatNGN(creditCap)}</span>
                </div>
                {/* Credit cap gauge */}
                <div className="mt-2 bg-stone-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${newTotalDebt > creditCap ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (newTotalDebt / creditCap) * 100)}%` }}
                  />
                </div>
                <div className="text-xs text-stone-400 text-right">{Math.round((newTotalDebt / creditCap) * 100)}% of credit cap used</div>
              </>
            )}
            {exceedsPerOrderLimit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mt-2">
                ⚠️ This exceeds your {user?.tier} per-order limit of {formatNGN(perOrderLimit)}. 
                Pay at least {formatNGN(total - perOrderLimit + fee + 1)} as down payment.
              </div>
            )}
            {exceedsCreditCap && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mt-2">
                ⚠️ Total debt would reach {formatNGN(newTotalDebt)}, exceeding your {user?.tier} credit cap of {formatNGN(creditCap)}.
                You can only accrue {formatNGN(creditRoom)} more. Pay at least {formatNGN(total - creditRoom + fee + 1)} down.
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || down <= 0 || down > total || exceedsPerOrderLimit || exceedsCreditCap}
        className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition-colors disabled:bg-emerald-300 disabled:cursor-not-allowed shadow-lg"
      >
        {loading ? 'Processing...' : down >= total ? 'Pay & Complete Order' : `Pay ${formatNGN(down)} — Start Order`}
      </button>

      {down < total && (
        <p className="text-center text-xs text-stone-500 mt-3">
          Chop First will pay the remaining {formatNGN(total - down)} to the merchant immediately. 
          You have {user?.tierLimit?.window_days || 7} days to repay {formatNGN(outstanding)}.
        </p>
      )}
    </div>
  );
}
