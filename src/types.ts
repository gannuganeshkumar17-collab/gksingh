export type GameId =
  | 'cockfight'
  | 'aviator'
  | 'ludo'
  | 'teenpatti'
  | 'inout'
  | 'dragontiger'
  | 'sevenup'
  | 'mines'
  | 'wingo'
  | 'roulette';

export type AuthMethod = 'google' | 'phone_otp';

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  phone?: string;
  phoneVerified?: boolean;
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  gamesPlayed: number;
  authMethod: AuthMethod;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdraw' | 'bet' | 'win' | 'bonus';
  amount: number;
  method: string;
  reference: string;
  gameName?: string;
  status: 'completed' | 'pending' | 'failed';
  balanceAfter: number;
  createdAt: string;
}

export interface GameRound {
  id: string;
  userId: string;
  gameId: string;
  variant: string;
  betAmount: number;
  payout: number;
  outcome: 'win' | 'loss' | 'draw';
  summary: string;
  createdAt: string;
}

export interface SmsToast {
  id: string;
  phone: string;
  otp: string;
  message: string;
  timestamp: string;
}

export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface PlayingCard {
  suit: Suit;
  rank: Rank;
  value: number; // 2..14 (Ace=14)
}

export interface GameCatalogItem {
  id: GameId;
  title: string;
  category: 'Crash & Arena' | 'Card Tables' | 'Board & Dice' | 'Instant Arcade';
  modesLabel: string;
  description: string;
  image?: string;
  accentHex: string;
  minBet: number;
}
