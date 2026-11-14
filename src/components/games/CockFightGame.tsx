import { useEffect, useRef, useState } from 'react';
import { Swords, Trophy } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { soundFx } from '../../utils/sound';

type CockMode = 'duel' | 'knockout';
type FighterPick = 'red' | 'blue' | 'draw';

const MODES: { id: CockMode; name: string; desc: string; redOdd: number; blueOdd: number; drawOdd: number }[] = [
  {
    id: 'duel',
    name: '1. Classic Arena Duel',
    desc: 'Red Crimson vs Blue Cobalt · 1.95x corner odds · 8x Draw',
    redOdd: 1.95,
    blueOdd: 1.95,
    drawOdd: 8.0,
  },
  {
    id: 'knockout',
    name: '2. Turbo Knockout Cup',
    desc: 'High-crit championship pit · 2.35x corner odds · 10x Draw',
    redOdd: 2.35,
    blueOdd: 2.35,
    drawOdd: 10.0,
  },
];

export function CockFightGame() {
  const { user, canAfford, settleGameRound, setAuthModalOpen } = useWallet();
  const [mode, setMode] = useState<CockMode>('duel');
  const [pick, setPick] = useState<FighterPick>('red');
  const [bet, setBet] = useState(5);
  const [fighting, setFighting] = useState(false);
  const [redHp, setRedHp] = useState(100);
  const [blueHp, setBlueHp] = useState(100);
  const [roundLog, setRoundLog] = useState<string[]>([
    'Choose Red Corner, Blue Corner, or Draw and start the match.',
  ]);
  const [banner, setBanner] = useState<string | null>(null);
  const [history, setHistory] = useState<FighterPick[]>(['red', 'blue', 'red', 'red', 'blue']);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<{
    redX: number;
    blueX: number;
    clashFlash: number;
    particles: { x: number; y: number; vx: number; vy: number; color: string; life: number }[];
  }>({ redX: 170, blueX: 430, clashFlash: 0, particles: [] });

  const currentMode = MODES.find((m) => m.id === mode)!;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Arena wood & sand pit
      const grad = ctx.createRadialGradient(w / 2, h / 2, 30, w / 2, h / 2, 300);
      grad.addColorStop(0, '#3a2614');
      grad.addColorStop(0.7, '#22150c');
      grad.addColorStop(1, '#100b07');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Arena ring
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.65, 220, 62, 0, 0, Math.PI * 2);
      ctx.stroke();

      const st = animRef.current;

      // Draw stylized rooster fighter helper
      const drawRooster = (x: number, y: number, facing: 1 | -1, primary: string, crest: string) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(facing, 1);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 42, 34, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tail feathers
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.moveTo(-18, -6);
        ctx.quadraticCurveTo(-52, -38, -46, 4);
        ctx.quadraticCurveTo(-50, 14, -22, 16);
        ctx.closePath();
        ctx.fill();

        // Body
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.ellipse(0, 6, 28, 22, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Wing accent
        ctx.fillStyle = crest;
        ctx.beginPath();
        ctx.ellipse(-4, 8, 16, 10, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Head & Neck
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.arc(20, -18, 13, 0, Math.PI * 2);
        ctx.fill();

        // Crest
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(17, -31, 6, 0, Math.PI * 2);
        ctx.arc(24, -29, 5, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(31, -20);
        ctx.lineTo(44, -15);
        ctx.lineTo(31, -11);
        ctx.closePath();
        ctx.fill();

        // Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(24, -20, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(25, -20, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-4, 24);
        ctx.lineTo(-8, 40);
        ctx.moveTo(8, 24);
        ctx.lineTo(14, 40);
        ctx.stroke();

        ctx.restore();
      };

      drawRooster(st.redX, h * 0.54, 1, '#dc2626', '#991b1b');
      drawRooster(st.blueX, h * 0.54, -1, '#2563eb', '#1e40af');

      // Clash flash
      if (st.clashFlash > 0) {
        ctx.fillStyle = `rgba(251, 191, 36, ${st.clashFlash * 0.6})`;
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.48, 38 * st.clashFlash, 0, Math.PI * 2);
        ctx.fill();
        st.clashFlash = Math.max(0, st.clashFlash - 0.08);
      }

      // Feather particles
      st.particles = st.particles.filter((p) => p.life > 0);
      for (const p of st.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.14;
        p.life -= 0.025;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 5, 2.5, p.vx, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const spawnFeathers = (color: string) => {
    for (let i = 0; i < 14; i++) {
      animRef.current.particles.push({
        x: 300 + (Math.random() - 0.5) * 30,
        y: 120 + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 7,
        vy: -Math.random() * 5 - 1,
        color,
        life: 1,
      });
    }
  };

  const startFight = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!canAfford(bet)) {
      setBanner('Insufficient balance. Please deposit credits to continue.');
      return;
    }
    if (fighting) return;

    soundFx.chip();
    setFighting(true);
    setBanner(null);
    setRedHp(100);
    setBlueHp(100);
    setRoundLog([`Match started in ${currentMode.name} · Bet ${bet} on ${pick.toUpperCase()}`]);

    let rHp = 100;
    let bHp = 100;
    const maxRounds = mode === 'knockout' ? 5 : 6;

    for (let round = 1; round <= maxRounds && rHp > 0 && bHp > 0; round++) {
      // Lunge forward
      animRef.current.redX = 245;
      animRef.current.blueX = 355;
      animRef.current.clashFlash = 1;
      soundFx.hit();

      const crit = mode === 'knockout' && Math.random() < 0.35 ? 1.5 : 1;
      const dmgToBlue = Math.round((12 + Math.random() * 20) * crit);
      const dmgToRed = Math.round((12 + Math.random() * 20) * crit);

      bHp = Math.max(0, bHp - dmgToBlue);
      rHp = Math.max(0, rHp - dmgToRed);

      spawnFeathers(dmgToBlue >= dmgToRed ? '#3b82f6' : '#ef4444');
      setRedHp(rHp);
      setBlueHp(bHp);
      setRoundLog((prev) => [
        `Round ${round}: Red hit for ${dmgToBlue} · Blue hit for ${dmgToRed}`,
        ...prev.slice(0, 5),
      ]);

      await new Promise((r) => setTimeout(r, 320));
      animRef.current.redX = 170;
      animRef.current.blueX = 430;
      await new Promise((r) => setTimeout(r, 260));
    }

    let winner: FighterPick = 'draw';
    if (rHp > bHp) winner = 'red';
    else if (bHp > rHp) winner = 'blue';
    else {
      // Tie-breaker except rare draw
      winner = Math.random() < 0.14 ? 'draw' : Math.random() < 0.5 ? 'red' : 'blue';
    }

    const odd =
      winner === 'red' ? currentMode.redOdd : winner === 'blue' ? currentMode.blueOdd : currentMode.drawOdd;
    const won = pick === winner;
    const payout = won ? Math.round(bet * odd) : 0;

    await settleGameRound({
      gameId: 'cockfight',
      variant: currentMode.name,
      betAmount: bet,
      payout,
      outcome: won ? 'win' : 'loss',
      summary: `${winner.toUpperCase()} won (${rHp} HP vs ${bHp} HP)`,
    });

    if (won) {
      soundFx.win();
      setBanner(`Winner: ${winner.toUpperCase()} Corner! You won ${payout.toLocaleString('en-IN')} credits.`);
    } else {
      soundFx.loss();
      setBanner(`Winner: ${winner.toUpperCase()} Corner. Better luck next round.`);
    }

    setHistory((prev) => [winner, ...prev.slice(0, 11)]);
    setFighting(false);
  };

  return (
    <div className="space-y-5">
      {/* Mode selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={fighting}
            onClick={() => setMode(m.id)}
            className={`text-left p-4 rounded-xl border transition-colors ${
              mode === m.id
                ? 'bg-amber-500/10 border-amber-500 text-white'
                : 'bg-[#0B1117] border-white/10 text-slate-300 hover:border-white/25'
            }`}
          >
            <p className="font-display font-bold text-sm">{m.name}</p>
            <p className="text-xs text-slate-400 mt-1">{m.desc}</p>
          </button>
        ))}
      </div>

      {/* Arena HUD & Canvas */}
      <div className="rounded-2xl bg-[#0B1117] border border-white/10 p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4 items-center">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-red-400">RED CRIMSON</span>
              <span className="font-mono-num text-white">{redHp}/100 HP</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${redHp}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-blue-400">BLUE COBALT</span>
              <span className="font-mono-num text-white">{blueHp}/100 HP</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${blueHp}%` }} />
            </div>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={600}
          height={240}
          className="w-full h-56 sm:h-64 rounded-xl border border-white/10 object-cover"
        />

        {banner && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-medium text-amber-200 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{banner}</span>
          </div>
        )}
      </div>

      {/* Betting Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-3 gap-3">
          {[
            { id: 'red' as const, label: 'Red Corner', odd: currentMode.redOdd, cls: 'border-red-500/60 bg-red-500/10 text-red-300' },
            { id: 'draw' as const, label: 'Draw', odd: currentMode.drawOdd, cls: 'border-amber-500/60 bg-amber-500/10 text-amber-300' },
            { id: 'blue' as const, label: 'Blue Corner', odd: currentMode.blueOdd, cls: 'border-blue-500/60 bg-blue-500/10 text-blue-300' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={fighting}
              onClick={() => {
                soundFx.chip();
                setPick(opt.id);
              }}
              className={`p-4 rounded-xl border text-center transition-all ${
                pick === opt.id ? `${opt.cls} ring-2 ring-white/40` : 'bg-[#0B1117] border-white/10 text-slate-300 hover:border-white/25'
              }`}
            >
              <p className="text-sm font-display font-bold">{opt.label}</p>
              <p className="text-xs font-mono-num mt-1 opacity-90">{opt.odd}x</p>
            </button>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-[#0B1117] border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Stake Amount</span>
            <div className="flex gap-1.5">
              {[5, 10, 50].map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={fighting}
                  onClick={() => setBet(v)}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white font-mono-num"
                >
                  ₹{v}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min={5}
              max={50000}
              disabled={fighting}
              value={bet}
              onChange={(e) => setBet(Math.max(5, Number(e.target.value)))}
              className="w-28 px-3 py-2.5 rounded-xl bg-[#131C26] border border-white/10 font-mono-num text-sm text-white focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              disabled={fighting}
              onClick={startFight}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Swords className="w-4 h-4" />
              {fighting ? 'Fighting...' : 'Start Match'}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Results & Commentary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[#0B1117] border border-white/10">
          <p className="text-xs font-semibold text-slate-400 mb-2">Recent Arena Winners</p>
          <div className="flex flex-wrap gap-2">
            {history.map((h, i) => (
              <span
                key={i}
                className={`px-2.5 py-1 rounded text-xs font-mono-num font-bold uppercase ${
                  h === 'red'
                    ? 'bg-red-500/20 text-red-300'
                    : h === 'blue'
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {h}
              </span>
            ))}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#0B1117] border border-white/10">
          <p className="text-xs font-semibold text-slate-400 mb-2">Match Commentary</p>
          <div className="space-y-1 text-xs text-slate-300 font-mono-num">
            {roundLog.map((line, i) => (
              <p key={i} className="truncate">{line}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
