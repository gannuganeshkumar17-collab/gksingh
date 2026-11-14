import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Bomb,
  Dices,
  Flame,
  Gamepad2,
  History,
  LogOut,
  Plane,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Swords,
  User,
  Volume2,
  VolumeX,
  Wallet,
} from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { SmsNotificationBanner } from './components/SmsNotificationBanner';
import { WalletModal } from './components/WalletModal';
import { AviatorGame } from './components/games/AviatorGame';
import { CockFightGame } from './components/games/CockFightGame';
import {
  ColorWingoGame,
  DragonTigerGame,
  MinesGame,
  RouletteGame,
  SevenUpDownGame,
} from './components/games/ExtraCasinoGames';
import { InOutGame } from './components/games/InOutGame';
import { LudoGame } from './components/games/LudoGame';
import { TeenPattiGame } from './components/games/TeenPattiGame';
import { useWallet, WalletProvider } from './context/WalletContext';
import type { GameCatalogItem, GameId } from './types';
import { soundFx } from './utils/sound';

const GAME_CATALOG: GameCatalogItem[] = [
  {
    id: 'cockfight',
    title: 'Cock Fight Arena',
    category: 'Crash & Arena',
    modesLabel: '2 Modes · Classic Duel & Knockout Cup',
    description: 'Pick Red, Blue, or Draw inside the animated floodlit pit with live round strikes and instant payouts.',
    image: '/src/assets/images/game_cock_arena_1794650557319.jpg',
    accentHex: '#ef4444',
    minBet: 5,
  },
  {
    id: 'aviator',
    title: 'Aviator Crash',
    category: 'Crash & Arena',
    modesLabel: '5 Variants · Baron, Turbo, SpaceX, Chopper, Eagle',
    description: '5 distinct flight modes with dual bet panels, auto-cashout targets, and live trajectory multipliers.',
    image: '/src/assets/images/game_aviator_sky_1794650557272.jpg',
    accentHex: '#f59e0b',
    minBet: 5,
  },
  {
    id: 'ludo',
    title: 'Ludo Royale',
    category: 'Board & Dice',
    modesLabel: '3 Modes · Classic 4P, Quick 1v1, Blitz Master',
    description: 'Full 15x15 classic board with safe star squares, token captures, dice physics, and smart AI bots.',
    image: '/src/assets/images/game_ludo_royal_1794650558841.jpg',
    accentHex: '#10b981',
    minBet: 5,
  },
  {
    id: 'teenpatti',
    title: 'Teen Patti Club',
    category: 'Card Tables',
    modesLabel: '5 Variants · Classic, Muflis, AK47, Hukam, Royal 999',
    description: 'Authentic 3-card Indian Poker with Blind/Seen mode, Chaal, Raise, Pack, and wild joker rules.',
    image: '/src/assets/images/game_teenpatti_cards_1794650560804.jpg',
    accentHex: '#14b8a6',
    minBet: 2,
  },
  {
    id: 'inout',
    title: 'In-Out (Andar Bahar)',
    category: 'Card Tables',
    modesLabel: 'Classic Table · 1.90x IN / 2.00x OUT',
    description: 'Match the center Joker rank on alternating IN and OUT deals with instant round settlement.',
    accentHex: '#38bdf8',
    minBet: 5,
  },
  {
    id: 'dragontiger',
    title: 'Dragon Tiger',
    category: 'Card Tables',
    modesLabel: 'Fast Duel · 2x Side / 8x Tie',
    description: 'High-speed single-card showdown between Dragon and Tiger on emerald felt.',
    accentHex: '#f97316',
    minBet: 5,
  },
  {
    id: 'sevenup',
    title: '7 Up & Down',
    category: 'Board & Dice',
    modesLabel: 'Dual Dice · 2x Range / 5x Lucky 7',
    description: 'Roll two ivory dice and predict Under 7, Lucky 7, or Over 7 with instant payouts.',
    accentHex: '#eab308',
    minBet: 5,
  },
  {
    id: 'mines',
    title: 'Mines Treasure',
    category: 'Instant Arcade',
    modesLabel: '5x5 Grid · 1–12 Mines · Cashout Anytime',
    description: 'Uncover diamonds across 25 tiles while dodging mines to multiply your stake.',
    accentHex: '#22c55e',
    minBet: 5,
  },
  {
    id: 'wingo',
    title: 'Color Wingo',
    category: 'Instant Arcade',
    modesLabel: 'Color & Digit · Up to 9x Payout',
    description: 'Predict Green, Red, Violet, or exact 0–9 digits with live period history.',
    accentHex: '#a855f7',
    minBet: 5,
  },
  {
    id: 'roulette',
    title: 'Lucky Roulette',
    category: 'Instant Arcade',
    modesLabel: 'European 0–36 · Up to 35x Straight',
    description: 'Classic single-zero wheel with Red/Black, Even/Odd, and Zero straight bets.',
    accentHex: '#ec4899',
    minBet: 5,
  },
];

function FallbackGameArt({ id, title }: { id: GameId; title: string }) {
  const iconMap: Record<GameId, typeof Gamepad2> = {
    cockfight: Swords,
    aviator: Plane,
    ludo: Dices,
    teenpatti: Sparkles,
    inout: Sparkles,
    dragontiger: Flame,
    sevenup: Dices,
    mines: Bomb,
    wingo: Gamepad2,
    roulette: RotateCw,
  };
  const Icon = iconMap[id] ?? Gamepad2;
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#162433] via-[#0F1822] to-[#090F16] p-4">
      <Icon className="w-10 h-10 text-amber-400/90 mb-2" />
      <span className="text-xs font-display font-semibold text-slate-300">{title}</span>
    </div>
  );
}

function ArenaShell() {
  const {
    user,
    gameRounds,
    logout,
    setAuthModalOpen,
    setWalletModalTab,
  } = useWallet();

  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [muted, setMuted] = useState(false);

  const toggleMute = () => {
    soundFx.muted = !muted;
    setMuted(!muted);
  };

  const filteredGames =
    categoryFilter === 'All'
      ? GAME_CATALOG
      : GAME_CATALOG.filter((g) => g.category === categoryFilter);

  const activeGameMeta = activeGame ? GAME_CATALOG.find((g) => g.id === activeGame) : null;

  const scrollToCatalog = (cat: string) => {
    setActiveGame(null);
    setCategoryFilter(cat);
    setTimeout(() => {
      document.getElementById('games-catalog')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1117] text-slate-100">
      <SmsNotificationBanner />
      <AuthModal />
      <WalletModal />

      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B1117]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveGame(null)}
            className="text-lg sm:text-xl font-display font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            Yono Real Game
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <button
              type="button"
              onClick={() => scrollToCatalog('All')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Lobby
            </button>
            <button
              type="button"
              onClick={() => scrollToCatalog('Crash & Arena')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Crash & Arena
            </button>
            <button
              type="button"
              onClick={() => scrollToCatalog('Card Tables')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Card Tables
            </button>
            <button
              type="button"
              onClick={() => {
                if (!user) setAuthModalOpen(true);
                else setWalletModalTab('deposit');
              }}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Wallet
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() => setWalletModalTab('deposit')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs sm:text-sm whitespace-nowrap shrink-0 transition-colors"
              >
                <Wallet className="w-4 h-4" />
                <span className="font-mono-num">₹{user.balance.toLocaleString('en-IN')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs sm:text-sm whitespace-nowrap shrink-0 transition-colors"
              >
                Login / Register
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {activeGame && activeGameMeta ? (
          /* ACTIVE GAME VIEWPORT */
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#131C26] border border-white/10">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveGame(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0B1117] hover:bg-white/5 border border-white/10 text-xs font-medium text-slate-200 whitespace-nowrap"
                >
                  <ArrowLeft className="w-4 h-4" />
                  All Games
                </button>
                <div>
                  <h1 className="text-lg sm:text-xl font-display font-bold text-white">{activeGameMeta.title}</h1>
                  <p className="text-xs text-slate-400">{activeGameMeta.modesLabel}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-2 rounded-xl bg-[#0B1117] border border-white/10 text-slate-300 hover:text-white"
                  aria-label={muted ? 'Unmute sound' : 'Mute sound'}
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => (user ? setWalletModalTab('deposit') : setAuthModalOpen(true))}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold whitespace-nowrap"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  Deposit
                </button>
                <button
                  type="button"
                  onClick={() => (user ? setWalletModalTab('withdraw') : setAuthModalOpen(true))}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold whitespace-nowrap"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Withdraw
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 rounded-2xl bg-[#131C26] border border-white/10">
              {activeGame === 'cockfight' && <CockFightGame />}
              {activeGame === 'aviator' && <AviatorGame />}
              {activeGame === 'ludo' && <LudoGame />}
              {activeGame === 'teenpatti' && <TeenPattiGame />}
              {activeGame === 'inout' && <InOutGame />}
              {activeGame === 'dragontiger' && <DragonTigerGame />}
              {activeGame === 'sevenup' && <SevenUpDownGame />}
              {activeGame === 'mines' && <MinesGame />}
              {activeGame === 'wingo' && <ColorWingoGame />}
              {activeGame === 'roulette' && <RouletteGame />}
            </div>
          </section>
        ) : (
          /* LOBBY VIEW */
          <>
            {/* Hero Split */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-7 p-6 sm:p-8 rounded-2xl bg-[#131C26] border border-white/10 flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>10 Playable Games</span>
                    <span aria-hidden="true">·</span>
                    <span>Unified Wallet</span>
                    <span aria-hidden="true">·</span>
                    <span>OTP & Google Login</span>
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight leading-tight text-balance">
                    Play Aviator, Teen Patti, Ludo, Cock Fight &amp; In-Out Live.
                  </h1>
                  <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
                    Every game mode runs in real time with one shared wallet. Register with Mobile + 6-digit SMS OTP or Google Sign-In, deposit or withdraw virtual credits anytime, and switch seamlessly across 10 games.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveGame('aviator')}
                    className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors whitespace-nowrap"
                  >
                    Launch Aviator (5 Modes)
                  </button>
                  {user ? (
                    <button
                      type="button"
                      onClick={() => setWalletModalTab('deposit')}
                      className="px-5 py-3 rounded-xl bg-[#0B1117] hover:bg-white/5 border border-white/15 text-white font-semibold text-sm transition-colors whitespace-nowrap"
                    >
                      Deposit / Withdraw
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAuthModalOpen(true)}
                      className="px-5 py-3 rounded-xl bg-[#0B1117] hover:bg-white/5 border border-white/15 text-white font-semibold text-sm transition-colors whitespace-nowrap"
                    >
                      Login with OTP / Google
                    </button>
                  )}
                </div>
              </div>

              <div className="lg:col-span-5 rounded-2xl overflow-hidden border border-white/10 bg-[#131C26] relative min-h-[260px]">
                <img
                  src="/src/assets/images/hero_arena_banner_1794650557271.jpg"
                  alt="Yono Real Game table with playing cards, dice, brass chips, and jet"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-end p-5">
                  <div className="text-xs text-slate-200">
                    <p className="font-display font-bold text-base text-white">Instant ₹10 Joining Balance</p>
                    <p className="text-slate-300 mt-0.5">Added automatically on first OTP or Google registration</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 4-Column Account & Wallet KPI Strip */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-[#131C26] border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Player Account</p>
                  <p className="text-base font-display font-bold text-white mt-0.5 truncate max-w-[170px]">
                    {user ? user.displayName : 'Guest Mode'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {user
                      ? user.phoneVerified
                        ? `Verified ${user.phone}`
                        : user.email || 'Google Verified'
                      : 'Sign in to save progress'}
                  </p>
                </div>
                {user ? (
                  <div className="flex items-center gap-1.5">
                    {!user.phoneVerified && (
                      <button
                        type="button"
                        onClick={() => setAuthModalOpen(true)}
                        className="p-2 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                        title="Verify Phone OTP"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={logout}
                      className="p-2 rounded-lg bg-white/5 text-slate-300 hover:text-white"
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAuthModalOpen(true)}
                    className="p-2 rounded-lg bg-amber-500 text-slate-950"
                    title="Login"
                  >
                    <User className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-[#131C26] border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Wallet Balance</p>
                  <p className="text-xl font-mono-num font-bold text-amber-400 mt-0.5">
                    ₹{user ? user.balance.toLocaleString('en-IN') : '0'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Available across all 10 games</p>
                </div>
                <button
                  type="button"
                  onClick={() => (user ? setWalletModalTab('deposit') : setAuthModalOpen(true))}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs"
                >
                  + Deposit
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[#131C26] border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Deposited / Withdrawn</p>
                  <p className="text-base font-mono-num font-bold text-white mt-0.5">
                    +₹{user ? user.totalDeposited.toLocaleString('en-IN') : '0'} / -₹{user ? user.totalWithdrawn.toLocaleString('en-IN') : '0'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">UPI & Bank IMPS supported</p>
                </div>
                <button
                  type="button"
                  onClick={() => (user ? setWalletModalTab('withdraw') : setAuthModalOpen(true))}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-xs"
                >
                  Withdraw
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[#131C26] border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Rounds Played</p>
                  <p className="text-xl font-mono-num font-bold text-white mt-0.5">
                    {user ? user.gamesPlayed : 0}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Full ledger & receipts</p>
                </div>
                <button
                  type="button"
                  onClick={() => (user ? setWalletModalTab('history') : setAuthModalOpen(true))}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200"
                  title="Passbook"
                >
                  <History className="w-4 h-4" />
                </button>
              </div>
            </section>

            {/* 10 Games Catalog */}
            <section id="games-catalog" className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-display font-bold text-white">All 10 Playable Games</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Includes Cock Fight (2), Aviator (5), Ludo (3), Teen Patti (5), In-Out, and 5 instant arcade tables
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 p-1 bg-[#131C26] rounded-xl border border-white/10">
                  {['All', 'Crash & Arena', 'Card Tables', 'Board & Dice', 'Instant Arcade'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                        categoryFilter === cat
                          ? 'bg-amber-500 text-slate-950 font-semibold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredGames.map((game) => (
                  <div
                    key={game.id}
                    className="rounded-2xl bg-[#131C26] border border-white/10 overflow-hidden flex flex-col justify-between hover:border-amber-500/40 transition-colors"
                  >
                    <div>
                      <div className="aspect-[4/3] w-full overflow-hidden bg-[#0B1117] border-b border-white/10">
                        {game.image ? (
                          <img
                            src={game.image}
                            alt={game.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FallbackGameArt id={game.id} title={game.title} />
                        )}
                      </div>
                      <div className="p-4 space-y-2">
                        <p className="text-xs text-amber-400 font-medium">{game.modesLabel}</p>
                        <h3 className="text-lg font-display font-bold text-white">{game.title}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">{game.description}</p>
                      </div>
                    </div>

                    <div className="px-4 pb-4 pt-2 flex items-center justify-between gap-3">
                      <span className="text-xs font-mono-num text-slate-400">Min ₹{game.minBet}</span>
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.chip();
                          setActiveGame(game.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors whitespace-nowrap"
                      >
                        Play Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Recent Activity */}
            {user && gameRounds.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-display font-bold text-white">Your Recent Game Rounds</h2>
                <div className="rounded-2xl bg-[#131C26] border border-white/10 divide-y divide-white/10 overflow-hidden">
                  {gameRounds.slice(0, 8).map((r) => (
                    <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-4 text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">
                          {r.variant} · {r.summary}
                        </p>
                        <p className="text-slate-400">
                          {new Date(r.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right font-mono-num shrink-0">
                        <p className={r.payout > 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                          {r.payout > 0 ? `+₹${r.payout.toLocaleString('en-IN')}` : `-₹${r.betAmount.toLocaleString('en-IN')}`}
                        </p>
                        <p className="text-slate-500">Stake ₹{r.betAmount.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-white/10 bg-[#0B1117] py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>Yono Real Game · Entertainment &amp; Virtual Gaming Credits Only (No Real Money Wagering)</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => (user ? setWalletModalTab('deposit') : setAuthModalOpen(true))}
              className="hover:text-white transition-colors"
            >
              Deposit
            </button>
            <button
              type="button"
              onClick={() => (user ? setWalletModalTab('withdraw') : setAuthModalOpen(true))}
              className="hover:text-white transition-colors"
            >
              Withdraw
            </button>
            <button
              type="button"
              onClick={() => (user ? setWalletModalTab('history') : setAuthModalOpen(true))}
              className="hover:text-white transition-colors"
            >
              Passbook
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <ArenaShell />
    </WalletProvider>
  );
}
