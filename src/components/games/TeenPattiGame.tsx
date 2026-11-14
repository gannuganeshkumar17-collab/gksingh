import { useState } from 'react';
import { Eye, EyeOff, Trophy } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import type { PlayingCard } from '../../types';
import { compareTeenPattiHands, createShuffledDeck, evaluateTeenPattiHand } from '../../utils/deck';
import { soundFx } from '../../utils/sound';
import { PlayingCardView } from '../PlayingCardView';

type TPVariant = 'classic' | 'muflis' | 'ak47' | 'hukam' | 'royal999';

const TP_VARIANTS: { id: TPVariant; name: string; desc: string }[] = [
  { id: 'classic', name: '1. Classic Teen Patti', desc: 'Traditional 3-card Poker · Blind or Seen play' },
  { id: 'muflis', name: '2. Muflis (Lowball)', desc: 'Weakest hand wins the entire pot!' },
  { id: 'ak47', name: '3. AK47 Wild', desc: 'All A, K, 4, and 7 cards act as Wild Jokers' },
  { id: 'hukam', name: '4. Hukam Joker', desc: 'Center Joker card rank becomes Wild for everyone' },
  { id: 'royal999', name: '5. Royal 999', desc: '2x Boot Pot + Bonus payout for Trail & Pure Seq' },
];

export function TeenPattiGame() {
  const { user, canAfford, settleGameRound, setAuthModalOpen } = useWallet();
  const [variant, setVariant] = useState<TPVariant>('classic');
  const [boot, setBoot] = useState(2);
  const [phase, setPhase] = useState<'idle' | 'playing' | 'showdown'>('idle');
  const [pot, setPot] = useState(0);
  const [chaalUnit, setChaalUnit] = useState(2);
  const [isSeen, setIsSeen] = useState(false);
  const [totalUserBet, setTotalUserBet] = useState(0);

  const [playerHand, setPlayerHand] = useState<PlayingCard[]>([]);
  const [bot1Hand, setBot1Hand] = useState<PlayingCard[]>([]);
  const [bot2Hand, setBot2Hand] = useState<PlayingCard[]>([]);
  const [jokerCard, setJokerCard] = useState<PlayingCard | null>(null);
  const [bot1Folded, setBot1Folded] = useState(false);
  const [bot2Folded, setBot2Folded] = useState(false);
  const [status, setStatus] = useState('Choose a Teen Patti variant and deal cards.');

  const startDeal = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    const startBoot = variant === 'royal999' ? boot * 2 : boot;
    if (!canAfford(startBoot)) {
      setStatus('Insufficient wallet balance for boot.');
      return;
    }

    soundFx.deal();
    const deck = createShuffledDeck();
    const pHand = deck.slice(0, 3);
    const b1Hand = deck.slice(3, 6);
    const b2Hand = deck.slice(6, 9);
    const joker = variant === 'hukam' ? deck[9] : null;

    setPlayerHand(pHand);
    setBot1Hand(b1Hand);
    setBot2Hand(b2Hand);
    setJokerCard(joker);
    setBot1Folded(false);
    setBot2Folded(false);
    setIsSeen(false);
    setChaalUnit(startBoot);
    setTotalUserBet(startBoot);
    setPot(startBoot * 3);
    setPhase('playing');
    setStatus(
      joker
        ? `Hukam Joker is ${joker.rank}. Play Blind (${startBoot}) or See Cards!`
        : `Cards dealt! Play Blind (${startBoot}) or click See Cards.`
    );
  };

  const handleSeeCards = () => {
    if (phase !== 'playing' || isSeen) return;
    soundFx.deal();
    setIsSeen(true);
    setStatus(`Cards revealed! Seen Chaal is ${chaalUnit * 2}.`);
  };

  const resolveShowdown = async (forcedPack = false, currentPot = pot, userInvested = totalUserBet) => {
    setIsSeen(true);
    setPhase('showdown');

    if (forcedPack) {
      await settleGameRound({
        gameId: 'teenpatti',
        variant: TP_VARIANTS.find((v) => v.id === variant)!.name,
        betAmount: userInvested,
        payout: 0,
        outcome: 'loss',
        summary: 'Packed hand during Teen Patti round',
      });
      soundFx.loss();
      setStatus(`You packed. Lost ${userInvested.toLocaleString('en-IN')} credits.`);
      return;
    }

    const pEval = evaluateTeenPattiHand(playerHand, variant, jokerCard?.rank);
    const b1Eval = evaluateTeenPattiHand(bot1Hand, variant, jokerCard?.rank);
    const b2Eval = evaluateTeenPattiHand(bot2Hand, variant, jokerCard?.rank);

    let bestOwner: 'you' | 'priya' | 'vikram' = 'you';
    let bestEval = pEval;

    if (!bot1Folded && compareTeenPattiHands(b1Eval, bestEval, variant) > 0) {
      bestOwner = 'priya';
      bestEval = b1Eval;
    }
    if (!bot2Folded && compareTeenPattiHands(b2Eval, bestEval, variant) > 0) {
      bestOwner = 'vikram';
      bestEval = b2Eval;
    }

    const won = bestOwner === 'you';
    const royalBonus =
      won && variant === 'royal999' && pEval.categoryRank >= 5 ? Math.round(currentPot * 0.35) : 0;
    const payout = won ? currentPot + royalBonus : 0;

    await settleGameRound({
      gameId: 'teenpatti',
      variant: TP_VARIANTS.find((v) => v.id === variant)!.name,
      betAmount: userInvested,
      payout,
      outcome: won ? 'win' : 'loss',
      summary: `${bestOwner.toUpperCase()} won with ${bestEval.label}`,
    });

    if (won) {
      soundFx.win();
      setStatus(
        `You won ${payout.toLocaleString('en-IN')} credits with ${pEval.label}!${
          royalBonus > 0 ? ` (Includes +${royalBonus} Royal Bonus)` : ''
        }`
      );
    } else {
      soundFx.loss();
      setStatus(
        `${bestOwner === 'priya' ? 'Priya' : 'Vikram'} won the pot (${currentPot.toLocaleString('en-IN')}) with ${bestEval.label}. Your hand: ${pEval.label}.`
      );
    }
  };

  const handleChaal = async (raise = false) => {
    if (phase !== 'playing') return;
    const nextUnit = raise ? chaalUnit * 2 : chaalUnit;
    const cost = isSeen ? nextUnit * 2 : nextUnit;
    if (!canAfford(totalUserBet + cost)) {
      setStatus('Insufficient balance to raise/chaal. Try Show or Pack.');
      return;
    }

    soundFx.chip();
    let newPot = pot + cost;
    const newInvested = totalUserBet + cost;

    // Bot responses
    let b1F = bot1Folded;
    let b2F = bot2Folded;
    if (!b1F && Math.random() < 0.22) b1F = true;
    else if (!b1F) newPot += cost;

    if (!b2F && Math.random() < 0.22) b2F = true;
    else if (!b2F) newPot += cost;

    setBot1Folded(b1F);
    setBot2Folded(b2F);
    setChaalUnit(nextUnit);
    setTotalUserBet(newInvested);
    setPot(newPot);

    if (b1F && b2F) {
      setIsSeen(true);
      setPhase('showdown');
      soundFx.win();
      await settleGameRound({
        gameId: 'teenpatti',
        variant: TP_VARIANTS.find((v) => v.id === variant)!.name,
        betAmount: newInvested,
        payout: newPot,
        outcome: 'win',
        summary: 'All opponents packed — pot won!',
      });
      setStatus(`Both opponents packed! You swept the pot of ${newPot.toLocaleString('en-IN')} credits.`);
      return;
    }

    setStatus(`Pot is now ${newPot.toLocaleString('en-IN')}. Call Chaal, Raise, or Show.`);
  };

  const handleShow = async () => {
    if (phase !== 'playing') return;
    const showCost = isSeen ? chaalUnit * 2 : chaalUnit;
    if (!canAfford(totalUserBet + showCost)) {
      resolveShowdown(false, pot, totalUserBet);
      return;
    }
    soundFx.chip();
    const finalPot = pot + showCost;
    const finalInv = totalUserBet + showCost;
    setPot(finalPot);
    setTotalUserBet(finalInv);
    await resolveShowdown(false, finalPot, finalInv);
  };

  const currentCost = isSeen ? chaalUnit * 2 : chaalUnit;
  const playerEval =
    playerHand.length === 3 && (isSeen || phase === 'showdown')
      ? evaluateTeenPattiHand(playerHand, variant, jokerCard?.rank)
      : null;

  return (
    <div className="space-y-5">
      {/* 5 Variants */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {TP_VARIANTS.map((v) => (
          <button
            key={v.id}
            type="button"
            disabled={phase === 'playing'}
            onClick={() => setVariant(v.id)}
            className={`text-left p-3 rounded-xl border transition-colors ${
              variant === v.id
                ? 'bg-amber-500/15 border-amber-500 text-white'
                : 'bg-[#0B1117] border-white/10 text-slate-300 hover:border-white/25'
            }`}
          >
            <p className="text-xs font-display font-bold truncate">{v.name}</p>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{v.desc}</p>
          </button>
        ))}
      </div>

      {/* Felt Card Table */}
      <div className="felt-surface rounded-2xl border-4 border-[#3a2614] p-5 sm:p-6 shadow-2xl space-y-6">
        {/* Opponents */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { name: 'Priya (Bot 1)', hand: bot1Hand, folded: bot1Folded },
            { name: 'Vikram (Bot 2)', hand: bot2Hand, folded: bot2Folded },
          ].map((bot) => (
            <div
              key={bot.name}
              className="p-3.5 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-xs font-semibold text-white">{bot.name}</p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {bot.folded
                    ? 'Packed'
                    : phase === 'showdown' && bot.hand.length === 3
                      ? evaluateTeenPattiHand(bot.hand, variant, jokerCard?.rank).label
                      : phase === 'playing'
                        ? 'Playing Blind'
                        : 'Waiting'}
                </p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <PlayingCardView
                    key={i}
                    size="sm"
                    card={bot.hand[i]}
                    hidden={phase !== 'showdown' || bot.folded || !bot.hand[i]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Center Pot & Joker */}
        <div className="flex flex-wrap items-center justify-center gap-6 py-2">
          <div className="px-6 py-3 rounded-2xl bg-black/40 border border-amber-400/40 text-center">
            <p className="text-[11px] text-amber-200 uppercase tracking-wider">Table Pot</p>
            <p className="text-2xl font-mono-num font-bold text-amber-400">
              {pot.toLocaleString('en-IN')}
            </p>
          </div>
          {jokerCard && (
            <div className="flex items-center gap-2.5 bg-black/35 px-3 py-2 rounded-xl border border-white/10">
              <span className="text-xs text-amber-300 font-semibold">Hukam Joker:</span>
              <PlayingCardView card={jokerCard} size="sm" highlight />
            </div>
          )}
        </div>

        {/* Player Hand */}
        <div className="p-4 rounded-2xl bg-black/35 border border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-sm font-display font-bold text-white">Your Hand ({isSeen ? 'Seen' : 'Blind'})</p>
            <p className="text-xs text-emerald-300 mt-0.5">
              {playerEval ? playerEval.label : phase === 'playing' ? 'Tap See Cards to reveal' : 'Ready to deal'}
            </p>
            {phase !== 'idle' && (
              <p className="text-[11px] font-mono-num text-slate-300 mt-1">
                Your Stake: {totalUserBet.toLocaleString('en-IN')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            {[0, 1, 2].map((i) => (
              <PlayingCardView
                key={i}
                size="md"
                card={playerHand[i]}
                hidden={!isSeen || !playerHand[i]}
              />
            ))}
          </div>
        </div>

        {/* Status Bar */}
        <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-amber-100 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{status}</span>
        </div>

        {/* Action Buttons */}
        {phase === 'playing' ? (
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {!isSeen ? (
              <button
                type="button"
                onClick={handleSeeCards}
                className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                See Cards
              </button>
            ) : (
              <span className="px-3 py-2 rounded-xl bg-white/10 text-xs text-slate-200 flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5" /> Seen Mode
              </span>
            )}
            <button
              type="button"
              onClick={() => handleChaal(false)}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono-num"
            >
              {isSeen ? 'Chaal' : 'Blind'} ({currentCost})
            </button>
            <button
              type="button"
              onClick={() => handleChaal(true)}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono-num"
            >
              Raise 2x ({currentCost * 2})
            </button>
            <button
              type="button"
              onClick={handleShow}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs"
            >
              Show ({currentCost})
            </button>
            <button
              type="button"
              onClick={() => resolveShowdown(true)}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs"
            >
              Pack
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-xl border border-white/10">
              <span className="text-xs text-slate-300">Boot:</span>
              {[2, 5, 10, 50].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setBoot(v)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono-num font-semibold ${
                    boot === v ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-white'
                  }`}
                >
                  ₹{v}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={startDeal}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors"
            >
              {phase === 'showdown' ? 'Deal Next Hand' : 'Deal Cards'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
