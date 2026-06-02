import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { formatNGN } from '../utils/format';

export default function MenuPage({ user }: { user: any }) {
  const { merchantId } = useParams();
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState<any>(null);
  const [cart, setCart] = useState<Record<string, { item: any; qty: number }>>({});

  useEffect(() => {
    if (merchantId) api.getMerchant(merchantId).then(setMerchant).catch(() => navigate('/dashboard'));
  }, [merchantId]);

  if (!merchant) return <div className="text-center py-12 text-stone-400">Loading...</div>;

  const addItem = (item: any) => {
    setCart(prev => {
      const next = { ...prev };
      const existing = next[item.id];
      if (existing) {
        next[item.id] = { ...existing, qty: existing.qty + 1 };
      } else {
        next[item.id] = { item, qty: 1 };
      }
      return next;
    });
  };

  const removeItem = (itemId: string) => {
    setCart(prev => {
      const next = { ...prev };
      if (next[itemId]) {
        if (next[itemId].qty <= 1) delete next[itemId];
        else next[itemId] = { ...next[itemId], qty: next[itemId].qty - 1 };
      }
      return next;
    });
  };

  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((s, c) => s + c.item.price * c.qty, 0);
  const isFrozen = user?.status === 'FROZEN';

  return (
    <div>
      <button onClick={() => navigate('/dashboard')} className="text-sm text-stone-400 hover:text-stone-600 mb-4 flex items-center gap-1">
        ← Back to restaurants
      </button>

      <div className="flex items-start gap-4 mb-6">
        <div className="text-5xl">
          {merchant.name.includes('Mama') ? '🍲' : merchant.name.includes('Buka') ? '🥘' : '🥩'}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{merchant.name}</h1>
          <p className="text-stone-400">{merchant.location}</p>
          <p className="text-sm text-emerald-600 font-medium">{merchant.stats?.total_orders || 0} orders fulfilled</p>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="grid sm:grid-cols-2 gap-4 mb-24">
        {(merchant.menu || []).map((item: any) => {
          const inCart = cart[item.id];
          return (
            <div key={item.id} className={`bg-white rounded-xl border p-4 transition-all ${inCart ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-stone-200'}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  {item.description && <p className="text-sm text-stone-400">{item.description}</p>}
                </div>
                <div className="text-lg font-bold text-emerald-700">{formatNGN(item.price)}</div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">{item.category}</span>
                {inCart ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeItem(item.id)} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 text-sm font-bold">−</button>
                    <span className="font-bold w-6 text-center">{inCart.qty}</span>
                    <button onClick={() => addItem(item)} className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center hover:bg-emerald-200 text-sm font-bold text-emerald-700">+</button>
                  </div>
                ) : (
                  <button
                    onClick={() => addItem(item)}
                    className="px-4 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Cart */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4 shadow-lg">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <div className="text-sm text-stone-400">{cartItems.reduce((s, c) => s + c.qty, 0)} items</div>
              <div className="text-xl font-bold">{formatNGN(cartTotal)}</div>
            </div>
            <button
              onClick={() => {
                if (isFrozen) { navigate('/tasks'); return; }
                navigate(`/checkout/${merchantId}`, { state: { items: Object.values(cart).map(c => ({ menuItemId: c.item.id, name: c.item.name, price: c.item.price, quantity: c.qty })), merchant } });
              }}
              className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg"
            >
              {isFrozen ? 'Account Frozen — Clear via Tasks' : 'Proceed to Checkout →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
