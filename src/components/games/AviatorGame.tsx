import { useEffect, useRef, useState } from 'react';
import { Plane, Rocket, ShieldCheck } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { soundFx } from '../../utils/sound';

type AviatorVariantId = 'classic' | 'turbo' | 'spacex' | 'chopper' | 'eagle';

interface AviatorVariant {
  id: AviatorVariantId;
  name: string;
  subtitle: string;
  speedRate: number;
  trailColor: string;
  craftColor: string;
  maxCap: number;
  bonusText: string;
}

const VARIANTS: AviatorVariant[] = [
  {
    id: 'classic',
    name: '1. Classic Red Baron',
    subtitle: 'Balanced flight curve · Dual bets · Auto-cashout',
    speedRate: 0.085,
    trailColor: '#ef4444',
    craftColor: '#f87171',
    maxCap: 120,
    bonusText: 'Standard RTP 97%',
  },
  {
    id: 'turbo',
    name: '2. Turbo Jet X',
    subtitle: 'Supersonic rapid climb · Fast rounds',
    speedRate: 0.145,
    trailColor: '#f97316',
    craftColor: '#fb923c',
    maxCap: 200,
    bonusText: '1.7x Faster Climb',
  },
  {
    id: 'spacex',
    name: '3. SpaceX Rocket',
    subtitle: 'Deep-orbit launch · Moonshot multipliers',
    speedRate: 0.11,
    trailColor: '#38bdf8',
    craftColor: '#7dd3fc',
    maxCap: 500,
    bonusText: 'Up to 500x Orbit',
  },
  {
    id: 'chopper',
    name: '4. Sky Chopper Shield',
    subtitle: 'Auto-locks 50% safety return if crashed past 2.0x',
    speedRate: 0.095,
    trailColor: '#10b981',
    craftColor: '#34d399',
    maxCap: 150,
    bonusText: '2x Shield Protection',
  },
  {
    id: 'eagle',
    name: '5. Golden Eagle VIP',
    subtitle: '+10% Streak Multiplier Boost per consecutive cashout',
    speedRate: 0.105,
    trailColor: '#f59e0b',
    craftColor: '#fbbf24',
    maxCap: 300,
    bonusText: '+10% Win Streak Boost',
  },
];

interface BetSlotState {
  amount: number;
  autoCashout: number;
  autoEnabled: boolean;
  active: boolean;
  cashedOutAt: number | null;
  payout: number;
}

export function AviatorGame() {
  const { user, canAfford, settleGameRound, setAuthModalOpen } = useWallet();
  const [variantId, setVariantId] = useState<AviatorVariantId>('classic');
  const [phase, setPhase] = useState<'idle' | 'flying' | 'crashed'>('idle');
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(1.0);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<number[]>([2.41, 1.18, 5.84, 1.72, 12.6, 1.45, 3.12, 1.09]);
  const [statusMsg, setStatusMsg] = useState('Place Bet 1 or Bet 2 and press Take Off.');

  const [slot1, setSlot1] = useState<BetSlotState>({
    amount: 5,
    autoCashout: 2.0,
    autoEnabled: false,
    active: false,
    cashedOutAt: null,
    payout: 0,
  });
  const [slot2, setSlot2] = useState<BetSlotState>({
    amount: 5,
    autoCashout: 3.5,
    autoEnabled: false,
    active: false,
    cashedOutAt: null,
    payout: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flightRef = useRef({
    startTime: 0,
    crashAt: 2.5,
    running: false,
    currentMult: 1.0,
    slot1Active: false,
    slot2Active: false,
    slot1Auto: 0,
    slot2Auto: 0,
    slot1Amount: 100,
    slot2Amount: 200,
  });

  const variant = VARIANTS.find((v) => v.id === variantId)!;

  const generateCrashPoint = (maxCap: number) => {
    const r = Math.random();
    if (r < 0.08) return 1.0 + Math.random() * 0.12; // instant early crash
    const raw = 0.97 / (1 - r);
    return Math.min(maxCap, Math.max(1.05, Math.round(raw * 100) / 100));
  };

  const cashoutSlot = async (slotNum: 1 | 2, atMult?: number) => {
    const mult = atMult ?? flightRef.current.currentMult;
    const isOne = slotNum === 1;
    const isActive = isOne ? flightRef.current.slot1Active : flightRef.current.slot2Active;
    if (!isActive || !flightRef.current.running) return;

    if (isOne) flightRef.current.slot1Active = false;
    else flightRef.current.slot2Active = false;

    const betAmt = isOne ? flightRef.current.slot1Amount : flightRef.current.slot2Amount;
    const streakBoost = variantId === 'eagle' ? 1 + Math.min(streak, 5) * 0.1 : 1;
    const effectiveMult = Math.round(mult * streakBoost * 100) / 100;
    const payout = Math.round(betAmt * effectiveMult);

    soundFx.cashout();
    setStreak((s) => s + 1);

    if (isOne) {
      setSlot1((prev) => ({ ...prev, active: false, cashedOutAt: effectiveMult, payout }));
    } else {
      setSlot2((prev) => ({ ...prev, active: false, cashedOutAt: effectiveMult, payout }));
    }

    setStatusMsg(`Slot ${slotNum} cashed out at ${effectiveMult.toFixed(2)}x (+${payout.toLocaleString('en-IN')})`);

    await settleGameRound({
      gameId: 'aviator',
      variant: variant.name,
      betAmount: betAmt,
      payout,
      outcome: 'win',
      summary: `Cashed out at ${effectiveMult.toFixed(2)}x`,
    });
  };

  // Flight loop + Canvas renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;

    const renderFrame = (now: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Background sky / space gradient
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      if (variantId === 'spacex') {
        bg.addColorStop(0, '#040914');
        bg.addColorStop(1, '#0f172a');
      } else {
        bg.addColorStop(0, '#091018');
        bg.addColorStop(1, '#131d2a');
      }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Subtle grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let gx = 60; gx < w; gx += 60) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 40; gy < h; gy += 40) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      const f = flightRef.current;

      if (f.running) {
        const elapsedSec = (now - f.startTime) / 1000;
        const m = Math.round(Math.exp(variant.speedRate * elapsedSec) * 100) / 100;
        f.currentMult = m;
        setMultiplier(m);

        // Auto-cashouts
        if (f.slot1Active && f.slot1Auto > 1 && m >= f.slot1Auto) {
          cashoutSlot(1, f.slot1Auto);
        }
        if (f.slot2Active && f.slot2Auto > 1 && m >= f.slot2Auto) {
          cashoutSlot(2, f.slot2Auto);
        }

        // Check crash
        if (m >= f.crashAt) {
          f.running = false;
          setPhase('crashed');
          setCrashPoint(f.crashAt);
          setMultiplier(f.crashAt);
          soundFx.loss();
          setHistory((prev) => [f.crashAt, ...prev.slice(0, 11)]);

          // Settle any un-cashed bets
          const handleUnresolvedCrash = async () => {
            let lostAny = false;
            for (const [idx, activeFlag, betAmt] of [
              [1, f.slot1Active, f.slot1Amount],
              [2, f.slot2Active, f.slot2Amount],
            ] as const) {
              if (activeFlag) {
                lostAny = true;
                if (idx === 1) f.slot1Active = false;
                else f.slot2Active = false;

                // Sky Chopper Shield saves 50% if crashed past 2.0x
                const shieldRefund = variantId === 'chopper' && f.crashAt >= 2.0 ? Math.round(betAmt * 0.5) : 0;
                await settleGameRound({
                  gameId: 'aviator',
                  variant: variant.name,
                  betAmount: betAmt,
                  payout: shieldRefund,
                  outcome: shieldRefund > 0 ? 'draw' : 'loss',
                  summary:
                    shieldRefund > 0
                      ? `Shield saved 50% (${shieldRefund}) on ${f.crashAt.toFixed(2)}x crash`
                      : `Flew away at ${f.crashAt.toFixed(2)}x`,
                });
              }
            }
            if (lostAny) setStreak(0);
            setSlot1((p) => ({ ...p, active: false }));
            setSlot2((p) => ({ ...p, active: false }));
            setStatusMsg(`Flew away at ${f.crashAt.toFixed(2)}x!`);
          };
          handleUnresolvedCrash();
        }
      }

      // Draw trajectory curve
      const progress = f.running
        ? Math.min(1, (f.currentMult - 1) / 4.5 + 0.12)
        : phase === 'crashed'
          ? 0.85
          : 0.06;
      const endX = 40 + progress * (w - 110);
      const endY = h - 32 - Math.pow(progress, 0.85) * (h - 85);

      ctx.strokeStyle = phase === 'crashed' ? '#ef4444' : variant.trailColor;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(30, h - 28);
      ctx.quadraticCurveTo(endX * 0.55, h - 28, endX, endY);
      ctx.stroke();

      // Fill area under curve
      const fillGrad = ctx.createLinearGradient(0, endY, 0, h);
      fillGrad.addColorStop(0, phase === 'crashed' ? 'rgba(239,68,68,0.22)' : `${variant.trailColor}38`);
      fillGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      ctx.moveTo(30, h - 28);
      ctx.quadraticCurveTo(endX * 0.55, h - 28, endX, endY);
      ctx.lineTo(endX, h - 28);
      ctx.closePath();
      ctx.fill();

      // Draw craft icon
      if (phase !== 'crashed') {
        ctx.save();
        ctx.translate(endX, endY);
        ctx.rotate(-0.32);
        ctx.fillStyle = variant.craftColor;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(-14, -10);
        ctx.lineTo(-8, 0);
        ctx.lineTo(-14, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [variantId, phase, variant]);

  const startFlight = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (flightRef.current.running) return;

    const totalNeed = slot1.amount;
    if (!canAfford(totalNeed)) {
      setStatusMsg('Insufficient wallet balance for this bet.');
      return;
    }

    soundFx.chip();
    const crashAt = generateCrashPoint(variant.maxCap);

    flightRef.current = {
      startTime: performance.now(),
      crashAt,
      running: true,
      currentMult: 1.0,
      slot1Active: true,
      slot2Active: canAfford(slot1.amount + slot2.amount),
      slot1Auto: slot1.autoEnabled ? slot1.autoCashout : 0,
      slot2Auto: slot2.autoEnabled ? slot2.autoCashout : 0,
      slot1Amount: slot1.amount,
      slot2Amount: slot2.amount,
    };

    setSlot1((p) => ({ ...p, active: true, cashedOutAt: null, payout: 0 }));
    setSlot2((p) => ({
      ...p,
      active: flightRef.current.slot2Active,
      cashedOutAt: null,
      payout: 0,
    }));
    setPhase('flying');
    setMultiplier(1.0);
    setStatusMsg(`${variant.name} launched! Click Cash Out before it flies away.`);
  };

  return (
    <div className="space-y-5">
      {/* 5 Variant Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {VARIANTS.map((v) => (
          <button
            key={v.id}
            type="button"
            disabled={phase === 'flying'}
            onClick={() => setVariantId(v.id)}
            className={`text-left p-3 rounded-xl border transition-colors ${
              variantId === v.id
                ? 'bg-amber-500/15 border-amber-500 text-white'
                : 'bg-[#0B1117] border-white/10 text-slate-300 hover:border-white/25'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-display font-bold truncate">{v.name}</span>
              {v.id === 'spacex' ? (
                <Rocket className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              ) : v.id === 'chopper' ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Plane className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">{v.bonusText}</p>
          </button>
        ))}
      </div>

      {/* Multiplier History Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-slate-400 shrink-0">Recent Flights:</span>
        {history.map((h, i) => (
          <span
            key={i}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono-num font-bold shrink-0 ${
              h >= 5
                ? 'bg-amber-500/20 text-amber-300'
                : h >= 2
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-slate-800 text-slate-300'
            }`}
          >
            {h.toFixed(2)}x
          </span>
        ))}
      </div>

      {/* Flight Viewport */}
      <div className="relative rounded-2xl bg-[#0B1117] border border-white/10 overflow-hidden">
        <canvas ref={canvasRef} width={760} height={270} className="w-full h-60 sm:h-72 block" />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs font-medium text-slate-400 mb-1">
            {variant.name} {variantId === 'eagle' && streak > 0 ? `· Streak +${Math.min(streak, 5) * 10}%` : ''}
          </p>
          <p
            className={`text-5xl sm:text-6xl font-mono-num font-bold tracking-tight ${
              phase === 'crashed'
                ? 'text-red-500'
                : phase === 'flying'
                  ? 'text-white'
                  : 'text-amber-400'
            }`}
          >
            {multiplier.toFixed(2)}x
          </p>
          {phase === 'crashed' && (
            <p className="mt-1 text-sm font-semibold text-red-400">Flew Away at {crashPoint.toFixed(2)}x</p>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-300">{statusMsg}</p>

      {/* Dual Bet Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { num: 1 as const, state: slot1, setter: setSlot1, label: 'Bet Panel 1 (Primary)' },
          { num: 2 as const, state: slot2, setter: setSlot2, label: 'Bet Panel 2 (Dual Bet)' },
        ].map(({ num, state, setter, label }) => (
          <div key={num} className="p-4 rounded-2xl bg-[#0B1117] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">{label}</span>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.autoEnabled}
                  disabled={phase === 'flying'}
                  onChange={(e) => setter((p) => ({ ...p, autoEnabled: e.target.checked }))}
                  className="accent-amber-500"
                />
                Auto Cashout
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Stake</label>
                <input
                  type="number"
                  min={5}
                  max={50000}
                  disabled={phase === 'flying'}
                  value={state.amount}
                  onChange={(e) => setter((p) => ({ ...p, amount: Math.max(5, Number(e.target.value)) }))}
                  className="w-full px-3 py-2 rounded-xl bg-[#131C26] border border-white/10 font-mono-num text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Auto Target (x)</label>
                <input
                  type="number"
                  step={0.1}
                  min={1.1}
                  max={100}
                  disabled={phase === 'flying'}
                  value={state.autoCashout}
                  onChange={(e) => setter((p) => ({ ...p, autoCashout: Math.max(1.1, Number(e.target.value)) }))}
                  className="w-full px-3 py-2 rounded-xl bg-[#131C26] border border-white/10 font-mono-num text-sm text-white"
                />
              </div>
            </div>

            {phase === 'flying' && state.active ? (
              <button
                type="button"
                onClick={() => cashoutSlot(num)}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm font-mono-num transition-colors"
              >
                Cash Out {Math.round(state.amount * multiplier).toLocaleString('en-IN')} ({multiplier.toFixed(2)}x)
              </button>
            ) : state.cashedOutAt ? (
              <div className="py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center text-xs font-mono-num font-semibold text-emerald-300">
                Won {state.payout.toLocaleString('en-IN')} at {state.cashedOutAt.toFixed(2)}x
              </div>
            ) : (
              <button
                type="button"
                disabled={phase === 'flying'}
                onClick={startFlight}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors disabled:opacity-50"
              >
                {num === 1 ? 'Launch Flight (Both Active Bets)' : 'Ready for Next Flight'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
