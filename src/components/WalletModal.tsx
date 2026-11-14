import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, CreditCard, Landmark, Smartphone, X } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import type { WalletTransaction } from '../types';

const DEPOSIT_PRESETS = [10, 50, 100, 500, 1000, 5000];

export function WalletModal() {
  const { user, transactions, walletModalTab, setWalletModalTab, deposit, withdraw } = useWallet();

  const [depAmount, setDepAmount] = useState(100);
  const [depMethod, setDepMethod] = useState<'UPI (GPay/PhonePe)' | 'Bank IMPS' | 'Debit/Credit Card'>('UPI (GPay/PhonePe)');
  const [depRef, setDepRef] = useState('');

  const [wdAmount, setWdAmount] = useState(50);
  const [wdMethod, setWdMethod] = useState<'UPI Instant' | 'Bank Transfer'>('UPI Instant');
  const [wdDest, setWdDest] = useState('');

  const [historyFilter, setHistoryFilter] = useState<'all' | 'deposit' | 'withdraw' | 'win' | 'bet'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<WalletTransaction | null>(null);

  if (!walletModalTab) return null;

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setReceipt(null);
    setLoading(true);
    const refCode = depRef.trim() || `UTR${Date.now().toString().slice(-8)}`;
    const res = await deposit(depAmount, depMethod, refCode);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Deposit failed.');
      return;
    }
    if (res.tx) setReceipt(res.tx);
    setDepRef('');
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setReceipt(null);
    setLoading(true);
    const res = await withdraw(wdAmount, wdMethod, wdDest);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Withdrawal failed.');
      return;
    }
    if (res.tx) setReceipt(res.tx);
    setWdDest('');
  };

  const filteredTx =
    historyFilter === 'all' ? transactions : transactions.filter((t) => t.type === historyFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[#131C26] border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-display font-bold text-white">Yono Real Game Wallet</h2>
            <p className="text-xs text-slate-400">
              Balance:{' '}
              <span className="font-mono-num text-amber-400 font-semibold">
                ₹{user ? user.balance.toLocaleString('en-IN') : '0'}
              </span>
              <span className="mx-1.5">·</span>
              <span>Simulated Demo Gateway</span>
            </p>
          </div>
          <button
            onClick={() => {
              setWalletModalTab(null);
              setReceipt(null);
              setError('');
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close wallet"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#0B1117] rounded-xl border border-white/10">
            {(['deposit', 'withdraw', 'history'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setWalletModalTab(t);
                  setError('');
                  setReceipt(null);
                }}
                className={`py-2 px-3 rounded-lg text-sm font-medium capitalize transition-colors whitespace-nowrap ${
                  walletModalTab === t
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t === 'history' ? 'Passbook' : t}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {error}
            </div>
          )}

          {receipt && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-emerald-300">
                  {receipt.type === 'deposit' ? 'Deposit Added to Wallet' : 'Withdrawal Request Processed'}
                </p>
                <p className="text-slate-300">
                  Amount: <span className="font-mono-num font-bold text-white">₹{receipt.amount.toLocaleString('en-IN')}</span> · Method: {receipt.method} · Ref: {receipt.reference}
                </p>
                <p className="text-slate-400">
                  Updated Balance: <span className="font-mono-num text-amber-300">₹{receipt.balanceAfter.toLocaleString('en-IN')}</span>
                </p>
              </div>
            </div>
          )}

          {walletModalTab === 'deposit' && (
            <form onSubmit={handleDeposit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Select Deposit Amount (Min ₹10)</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                  {DEPOSIT_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepAmount(amt)}
                      className={`py-2 px-2 rounded-xl border text-xs font-mono-num font-semibold transition-colors ${
                        depAmount === amt
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-[#0B1117] border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      +₹{amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={10}
                  max={500000}
                  value={depAmount}
                  onChange={(e) => setDepAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0B1117] border border-white/10 font-mono-num text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Payment Channel</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { label: 'UPI (GPay/PhonePe)' as const, icon: Smartphone },
                    { label: 'Bank IMPS' as const, icon: Landmark },
                    { label: 'Debit/Credit Card' as const, icon: CreditCard },
                  ].map((ch) => {
                    const Icon = ch.icon;
                    return (
                      <button
                        key={ch.label}
                        type="button"
                        onClick={() => setDepMethod(ch.label)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-colors ${
                          depMethod === ch.label
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                            : 'bg-[#0B1117] border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0B1117] border border-white/10 text-xs text-slate-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Payee UPI ID</span>
                  <span className="font-mono-num text-amber-300">yonorealgame@upi</span>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">12-Digit UTR / Reference Number (Optional)</label>
                  <input
                    type="text"
                    value={depRef}
                    onChange={(e) => setDepRef(e.target.value)}
                    placeholder="Auto-generated if left blank"
                    className="w-full px-3 py-2 rounded-lg bg-[#131C26] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ArrowDownLeft className="w-4 h-4" />
                {loading ? 'Adding Cash...' : `Add ₹${depAmount.toLocaleString('en-IN')} Now`}
              </button>
            </form>
          )}

          {walletModalTab === 'withdraw' && (
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(['UPI Instant', 'Bank Transfer'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setWdMethod(m)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition-colors ${
                      wdMethod === m
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                        : 'bg-[#0B1117] border-white/10 text-slate-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label className="text-slate-300 font-medium">Withdrawal Amount (Min ₹10)</label>
                  <button
                    type="button"
                    onClick={() => setWdAmount(Math.floor(user?.balance ?? 0))}
                    className="text-amber-400 hover:underline font-mono-num"
                  >
                    Max: ₹{Math.floor(user?.balance ?? 0).toLocaleString('en-IN')}
                  </button>
                </div>
                <input
                  type="number"
                  min={10}
                  max={Math.max(10, Math.floor(user?.balance ?? 0))}
                  value={wdAmount}
                  onChange={(e) => setWdAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0B1117] border border-white/10 font-mono-num text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {wdMethod === 'UPI Instant' ? 'Enter Your UPI ID' : 'Account Number & IFSC Code'}
                </label>
                <input
                  type="text"
                  required
                  value={wdDest}
                  onChange={(e) => setWdDest(e.target.value)}
                  placeholder={wdMethod === 'UPI Instant' ? 'name@okicici or 9876543210@ybl' : 'AC 1234567890 · IFSC SBIN0001234'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1117] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !user || user.balance < wdAmount}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ArrowUpRight className="w-4 h-4" />
                {loading ? 'Processing...' : `Withdraw ₹${wdAmount.toLocaleString('en-IN')}`}
              </button>
            </form>
          )}

          {walletModalTab === 'history' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'deposit', 'withdraw', 'win', 'bet'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setHistoryFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                      historyFilter === f
                        ? 'bg-white text-slate-950'
                        : 'bg-[#0B1117] text-slate-300 hover:text-white border border-white/10'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {filteredTx.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-white/10 rounded-xl">
                  No transactions yet in this category.
                </div>
              ) : (
                <div className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden bg-[#0B1117]">
                  {filteredTx.map((tx) => {
                    const isPositive = tx.type === 'deposit' || tx.type === 'win' || tx.type === 'bonus';
                    return (
                      <div key={tx.id} className="px-4 py-3 flex items-center justify-between gap-4 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold text-white capitalize truncate">
                            {tx.type} · {tx.method}
                          </p>
                          <p className="text-slate-400 truncate">
                            {tx.reference} · {new Date(tx.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-mono-num font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                          </p>
                          <p className="text-[11px] font-mono-num text-slate-500">
                            Bal: ₹{tx.balanceAfter.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
