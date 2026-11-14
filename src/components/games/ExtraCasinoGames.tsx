import { useState } from 'react';
import { Bomb, Diamond, Dices, Flame, RotateCw } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import type { PlayingCard } from '../../types';
import { createShuffledDeck } from '../../utils/deck';
import { soundFx } from '../../utils/sound';
import { PlayingCardView } from '../PlayingCardView';

// 6. DRAGON TIGER
export function DragonTigerGame() {
  const { user, canAfford, settleGameRound, setAuthModalOpen } = useWallet();
  const [bet, setBet] = useState(5);
  const [pick, setPick] = useState<'dragon' | 'tiger' | 'tie'>('dragon');
  const [dragonCard, setDragonCard] = useState<PlayingCard | null>(null);
  const [tigerCard, setTigerCard] = useState<PlayingCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('Pick Dragon (2x), Tiger (2x), or Tie (8x) and draw cards.');

  const play = async () => {
    if (!user) return setAuthModalOpen(true);
    if (!canAfford(bet)) return setMsg('Insufficient wallet balance.');
    if (busy) return;
    setBusy(true);
    soundFx.deal();
    const deck = createShuffledDeck();
    const d = deck[0];
    const t = deck[1];
    setDragonCard(d);
    setTigerCard(t);

    const winner = d.value > t.value ? 'dragon' : t.value > d.value ? 'tiger' : 'tie';
    const won = pick === winner;
    const mult = winner === 'tie' ? 8 : 2;
    const payout = won ? bet * mult : 0;

    await settleGameRound({
      gameId: 'dragontiger',
      variant: 'Dragon Tiger Classic',
      betAmount: bet,
      payout,
      outcome: won ? 'win' : 'loss',
      summary: `Dragon ${d.rank} vs Tiger ${t.rank} — ${winner.toUpperCase()}`,
    });

    if (won) {
      soundFx.win();
      setMsg(`${winner.toUpperCase()} won! Payout: ${payout.toLocaleString('en-IN')} credits.`);
    } else {
      soundFx.loss();
      setMsg(`${winner.toUpperCase()} won (${d.rank} vs ${t.rank}).`);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-5">
      <div className="felt-surface rounded-2xl border-4 border-[#3a2614] p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-display font-bold text-red-300">DRAGON</span>
          <PlayingCardView card={dragonCard ?? undefined} hidden={!dragonCard} size="lg" />
        </div>
        <div className="space-y-2">
          <Flame className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-xs text-amber-100">{msg}</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-display font-bold text-amber-300">TIGER</span>
          <PlayingCardView card={tigerCard ?? undefined} hidden={!tigerCard} size="lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          { id: 'dragon' as const, label: 'Dragon (2.0x)' },
          { id: 'tie' as const, label: 'Tie (8.0x)' },
          { id: 'tiger' as const, label: 'Tiger (2.0x)' },
        ].map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              soundFx.chip();
              setPick(o.id);
            }}
            className={`p-3.5 rounded-xl border text-sm font-display font-bold ${
              pick === o.id
                ? 'bg-amber-500/20 border-amber-500 text-white'
                : 'bg-[#0B1117] border-white/10 text-slate-300'
            }`}
          >
            {o.label}
          </button>
        ))}
        <div className="flex gap-2">
          <input
            type="number"
            min={5}
            value={bet}
            onChange={(e) => setBet(Math.max(5, Number(e.target.value)))}
            className="w-24 px-3 py-2.5 rounded-xl bg-[#0B1117] border border-white/10 font-mono-num text-sm text-white"
          />
          <button
            type="button"
            disabled={busy}
            onClick={play}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm"
          >
            Draw
          </button>
        </div>
      </div>
    </div>
  );
}

// 7. 7 UP & DOWN
export function SevenUpDownGame() {
  const { user, canAfford, settleGameRound, setAuthModalOpen } = useWallet();
  const [bet, setBet] = useState(5);
  const [pick, setPick] = useState<'down' | 'seven' | 'up'>('up');
  const [dice, setDice] = useState<[number, number]>([3, 4]);
  const [rolling, setRolling] = useState(false);
  const [msg, setMsg] = useState('Predict 2-6 (Down 2x), Lucky 7 (5x), or 8-12 (Up 2x).');

  const roll = async () => {
    if (!user) return setAuthModalOpen(true);
    if (!canAfford(bet)) return setMsg('Insufficient wallet balance.');
    if (rolling) return;
    setRolling(true);
    soundFx.dice();

    await new Promise((r) => setTimeout(r, 420));
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const sum = d1 + d2;
    setDice([d1, d2]);

    const res: 'down' | 'seven' | 'up' = sum < 7 ? 'down' : sum === 7 ? 'seven' : 'up';
    const won = pick === res;
    const mult = res === 'seven' ? 5 : 2;
    const payout = won ? bet * mult : 0;

    await settleGameRound({
      gameId: 'sevenup',
      variant: '7 Up & Down Dice',
      betAmount: bet,
      payout,
      outcome: won ? 'win' : 'loss',
      summary: `Rolled ${d1}+${d2}=${sum} (${res.toUpperCase()})`,
    });

    if (won) {
      soundFx.win();
      setMsg(`Total ${sum}! You won ${payout.toLocaleString('en-IN')} credits.`);
    } else {
      soundFx.loss();
      setMsg(`Total ${sum} (${res.toUpperCase()}). Roll again!`);
    }
    setRolling(false);
  };

  return (
    <div className="space-y-5">
      <div className="p-6 rounded-2xl bg-[#0B1117] border border-white/10 flex flex-col items-center gap-4">
        <div className="flex gap-4">
          {dice.map((d, i) => (
            <div
              key={i}
              className={`w-16 h-16 rounded-2xl bg-white text-slate-950 font-mono-num text-3xl font-bold flex items-center justify-center shadow-lg ${
                rolling ? 'animate-dice-tumble' : ''
              }`}
            >
              {d}
            </div>
          ))}
        </div>
        <p className="text-lg font-mono-num font-bold text-amber-400">Sum: {dice[0] + dice[1]}</p>
        <p className="text-xs text-slate-300">{msg}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          { id: 'down' as const, label: '2–6 Down (2x)' },
          { id: 'seven' as const, label: 'Lucky 7 (5x)' },
          { id: 'up' as const, label: '8–12 Up (2x)' },
        ].map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              soundFx.chip();
              setPick(o.id);
            }}
            className={`p-3.5 rounded-xl border text-sm font-display font-bold ${
              pick === o.id
                ? 'bg-amber-500/20 border-amber-500 text-white'
                : 'bg-[#0B1117] border-white/10 text-slate-300'
            }`}
          >
            {o.label}
          </button>
        ))}
        <div className="flex gap-2">
          <input
            type="number"
            min={5}
            value={bet}
            onChange={(e) => setBet(Math.max(5, Number(e.target.value)))}
            className="w-24 px-3 py-2.5 rounded-xl bg-[#0B1117] border border-white/10 font-mono-num text-sm text-white"
          />
          <button
            type="button"
            disabled={rolling}
            onClick={roll}
            className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-1.5"
          >
            <Dices className="w-4 h-4" />
            Roll
          </button>
        </div>
      </div>
    </div>
  );
}

// 8. MINES TREASURE
export function MinesGame() {
  const { user, canAfford, settleGameRound, setAuthModalOpen } = useWallet();
  const [bet, setBet] = useState(5);
  const [minesCount, setMinesCount] = useState(3);
  const [active, setActive] = useState(false);
  const [mineSet, setMineSet] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [bustedIdx, setBustedIdx] = useState<number | null>(null);
  const [msg, setMsg] = useState('Choose mines count (1–12), start round, and reveal gems.');

  const currentMult = () => {
    const safeOpened = revealed.size;
    if (safeOpened === 0) return 1.0;
    let m = 1.0;
    for (let i = 0; i < safeOpened; i++) {
      m *= (25 - i) / (25 - minesCount - i);
    }
    return Math.round(m * 0.96 * 100) / 100;
  };

  const startRound = () => {
    if (!user) return setAuthModalOpen(true);
    if (!canAfford(bet)) return setMsg('Insufficient wallet balance.');
    soundFx.chip();
    const mSet = new Set<number>();
    while (mSet.size < minesCount) {
      mSet.add(Math.floor(Math.random() * 25));
    }
    setMineSet(mSet);
    setRevealed(new Set());
    setBustedIdx(null);
    setActive(true);
    setMsg('Tap tiles to uncover diamonds. Cash out anytime!');
  };

  const clickTile = async (idx: number) => {
    if (!active || revealed.has(idx)) return;
    if (mineSet.has(idx)) {
      setBustedIdx(idx);
      setActive(false);
      soundFx.hit();
      setMsg(`Hit a mine! Lost ${bet.toLocaleString('en-IN')} credits.`);
      await settleGameRound({
        gameId: 'mines',
        variant: `Mines (${minesCount} Bombs)`,
        betAmount: bet,
        payout: 0,
        outcome: 'loss',
        summary: `Hit mine after ${revealed.size} safe gems`,
      });
      return;
    }
    soundFx.deal();
    const next = new Set(revealed);
    next.add(idx);
    setRevealed(next);
  };

  const cashout = async () => {
    if (!active || revealed.size === 0) return;
    const mult = currentMult();
    const payout = Math.round(bet * mult);
    setActive(false);
    soundFx.cashout();
    setMsg(`Cashed out ${payout.toLocaleString('en-IN')} credits at ${mult.toFixed(2)}x!`);
    await settleGameRound({
      gameId: 'mines',
      variant: `Mines (${minesCount} Bombs)`,
      betAmount: bet,
      payout,
      outcome: 'win',
      summary: `Cleared ${revealed.size} gems (${mult.toFixed(2)}x)`,
    });
  };

  const mult = currentMult();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-7 grid grid-cols-5 gap-2 p-4 rounded-2xl bg-[#0B1117] border border-white/10">
        {Array.from({ length: 25 }).map((_, idx) => {
          const isRev = revealed.has(idx);
          const isBomb = bustedIdx !== null && mineSet.has(idx);
          return (
            <button
              key={idx}
              type="button"
              disabled={!active || isRev}
              onClick={() => clickTile(idx)}
              className={`aspect-square rounded-xl border flex items-center justify-center transition-all ${
                isBomb
                  ? 'bg-red-500/25 border-red-500 text-red-300'
                  : isRev
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-[#131C26] border-white/10 hover:border-amber-400/50'
              }`}
            >
              {isBomb ? (
                <Bomb className="w-5 h-5" />
              ) : isRev ? (
                <Diamond className="w-5 h-5" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="lg:col-span-5 p-5 rounded-2xl bg-[#0B1117] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Live Multiplier</span>
          <span className="text-2xl font-mono-num font-bold text-amber-400">{mult.toFixed(2)}x</span>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Mines Count: {minesCount}</label>
          <input
            type="range"
            min={1}
            max={12}
            disabled={active}
            value={minesCount}
            onChange={(e) => setMinesCount(Number(e.target.value))}
            className="w-full accent-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Stake</label>
          <input
            type="number"
            min={5}
            disabled={active}
            value={bet}
            onChange={(e) => setBet(Math.max(5, Number(e.target.value)))}
            className="w-full px-3 py-2.5 rounded-xl bg-[#131C26] border border-white/10 font-mono-num text-sm text-white"
          />
        </div>
        <p className="text-xs text-slate-300">{msg}</p>
        {active ? (
          <button
            type="button"
            disabled={revealed.size === 0}
            onClick={cashout}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm font-mono-num disabled:opacity-50"
          >
            Cash Out {Math.round(bet * mult).toLocaleString('en-IN')}
          </button>
        ) : (
          <button
            type="button"
            onClick={startRound}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm"
          >
            Start Mines Round
          </button>
        )}
      </div>
    </div>
  );
}

// 9. COLOR WINGO
export function ColorWingoGame() {
  const { user, canAfford, settleGameRound, setAuthModalOpen } = useWallet();
  const [bet, setBet] = useState(5);
  const [pickType, setPickType] = useState<'green' | 'violet' | 'red'>('green');
  const [pickDigit, setPickDigit] = useState<number | null>(null);
  const [lastNum, setLastNum] = useState<number>(5);
  const [history, setHistory] = useState<number[]>([5, 2, 0, 7, 4, 9, 1]);
  const [msg, setMsg] = useState('Predict Color (Green/Red 2x, Violet 4.5x) or Exact Digit (9x).');

  const getColorForDigit = (n: number): 'green' | 'red' | 'violet' => {
    if (n === 0 || n === 5) return 'violet';
    return n % 2 === 1 ? 'green' : 'red';
  };

  const draw = async () => {
    if (!user) return setAuthModalOpen(true);
    if (!canAfford(bet)) return setMsg('Insufficient wallet balance.');
    soundFx.dice();

    const num = Math.floor(Math.random() * 10);
    setLastNum(num);
    setHistory((prev) => [num, ...prev.slice(0, 11)]);

    const color = getColorForDigit(num);
    let payout = 0;
    let won = false;

    if (pickDigit !== null) {
      if (pickDigit === num) {
        won = true;
        payout = bet * 9;
      }
    } else if (pickType === color || (color === 'violet' && (pickType === 'green' || pickType === 'red'))) {
      won = true;
      const mult = pickType === 'violet' ? 4.5 : color === 'violet' ? 1.5 : 2;
      payout = Math.round(bet * mult);
    }

    await settleGameRound({
      gameId: 'wingo',
      variant: 'Color Wingo 30s',
      betAmount: bet,
      payout,
      outcome: won ? 'win' : 'loss',
      summary: `Result #${num} (${color.toUpperCase()})`,
    });

    if (won) {
      soundFx.win();
      setMsg(`Result ${num} (${color.toUpperCase()})! Won ${payout.toLocaleString('en-IN')} credits.`);
    } else {
      soundFx.loss();
      setMsg(`Result ${num} (${color.toUpperCase()}). Try next period!`);
    }
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl bg-[#0B1117] border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400">Latest Period Result</p>
          <p className="text-3xl font-mono-num font-bold text-white mt-1">
            #{lastNum} · <span className="capitalize text-amber-400">{getColorForDigit(lastNum)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {history.map((n, i) => {
            const c = getColorForDigit(n);
            return (
              <span
                key={i}
                className={`w-8 h-8 rounded-lg font-mono-num text-xs font-bold flex items-center justify-center ${
                  c === 'green'
                    ? 'bg-emerald-500 text-slate-950'
                    : c === 'red'
                      ? 'bg-red-500 text-white'
                      : 'bg-purple-500 text-white'
                }`}
              >
                {n}
              </span>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { id: 'green' as const, label: 'Green (2x)', cls: 'bg-emerald-600/25 border-emerald-500 text-emerald-300' },
          { id: 'violet' as const, label: 'Violet (4.5x)', cls: 'bg-purple-600/25 border-purple-500 text-purple-300' },
          { id: 'red' as const, label: 'Red (2x)', cls: 'bg-red-600/25 border-red-500 text-red-300' },
        ].map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              soundFx.chip();
              setPickType(c.id);
              setPickDigit(null);
            }}
            className={`p-3.5 rounded-xl border font-display font-bold text-sm ${
              pickDigit === null && pickType === c.id ? `${c.cls} ring-2 ring-white/40` : 'bg-[#0B1117] border-white/10 text-slate-300'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => {
              soundFx.chip();
              setPickDigit(pickDigit === d ? null : d);
            }}
            className={`py-2.5 rounded-xl border font-mono-num text-sm font-bold ${
              pickDigit === d
                ? 'bg-amber-500 border-amber-400 text-slate-950'
                : 'bg-[#0B1117] border-white/10 text-white hover:border-white/30'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#0B1117] border border-white/10">
        <p className="text-xs text-slate-300">{msg}</p>
        <div className="flex gap-2">
          <input
            type="number"
            min={5}
            value={bet}
            onChange={(e) => setBet(Math.max(5, Number(e.target.value)))}
            className="w-24 px-3 py-2 rounded-xl bg-[#131C26] border border-white/10 font-mono-num text-sm text-white"
          />
          <button
            type="button"
            onClick={draw}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm"
          >
            Spin Wingo
          </button>
        </div>
      </div>
    </div>
  );
}

// 10. LUCKY ROULETTE
const RED_NUMS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export function RouletteGame() {
  const { user, canAfford, settleGameRound, setAuthModalOpen } = useWallet();
  const [bet, setBet] = useState(5);
  const [betChoice, setBetChoice] = useState<'red' | 'black' | 'even' | 'odd' | 'zero'>('red');
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number>(17);
  const [msg, setMsg] = useState('Place a European Roulette bet (Red/Black/Even/Odd 2x, Zero 35x) and spin.');

  const spin = async () => {
    if (!user) return setAuthModalOpen(true);
    if (!canAfford(bet)) return setMsg('Insufficient wallet balance.');
    if (spinning) return;

    setSpinning(true);
    soundFx.dice();
    await new Promise((r) => setTimeout(r, 700));

    const num = Math.floor(Math.random() * 37);
    setResult(num);

    const isRed = RED_NUMS.has(num);
    const isBlack = num !== 0 && !isRed;
    let won = false;
    let mult = 2;

    if (betChoice === 'red' && isRed) won = true;
    else if (betChoice === 'black' && isBlack) won = true;
    else if (betChoice === 'even' && num !== 0 && num % 2 === 0) won = true;
    else if (betChoice === 'odd' && num % 2 === 1) won = true;
    else if (betChoice === 'zero' && num === 0) {
      won = true;
      mult = 35;
    }

    const payout = won ? bet * mult : 0;
    const colorLabel = num === 0 ? 'Green' : isRed ? 'Red' : 'Black';

    await settleGameRound({
      gameId: 'roulette',
      variant: 'European Roulette',
      betAmount: bet,
      payout,
      outcome: won ? 'win' : 'loss',
      summary: `Ball landed on ${num} (${colorLabel})`,
    });

    if (won) {
      soundFx.win();
      setMsg(`Ball landed on ${num} (${colorLabel})! Won ${payout.toLocaleString('en-IN')} credits.`);
    } else {
      soundFx.loss();
      setMsg(`Ball landed on ${num} (${colorLabel}). Spin again!`);
    }
    setSpinning(false);
  };

  const resColor = result === 0 ? 'bg-emerald-600' : RED_NUMS.has(result) ? 'bg-red-600' : 'bg-slate-800';

  return (
    <div className="space-y-5">
      <div className="felt-surface rounded-2xl border-4 border-[#3a2614] p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className={`w-20 h-20 rounded-full border-4 border-amber-400 flex items-center justify-center shadow-xl ${resColor} ${
              spinning ? 'animate-spin' : ''
            }`}
          >
            <span className="text-2xl font-mono-num font-bold text-white">{result}</span>
          </div>
          <div>
            <p className="text-sm font-display font-bold text-white">European Single-Zero Wheel</p>
            <p className="text-xs text-amber-100 mt-1">{msg}</p>
          </div>
        </div>
        <RotateCw className={`w-8 h-8 text-amber-300 ${spinning ? 'animate-spin' : ''}`} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {[
          { id: 'red' as const, label: 'Red (2x)' },
          { id: 'black' as const, label: 'Black (2x)' },
          { id: 'even' as const, label: 'Even (2x)' },
          { id: 'odd' as const, label: 'Odd (2x)' },
          { id: 'zero' as const, label: 'Zero 0 (35x)' },
        ].map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              soundFx.chip();
              setBetChoice(o.id);
            }}
            className={`p-3 rounded-xl border text-xs font-display font-bold ${
              betChoice === o.id
                ? 'bg-amber-500/20 border-amber-500 text-white'
                : 'bg-[#0B1117] border-white/10 text-slate-300'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="number"
          min={5}
          value={bet}
          onChange={(e) => setBet(Math.max(5, Number(e.target.value)))}
          className="w-32 px-3 py-2.5 rounded-xl bg-[#0B1117] border border-white/10 font-mono-num text-sm text-white"
        />
        <button
          type="button"
          disabled={spinning}
          onClick={spin}
          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm"
        >
          {spinning ? 'Spinning...' : 'Spin Wheel'}
        </button>
      </div>
    </div>
  );
}
