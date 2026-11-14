import type { PlayingCard } from '../types';

interface PlayingCardViewProps {
  card?: PlayingCard;
  hidden?: boolean;
  size?: 'sm' | 'md' | 'lg';
  highlight?: boolean;
  tag?: string;
}

export function PlayingCardView({
  card,
  hidden = false,
  size = 'md',
  highlight = false,
  tag,
}: PlayingCardViewProps) {
  const sizeClasses =
    size === 'sm'
      ? 'w-12 h-16 text-xs rounded-lg'
      : size === 'lg'
        ? 'w-20 h-28 text-base rounded-xl'
        : 'w-16 h-24 text-sm rounded-xl';

  if (hidden || !card) {
    return (
      <div
        className={`${sizeClasses} relative select-none border border-amber-400/40 bg-gradient-to-br from-[#1b2d42] via-[#101c2b] to-[#0a121c] shadow-lg flex items-center justify-center animate-card-deal`}
      >
        <div className="w-[80%] h-[82%] rounded border border-amber-400/30 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.18)_0%,transparent_70%)]">
          <span className="text-amber-400/80 font-display font-bold text-xs tracking-wider">RC</span>
        </div>
      </div>
    );
  }

  const isRed = card.suit === '♥' || card.suit === '♦';

  return (
    <div
      className={`${sizeClasses} relative select-none bg-white text-slate-900 shadow-lg flex flex-col justify-between p-1.5 animate-card-deal ${
        highlight ? 'ring-2 ring-amber-400 shadow-amber-500/20' : 'border border-slate-200'
      }`}
    >
      {tag && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[9px] font-bold bg-amber-500 text-slate-950 rounded whitespace-nowrap">
          {tag}
        </span>
      )}
      <div className={`flex flex-col leading-none font-bold ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
        <span>{card.rank}</span>
        <span className="text-[11px]">{card.suit}</span>
      </div>
      <div className={`self-center text-2xl leading-none ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
        {card.suit}
      </div>
      <div className={`flex flex-col leading-none font-bold self-end rotate-180 ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
        <span>{card.rank}</span>
        <span className="text-[11px]">{card.suit}</span>
      </div>
    </div>
  );
}
