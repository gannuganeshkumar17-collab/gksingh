import { useState } from 'react';
import { Check, Copy, MessageSquare, X } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

export function SmsNotificationBanner() {
  const { smsToasts, dismissSmsToast } = useWallet();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (smsToasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {smsToasts.map((sms) => (
        <div
          key={sms.id}
          className="pointer-events-auto rounded-2xl bg-[#162230] border border-amber-500/40 shadow-2xl p-4 animate-card-deal"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
              <MessageSquare className="w-4 h-4" />
              <span>Mobile SMS Inbox · {sms.phone}</span>
            </div>
            <button
              onClick={() => dismissSmsToast(sms.id)}
              className="text-slate-400 hover:text-white"
              aria-label="Dismiss SMS"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-200 leading-relaxed">{sms.message}</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm font-mono-num font-bold text-white tracking-widest bg-[#0B1117] px-3 py-1 rounded-lg border border-white/10">
              {sms.otp}
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(sms.otp);
                setCopiedId(sms.id);
                setTimeout(() => setCopiedId(null), 2000);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors"
            >
              {copiedId === sms.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedId === sms.id ? 'Copied' : 'Copy OTP'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
