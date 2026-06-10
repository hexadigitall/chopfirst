import { useState } from 'react';

const CARD_NUMBER = '4242 4242 4242 4242';
const EXPIRY = '12/28';
const CVV = '123';

export default function PaymentPortal({
  userName,
  amount,
  label,
  onConfirm,
  onCancel,
}: {
  userName: string;
  amount: number;
  label: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [cardNumber, setCardNumber] = useState(CARD_NUMBER);
  const [expiry, setExpiry] = useState(EXPIRY);
  const [cvv, setCvv] = useState(CVV);
  const [name, setName] = useState(userName);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'form' | 'processing' | 'done'>('form');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('processing');
    setProcessing(true);
    await new Promise(r => setTimeout(r, 1500));
    await onConfirm();
    setStep('done');
    setProcessing(false);
    await new Promise(r => setTimeout(r, 800));
    onCancel();
  };

  const cardPreview = (
    <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl p-5 text-white shadow-lg mb-5 relative overflow-hidden">
      <div className="absolute top-3 right-4 text-lg font-bold tracking-widest opacity-40">CHOP FIRST</div>
      <div className="text-xs text-emerald-200 mb-6">•••• prepaid card</div>
      <div className="text-lg font-mono tracking-widest mb-4">{cardNumber}</div>
      <div className="flex justify-between text-xs">
        <div>
          <div className="text-emerald-200 mb-0.5">Cardholder</div>
          <div className="font-medium">{name}</div>
        </div>
        <div className="text-right">
          <div className="text-emerald-200 mb-0.5">Expires</div>
          <div className="font-medium">{expiry}</div>
        </div>
      </div>
    </div>
  );

  if (step === 'processing') {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          {cardPreview}
          <div className="animate-pulse space-y-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="font-semibold text-stone-700">Processing payment...</p>
            <p className="text-sm text-stone-400">{label}</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          {cardPreview}
          <div className="text-5xl mb-3">✅</div>
          <h3 className="text-xl font-bold text-emerald-700 mb-1">Payment Successful!</h3>
          <p className="text-sm text-stone-500">{label}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl">
        <div className="p-6 pb-0">
          {cardPreview}
          <h3 className="text-lg font-bold text-stone-800 mb-1">Confirm Payment</h3>
          <p className="text-sm text-stone-500 mb-4">{label}</p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3">
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Card Number</label>
            <input
              value={cardNumber}
              onChange={e => setCardNumber(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              maxLength={19}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-stone-500 mb-1 block">Expiry</label>
              <input
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="MM/YY"
                maxLength={5}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-500 mb-1 block">CVV</label>
              <input
                value={cvv}
                onChange={e => setCvv(e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                maxLength={4}
                required
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Cardholder Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={processing}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition-colors disabled:bg-emerald-300"
          >
            Pay ₦{amount.toLocaleString()}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 text-sm text-stone-400 hover:text-stone-600 transition-colors"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
