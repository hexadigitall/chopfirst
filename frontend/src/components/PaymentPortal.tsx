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
    <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl px-4 py-4 text-white shadow-lg relative overflow-hidden">
      <div className="absolute top-2 right-3 text-xs font-bold tracking-widest opacity-30">CHOP FIRST</div>
      <div className="text-[10px] text-emerald-200 mb-2">•••• prepaid card</div>
      <div className="text-base font-mono tracking-widest mb-3">{cardNumber}</div>
      <div className="flex justify-between text-[10px]">
        <div>
          <div className="text-emerald-200">Cardholder</div>
          <div className="font-medium text-xs truncate max-w-36">{userName}</div>
        </div>
        <div className="text-right">
          <div className="text-emerald-200">Expires</div>
          <div className="font-medium text-xs">{expiry}</div>
        </div>
      </div>
    </div>
  );

  if (step === 'processing') {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-5 w-full max-w-[340px] text-center shadow-2xl">
          {cardPreview}
          <div className="animate-pulse space-y-3 mt-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="font-semibold text-sm text-stone-700">Processing payment...</p>
            <p className="text-xs text-stone-400">{label}</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-5 w-full max-w-[340px] text-center shadow-2xl">
          {cardPreview}
          <div className="text-4xl mt-4 mb-2">✅</div>
          <h3 className="text-lg font-bold text-emerald-700 mb-1">Payment Successful!</h3>
          <p className="text-xs text-stone-500">{label}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-[340px] shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 pt-6">
          {cardPreview}
          <h3 className="text-base font-bold text-stone-800 mt-4 mb-1">Confirm Payment</h3>
          <p className="text-xs text-stone-500 mb-4">{label}</p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 pb-5 space-y-4">
          <div>
            <label className="text-[11px] font-medium text-stone-500 mb-1 block">Card Number</label>
            <input
              value={cardNumber}
              onChange={e => setCardNumber(e.target.value)}
              className="w-full px-4 py-3 border border-stone-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              maxLength={19}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-stone-500 mb-1 block">Expiry</label>
              <input
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
                className="w-full px-4 py-3 border border-stone-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="MM/YY"
                maxLength={5}
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-stone-500 mb-1 block">CVV</label>
              <input
                value={cvv}
                onChange={e => setCvv(e.target.value)}
                className="w-full px-4 py-3 border border-stone-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                maxLength={4}
                required
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-stone-500 mb-1 block">Cardholder Name</label>
            <div className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm bg-stone-50 text-stone-700">
              {userName}
            </div>
          </div>
          <button
            type="submit"
            disabled={processing}
            className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-base hover:bg-emerald-700 transition-colors disabled:bg-emerald-300"
          >
            Pay ₦{amount.toLocaleString()}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
