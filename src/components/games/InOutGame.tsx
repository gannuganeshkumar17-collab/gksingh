import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import type { PlayingCard } from '../../types';
import { createShuffledDeck } from '../../utils/deck';
import { soundFx } from '../../utils/sound';
import { PlayingCardView } from '../PlayingCardView';

export function InOutGame() {
  const { user, canAfford, settleGameRound, setAuthModalOpen } = useWallet();
  const [bet, setBet] = useState(5);
  const [side, setSide] = useState<'in' | 'out'>('in');
  const [dealing, setDealing] = useState(false);
  const [joker, setJoker] = useState<PlayingCard | null>(null);
  const [inCards, setInCards] = useState<PlayingCard[]>([]);
  const [outCards, setOutCards] = useState<PlayingCard[]>([]);
  const [winnerSide, setWinnerSide] = useState<'in' | 'out' | null>(null);
  const [message, setMessage] = useState('Bet on IN (Andar 1.90x) or OUT (Bahar 2.00x) and deal.');
  const [history, setHistory] = useState<('in' | 'out')[]>(['in', 'out', 'in', 'in', 'out']);

  const startDeal = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!canAfford(bet)) {
      setMessage('Insufficient wallet balance.');
      return;
    }
    if (dealing) return;

    soundFx.chip();
    setDealing(true);
    setWinnerSide(null);
    setInCards([]);
    setOutCards([]);

    const deck = createShuffledDeck();
    const centerCard = deck[0];
    setJoker(centerCard);
    setMessage(`Joker is ${centerCard.rank}${centerCard.suit}. Dealing IN and OUT...`);
    soundFx.deal();
    await new Promise((r) => setTimeout(r, 420));

    let matchedSide: 'in' | 'out' = 'in';
    const dealtIn: PlayingCard[] = [];
    const dealtOut: PlayingCard[] = [];

    for (let i = 1; i < deck.length; i++) {
      const c = deck[i];
      const currentSlot: 'in' | 'out' = i % 2 === 1 ? 'in' : 'out';
      if (currentSlot === 'in') {
        dealtIn.push(c);
        setInCards([...dealtIn]);
      } else {
        dealtOut.push(c);
        setOutCards([...dealtOut]);
      }
      soundFx.deal();

      if (c.rank === centerCard.rank) {
        matchedSide = currentSlot;
        break;
      }
      await new Promise((r) => setTimeout(r, 240));
    }

    setWinnerSide(matchedSide);
    const won = side === matchedSide;
    const mult = matchedSide === 'in' ? 1.9 : 2.0;
    const payout = won ? Math.round(bet * mult) : 0;

    await settleGameRound({
      gameId: 'inout',
      variant: 'Andar Bahar (In-Out)',
      betAmount: bet,
      payout,
      outcome: won ? 'win' : 'loss',
      summary: `${matchedSide.toUpperCase()} matched ${centerCard.rank} in ${dealtIn.length + dealtOut.length} cards`,
    });

    if (won) {
      soundFx.win();
      setMessage(
        `${matchedSide.toUpperCase()} matched ${centerCard.rank}! You won ${payout.toLocaleString('en-IN')} credits.`
      );
    } else {
      soundFx.loss();
      setMessage(`${matchedSide.toUpperCase()} matched ${centerCard.rank}. Try the next deal!`);
    }

    setHistory((prev) => [matchedSide, ...prev.slice(0, 11)]);
    setDealing(false);
  };

  return (
    <div className="space-y-5">
      <div className="felt-surface rounded-2xl border-4 border-[#3a2614] p-5 sm:p-6 space-y-6">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Center Joker</span>
          <PlayingCardView card={joker ?? undefined} hidden={!joker} size="lg" highlight={Boolean(joker)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={`p-4 rounded-xl bg-black/35 border ${
              winnerSide === 'in' ? 'border-emerald-400 ring-2 ring-emerald-400/40' : 'border-white/10'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-display font-bold text-sky-300">IN (ANDAR) · 1.90x</span>
              <span className="text-xs font-mono-num text-slate-300">{inCards.length} cards</span>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[68px]">
              {inCards.map((c, idx) => (
                <PlayingCardView
                  key={idx}
                  card={c}
                  size="sm"
                  highlight={joker ? c.rank === joker.rank : false}
                />
              ))}
            </div>
          </div>

          <div
            className={`p-4 rounded-xl bg-black/35 border ${
              winnerSide === 'out' ? 'border-emerald-400 ring-2 ring-emerald-400/40' : 'border-white/10'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-display font-bold text-amber-300">OUT (BAHAR) · 2.00x</span>
              <span className="text-xs font-mono-num text-slate-300">{outCards.length} cards</span>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[68px]">
              {outCards.map((c, idx) => (
                <PlayingCardView
                  key={idx}
                  card={c}
                  size="sm"
                  highlight={joker ? c.rank === joker.rank : false}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-center text-amber-100 bg-black/40 py-2.5 px-4 rounded-xl border border-white/10">
          {message}
        </p>
      </div>

      {/* Bet Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          disabled={dealing}
          onClick={() => {
            soundFx.chip();
            setSide('in');
          }}
          className={`p-4 rounded-xl border text-center transition-all ${
            side === 'in'
              ? 'bg-sky-500/20 border-sky-400 text-white ring-2 ring-sky-400/30'
              : 'bg-[#0B1117] border-white/10 text-slate-300'
          }`}
        >
          <p className="font-display font-bold text-base">Bet IN (Andar)</p>
          <p className="text-xs font-mono-num text-sky-300 mt-1">Payout 1.90x</p>
        </button>

        <button
          type="button"
          disabled={dealing}
          onClick={() => {
            soundFx.chip();
            setSide('out');
          }}
          className={`p-4 rounded-xl border text-center transition-all ${
            side === 'out'
              ? 'bg-amber-500/20 border-amber-400 text-white ring-2 ring-amber-400/30'
              : 'bg-[#0B1117] border-white/10 text-slate-300'
          }`}
        >
          <p className="font-display font-bold text-base">Bet OUT (Bahar)</p>
          <p className="text-xs font-mono-num text-amber-300 mt-1">Payout 2.00x</p>
        </button>

        <div className="p-4 rounded-xl bg-[#0B1117] border border-white/10 flex items-center gap-2">
          <input
            type="number"
            min={5}
            max={50000}
            disabled={dealing}
            value={bet}
            onChange={(e) => setBet(Math.max(5, Number(e.target.value)))}
            className="w-24 px-3 py-2.5 rounded-xl bg-[#131C26] border border-white/10 font-mono-num text-sm text-white"
          />
          <button
            type="button"
            disabled={dealing}
            onClick={startDeal}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {dealing ? 'Dealing...' : 'Deal Round'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400">Recent Results:</span>
        {history.map((h, i) => (
          <span
            key={i}
            className={`px-2.5 py-1 rounded text-xs font-mono-num font-bold uppercase ${
              h === 'in' ? 'bg-sky-500/20 text-sky-300' : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            {h}
          </span>
        ))}
      </div>
    </div>
  );
}
