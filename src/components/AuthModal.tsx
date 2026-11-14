import React, { useEffect, useState } from 'react';
import { Phone, ShieldCheck, X } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

export function AuthModal() {
  const {
    authModalOpen,
    setAuthModalOpen,
    sendPhoneOtp,
    verifyPhoneOtp,
    signInWithGoogle,
    user,
    verifyPhoneForSignedInUser,
  } = useWallet();

  const [tab, setTab] = useState<'phone' | 'google'>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sentToPhone, setSentToPhone] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  if (!authModalOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    const res = await sendPhoneOtp(phone, name);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Could not send OTP.');
      return;
    }
    setOtpSent(true);
    setSentToPhone(res.phone || phone);
    setCountdown(60);
    setSuccessMsg(`6-digit OTP sent to ${res.phone}. Check the SMS alert at top-right.`);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (user && user.authMethod === 'google' && !user.phoneVerified) {
      const res = await verifyPhoneForSignedInUser(sentToPhone || phone, otp);
      setLoading(false);
      if (!res.success) {
        setError(res.error || 'Invalid OTP.');
        return;
      }
      setAuthModalOpen(false);
      return;
    }

    const res = await verifyPhoneOtp(sentToPhone || phone, otp, name);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Invalid OTP.');
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    const res = await signInWithGoogle();
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Google sign-in failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#131C26] border border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-display font-bold text-white">
              {user ? 'Verify Mobile Number' : 'Login & Register'}
            </h2>
            <p className="text-xs text-slate-400">
              Get ₹10 Instant Cash Balance on first registration
            </p>
          </div>
          <button
            onClick={() => setAuthModalOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!user && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#0B1117] rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setTab('phone');
                  setError('');
                }}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  tab === 'phone'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Mobile + OTP
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('google');
                  setError('');
                }}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  tab === 'google'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Google Account
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
              {successMsg}
            </div>
          )}

          {tab === 'phone' || user ? (
            !otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                {!user && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Full Name (New or Existing Player)
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Aman Raj"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1117] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Mobile Number (+91)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#0B1117] border border-white/10 text-sm font-mono-num text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending OTP...' : 'Send 6-Digit OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Verifying {sentToPhone}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                      setError('');
                    }}
                    className="text-amber-400 hover:underline"
                  >
                    Change Number
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Enter 6-Digit OTP
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-4 py-3 rounded-xl bg-[#0B1117] border border-white/10 text-center text-xl tracking-[0.4em] font-mono-num text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {loading ? 'Verifying...' : 'Verify OTP & Enter Arena'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    disabled={countdown > 0 || loading}
                    onClick={handleSendOtp}
                    className="text-xs text-slate-400 hover:text-amber-400 disabled:opacity-50"
                  >
                    {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            )
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Sign in with your Google account for automatic cloud wallet sync across all devices via Firebase Firestore.
              </p>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                {loading ? 'Connecting...' : 'Continue with Google'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
