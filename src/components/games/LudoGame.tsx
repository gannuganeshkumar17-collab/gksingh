import { useEffect, useState } from 'react';
import { Dices, Trophy } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { soundFx } from '../../utils/sound';

type LudoMode = 'classic4' | 'quick2' | 'blitz';
type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

// Standard 52-cell clockwise outer track coordinates on 15x15 grid (row, col)
const OUTER_TRACK: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], [6, 0],
];

const HOME_STRETCH: Record<PlayerColor, [number, number][]> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

const START_INDEX: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

const SAFE_TRACK_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const BASE_COORDS: Record<PlayerColor, [number, number][]> = {
  red: [[2, 2], [2, 3], [3, 2], [3, 3]],
  green: [[2, 11], [2, 12], [3, 11], [3, 12]],
  yellow: [[11, 11], [11, 12], [12, 11], [12, 12]],
  blue: [[11, 2], [11, 3], [12, 2], [12, 3]],
};

const COLOR_HEX: Record<PlayerColor, string> = {
  red: '#ef4444',
  green: '#10b981',
  yellow: '#f59e0b',
  blue: '#3b82f6',
};

const MODES: { id: LudoMode; name: string; desc: string; winMult: number }[] = [
  { id: 'classic4', name: '1. Classic 4-Player Ludo', desc: 'You (Red) vs 3 AI Bots · 4 tokens each · 3.6x Prize', winMult: 3.6 },
  { id: 'quick2', name: '2. Quick 1v1 Duel', desc: 'You vs Yellow AI · First 2 tokens Home wins · 1.95x Prize', winMult: 1.95 },
  { id: 'blitz', name: '3. Blitz Master Ludo', desc: 'Starts with 1 token unlocked · Fast captures · 4.2x Prize', winMult: 4.2 },
];

export function LudoGame() {
  const { user, canAfford, settleGameRound, setAuthModalOpen } = useWallet();
  const [mode, setMode] = useState<LudoMode>('classic4');
  const [bet, setBet] = useState(5);
  const [playing, setPlaying] = useState(false);
  const [winner, setWinner] = useState<PlayerColor | null>(null);
  const [turn, setTurn] = useState<PlayerColor>('red');
  const [dice, setDice] = useState<number>(6);
  const [hasRolled, setHasRolled] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [log, setLog] = useState('Select a Ludo mode and start match to play.');

  // Token progress: -1 = in base, 0..50 = outer track steps from start, 51..56 = home stretch (56 = home!)
  const [tokens, setTokens] = useState<Record<PlayerColor, number[]>>({
    red: [-1, -1, -1, -1],
    green: [-1, -1, -1, -1],
    yellow: [-1, -1, -1, -1],
    blue: [-1, -1, -1, -1],
  });

  const activeColors: PlayerColor[] = mode === 'quick2' ? ['red', 'yellow'] : ['red', 'green', 'yellow', 'blue'];
  const tokensNeededToWin = mode === 'quick2' ? 2 : 4;
  const currentMode = MODES.find((m) => m.id === mode)!;

  const startMatch = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!canAfford(bet)) {
      setLog('Insufficient balance. Deposit credits to start this Ludo match.');
      return;
    }
    soundFx.chip();
    const initialTokens: Record<PlayerColor, number[]> = {
      red: mode === 'blitz' ? [0, -1, -1, -1] : [-1, -1, -1, -1],
      green: mode === 'blitz' ? [0, -1, -1, -1] : [-1, -1, -1, -1],
      yellow: mode === 'blitz' ? [0, -1, -1, -1] : [-1, -1, -1, -1],
      blue: mode === 'blitz' ? [0, -1, -1, -1] : [-1, -1, -1, -1],
    };
    setTokens(initialTokens);
    setWinner(null);
    setTurn('red');
    setHasRolled(false);
    setPlaying(true);
    setLog('Your turn (Red)! Roll the dice.');
  };

  const getGlobalTrackIndex = (color: PlayerColor, step: number): number | null => {
    if (step < 0 || step > 50) return null;
    return (START_INDEX[color] + step) % 52;
  };

  const getLegalTokenIndices = (color: PlayerColor, roll: number, state: Record<PlayerColor, number[]>) => {
    return state[color]
      .map((prog, idx) => ({ prog, idx }))
      .filter(({ prog }) => {
        if (prog === -1) return roll === 6;
        return prog + roll <= 56;
      })
      .map((x) => x.idx);
  };

  const finishMatch = async (winColor: PlayerColor) => {
    setPlaying(false);
    setWinner(winColor);
    const won = winColor === 'red';
    const payout = won ? Math.round(bet * currentMode.winMult) : 0;
    if (won) soundFx.win();
    else soundFx.loss();

    setLog(
      won
        ? `Victory! Red reached Home! You won ${payout.toLocaleString('en-IN')} credits.`
        : `${winColor.toUpperCase()} won the match!`
    );

    await settleGameRound({
      gameId: 'ludo',
      variant: currentMode.name,
      betAmount: bet,
      payout,
      outcome: won ? 'win' : 'loss',
      summary: `${winColor.toUpperCase()} finished ${tokensNeededToWin} tokens home`,
    });
  };

  const advanceTurn = (current: PlayerColor, bonusRoll: boolean) => {
    if (bonusRoll) {
      setHasRolled(false);
      setLog(`${current === 'red' ? 'Your' : current.toUpperCase()} bonus roll!`);
      return;
    }
    const idx = activeColors.indexOf(current);
    const next = activeColors[(idx + 1) % activeColors.length];
    setTurn(next);
    setHasRolled(false);
    setLog(next === 'red' ? 'Your turn (Red)! Roll the dice.' : `${next.toUpperCase()} bot is thinking...`);
  };

  const moveToken = (color: PlayerColor, tokenIdx: number, rollVal: number) => {
    const nextState: Record<PlayerColor, number[]> = {
      red: [...tokens.red],
      green: [...tokens.green],
      yellow: [...tokens.yellow],
      blue: [...tokens.blue],
    };

    const currentProg = nextState[color][tokenIdx];
    const newProg = currentProg === -1 ? 0 : currentProg + rollVal;
    nextState[color][tokenIdx] = newProg;

    let captured = false;
    const globalIdx = getGlobalTrackIndex(color, newProg);
    if (globalIdx !== null && !SAFE_TRACK_INDICES.has(globalIdx)) {
      for (const other of activeColors) {
        if (other === color) continue;
        nextState[other] = nextState[other].map((oProg) => {
          const oGlobal = getGlobalTrackIndex(other, oProg);
          if (oGlobal === globalIdx) {
            captured = true;
            return -1;
          }
          return oProg;
        });
      }
    }

    if (captured) soundFx.hit();
    else soundFx.deal();

    setTokens(nextState);

    const finishedCount = nextState[color].filter((p) => p === 56).length;
    if (finishedCount >= tokensNeededToWin) {
      finishMatch(color);
      return;
    }

    advanceTurn(color, rollVal === 6 || captured || newProg === 56);
  };

  const rollDice = () => {
    if (!playing || hasRolled || rolling || turn !== 'red') return;
    setRolling(true);
    soundFx.dice();
    setTimeout(() => {
      const val = Math.floor(Math.random() * 6) + 1;
      setDice(val);
      setRolling(false);
      setHasRolled(true);

      const legal = getLegalTokenIndices('red', val, tokens);
      if (legal.length === 0) {
        setLog(`Rolled ${val} — no legal moves.`);
        setTimeout(() => advanceTurn('red', false), 500);
      } else if (legal.length === 1) {
        setLog(`Rolled ${val} — auto-moving token.`);
        setTimeout(() => moveToken('red', legal[0], val), 250);
      } else {
        setLog(`Rolled ${val}! Tap a glowing Red token to move.`);
      }
    }, 320);
  };

  // AI Bot turn automation
  useEffect(() => {
    if (!playing || winner || turn === 'red') return;
    const timer = setTimeout(() => {
      const val = Math.floor(Math.random() * 6) + 1;
      setDice(val);
      soundFx.dice();

      const legal = getLegalTokenIndices(turn, val, tokens);
      if (legal.length === 0) {
        advanceTurn(turn, false);
      } else {
        // Prefer advancing farthest token or unlocking base
        let chosen = legal[0];
        let bestScore = -999;
        for (const idx of legal) {
          const cur = tokens[turn][idx];
          const nxt = cur === -1 ? 0 : cur + val;
          const score = nxt === 56 ? 200 : cur === -1 ? 80 : nxt;
          if (score > bestScore) {
            bestScore = score;
            chosen = idx;
          }
        }
        moveToken(turn, chosen, val);
      }
    }, 600);
    return () => clearTimeout(timer);
  });

  const legalRedTokens = playing && turn === 'red' && hasRolled ? getLegalTokenIndices('red', dice, tokens) : [];

  const getTokenCell = (color: PlayerColor, tokenIdx: number, prog: number): [number, number] => {
    if (prog === -1) return BASE_COORDS[color][tokenIdx];
    if (prog <= 50) {
      const gIdx = (START_INDEX[color] + prog) % 52;
      return OUTER_TRACK[gIdx];
    }
    return HOME_STRETCH[color][Math.min(5, prog - 51)];
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={playing}
            onClick={() => setMode(m.id)}
            className={`text-left p-4 rounded-xl border transition-colors ${
              mode === m.id
                ? 'bg-amber-500/15 border-amber-500 text-white'
                : 'bg-[#0B1117] border-white/10 text-slate-300 hover:border-white/25'
            }`}
          >
            <p className="font-display font-bold text-sm">{m.name}</p>
            <p className="text-xs text-slate-400 mt-1">{m.desc}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 15x15 Classic Ludo Board */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="relative w-full max-w-[460px] aspect-square rounded-2xl overflow-hidden border-4 border-amber-900/60 bg-slate-100 shadow-2xl grid grid-cols-[repeat(15,minmax(0,1fr))] grid-rows-[repeat(15,minmax(0,1fr))]">
            {Array.from({ length: 15 * 15 }).map((_, cellIdx) => {
              const r = Math.floor(cellIdx / 15);
              const c = cellIdx % 15;

              let bg = 'bg-white';
              if (r < 6 && c < 6) bg = 'bg-red-600/90';
              else if (r < 6 && c > 8) bg = 'bg-emerald-600/90';
              else if (r > 8 && c > 8) bg = 'bg-amber-500/90';
              else if (r > 8 && c < 6) bg = 'bg-blue-600/90';
              else if (r >= 6 && r <= 8 && c >= 6 && c <= 8) bg = 'bg-slate-900';
              else if (r === 7 && c >= 1 && c <= 5) bg = 'bg-red-500/80';
              else if (c === 7 && r >= 1 && r <= 5) bg = 'bg-emerald-500/80';
              else if (r === 7 && c >= 9 && c <= 13) bg = 'bg-amber-400/85';
              else if (c === 7 && r >= 9 && r <= 13) bg = 'bg-blue-500/80';
              else if (r === 6 && c === 1) bg = 'bg-red-500';
              else if (r === 1 && c === 8) bg = 'bg-emerald-500';
              else if (r === 8 && c === 13) bg = 'bg-amber-400';
              else if (r === 13 && c === 6) bg = 'bg-blue-500';

              const isStar =
                (r === 6 && c === 1) ||
                (r === 2 && c === 6) ||
                (r === 1 && c === 8) ||
                (r === 6 && c === 12) ||
                (r === 8 && c === 13) ||
                (r === 12 && c === 8) ||
                (r === 13 && c === 6) ||
                (r === 8 && c === 2);

              // Find tokens on this cell
              const cellTokens: { color: PlayerColor; idx: number }[] = [];
              for (const col of activeColors) {
                tokens[col].forEach((prog, idx) => {
                  const [tr, tc] = getTokenCell(col, idx, prog);
                  if (tr === r && tc === c) cellTokens.push({ color: col, idx });
                });
              }

              return (
                <div
                  key={`${r}-${c}`}
                  className={`${bg} border border-slate-300/60 relative flex items-center justify-center`}
                >
                  {isStar && cellTokens.length === 0 && (
                    <span className="text-[10px] text-slate-700/70 select-none">★</span>
                  )}
                  {r === 7 && c === 7 && (
                    <Trophy className="w-4 h-4 text-amber-400" />
                  )}
                  {cellTokens.map((t, stackIdx) => {
                    const isSelectable = t.color === 'red' && legalRedTokens.includes(t.idx);
                    return (
                      <button
                        key={`${t.color}-${t.idx}`}
                        type="button"
                        disabled={!isSelectable}
                        onClick={() => isSelectable && moveToken('red', t.idx, dice)}
                        style={{
                          backgroundColor: COLOR_HEX[t.color],
                          transform: stackIdx > 0 ? `translate(${stackIdx * 2}px, ${stackIdx * -2}px)` : undefined,
                        }}
                        className={`w-[74%] h-[74%] rounded-full border-2 border-white shadow-md transition-transform ${
                          isSelectable ? 'ring-2 ring-amber-300 scale-115 animate-pulse cursor-pointer z-10' : ''
                        }`}
                        aria-label={`${t.color} token ${t.idx + 1}`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Controls & Status */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-[#0B1117] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Current Turn</p>
                <p className="text-lg font-display font-bold capitalize" style={{ color: COLOR_HEX[turn] }}>
                  {turn === 'red' ? 'Your Turn (Red)' : `${turn} AI`}
                </p>
              </div>
              <div
                className={`w-14 h-14 rounded-2xl bg-white text-slate-950 font-mono-num text-2xl font-bold flex items-center justify-center shadow-lg ${
                  rolling ? 'animate-dice-tumble' : ''
                }`}
              >
                {dice}
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-[#131C26] p-3 rounded-xl border border-white/10">{log}</p>

            {playing ? (
              <button
                type="button"
                disabled={turn !== 'red' || hasRolled || rolling}
                onClick={rollDice}
                className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Dices className="w-4 h-4" />
                {rolling ? 'Rolling...' : turn !== 'red' ? 'AI Turn...' : hasRolled ? 'Tap Glowing Token' : 'Roll Dice'}
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Entry Stake (Win {currentMode.winMult}x)</label>
                  <input
                    type="number"
                    min={5}
                    max={25000}
                    value={bet}
                    onChange={(e) => setBet(Math.max(5, Number(e.target.value)))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#131C26] border border-white/10 font-mono-num text-sm text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={startMatch}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors"
                >
                  {winner ? 'Play Again' : 'Start Ludo Match'}
                </button>
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-[#0B1117] border border-white/10 space-y-2">
            <p className="text-xs font-semibold text-slate-400">Home Progress ({tokensNeededToWin} to Win)</p>
            <div className="grid grid-cols-2 gap-2">
              {activeColors.map((col) => {
                const homeCount = tokens[col].filter((p) => p === 56).length;
                return (
                  <div key={col} className="p-2.5 rounded-xl bg-[#131C26] border border-white/10 flex items-center justify-between text-xs">
                    <span className="capitalize font-semibold" style={{ color: COLOR_HEX[col] }}>
                      {col === 'red' ? 'You (Red)' : `${col} AI`}
                    </span>
                    <span className="font-mono-num text-white">
                      {homeCount}/{tokensNeededToWin}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
