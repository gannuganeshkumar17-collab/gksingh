import type { PlayingCard, Rank, Suit } from '../types';

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function createShuffledDeck(): PlayingCard[] {
  const deck: PlayingCard[] = [];
  for (const suit of SUITS) {
    RANKS.forEach((rank, idx) => {
      deck.push({ suit, rank, value: idx + 2 });
    });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export interface TeenPattiEval {
  categoryRank: number; // 6=Trail, 5=PureSeq, 4=Seq, 3=Color, 2=Pair, 1=HighCard
  label: string;
  tiebreakers: number[];
}

function evalThreeCardsRaw(cards: PlayingCard[]): TeenPattiEval {
  const vals = cards.map((c) => c.value).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const sameSuit = suits[0] === suits[1] && suits[1] === suits[2];

  const isTrail = vals[0] === vals[1] && vals[1] === vals[2];
  if (isTrail) {
    return { categoryRank: 6, label: 'Trail (Three of a Kind)', tiebreakers: [vals[0]] };
  }

  // Sequence check (A-K-Q = 14-13-12 highest, A-2-3 = 14-3-2 second highest)
  const isNormalSeq = vals[0] - 1 === vals[1] && vals[1] - 1 === vals[2];
  const isA23 = vals[0] === 14 && vals[1] === 3 && vals[2] === 2;
  const isSeq = isNormalSeq || isA23;
  const seqHigh = isA23 ? 13.5 : vals[0];

  if (isSeq && sameSuit) {
    return { categoryRank: 5, label: 'Pure Sequence', tiebreakers: [seqHigh] };
  }
  if (isSeq) {
    return { categoryRank: 4, label: 'Sequence', tiebreakers: [seqHigh] };
  }
  if (sameSuit) {
    return { categoryRank: 3, label: 'Color (Flush)', tiebreakers: vals };
  }
  if (vals[0] === vals[1] || vals[1] === vals[2] || vals[0] === vals[2]) {
    const pairVal = vals[0] === vals[1] ? vals[0] : vals[1] === vals[2] ? vals[1] : vals[0];
    const kicker = vals.find((v) => v !== pairVal) ?? pairVal;
    return { categoryRank: 2, label: 'Pair', tiebreakers: [pairVal, kicker] };
  }
  return { categoryRank: 1, label: 'High Card', tiebreakers: vals };
}

function compareEvalRaw(a: TeenPattiEval, b: TeenPattiEval): number {
  if (a.categoryRank !== b.categoryRank) return a.categoryRank - b.categoryRank;
  for (let i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
    const diff = (a.tiebreakers[i] ?? 0) - (b.tiebreakers[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function evaluateTeenPattiHand(
  cards: PlayingCard[],
  mode: 'classic' | 'muflis' | 'ak47' | 'hukam' | 'royal999',
  jokerRank?: Rank
): TeenPattiEval {
  const isWild = (c: PlayingCard) => {
    if (mode === 'ak47') return c.rank === 'A' || c.rank === 'K' || c.rank === '4' || c.rank === '7';
    if (mode === 'hukam' && jokerRank) return c.rank === jokerRank;
    return false;
  };

  const wildCount = cards.filter(isWild).length;
  if (wildCount === 0) {
    return evalThreeCardsRaw(cards);
  }

  // Substitute wildcards greedily against a representative pool to find best hand
  const fixed = cards.filter((c) => !isWild(c));
  if (fixed.length === 0) {
    return { categoryRank: 6, label: 'Trail of Aces (Wild)', tiebreakers: [14] };
  }

  const allCandidates: PlayingCard[] = [];
  for (const s of SUITS) {
    for (let idx = 0; idx < RANKS.length; idx++) {
      allCandidates.push({ suit: s, rank: RANKS[idx], value: idx + 2 });
    }
  }

  let best: TeenPattiEval | null = null;
  if (wildCount === 1) {
    for (const sub of allCandidates) {
      const ev = evalThreeCardsRaw([...fixed, sub]);
      if (!best || compareEvalRaw(ev, best) > 0) best = ev;
    }
  } else {
    // 2 or 3 wilds: can at least form Trail of highest fixed or Trail of Aces
    const highSuit = fixed[0].suit;
    const vals = fixed.map((c) => c.value);
    const maxV = Math.max(...vals);
    if (fixed.length === 1) {
      best = { categoryRank: 6, label: 'Trail (Wild)', tiebreakers: [maxV] };
    } else {
      for (const sub of allCandidates) {
        for (const sub2 of [
          { suit: highSuit, rank: 'A' as Rank, value: 14 },
          { suit: highSuit, rank: fixed[0].rank, value: fixed[0].value },
        ]) {
          const ev = evalThreeCardsRaw([...fixed, sub, sub2]);
          if (!best || compareEvalRaw(ev, best) > 0) best = ev;
        }
      }
    }
  }

  return best ? { ...best, label: `${best.label} (Wild)` } : evalThreeCardsRaw(cards);
}

export function compareTeenPattiHands(
  a: TeenPattiEval,
  b: TeenPattiEval,
  mode: 'classic' | 'muflis' | 'ak47' | 'hukam' | 'royal999'
): number {
  const cmp = compareEvalRaw(a, b);
  return mode === 'muflis' ? -cmp : cmp;
}
