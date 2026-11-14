import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import type { GameRound, SmsToast, UserProfile, WalletTransaction } from '../types';
import { soundFx } from '../utils/sound';

interface WalletContextValue {
  user: UserProfile | null;
  authReady: boolean;
  transactions: WalletTransaction[];
  gameRounds: GameRound[];
  smsToasts: SmsToast[];
  dismissSmsToast: (id: string) => void;
  sendPhoneOtp: (phone: string, name?: string) => Promise<{ success: boolean; phone?: string; otp?: string; error?: string }>;
  verifyPhoneOtp: (phone: string, otp: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  verifyPhoneForSignedInUser: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  deposit: (amount: number, method: string, reference: string) => Promise<{ success: boolean; error?: string; tx?: WalletTransaction }>;
  withdraw: (amount: number, method: string, destination: string) => Promise<{ success: boolean; error?: string; tx?: WalletTransaction }>;
  settleGameRound: (params: {
    gameId: string;
    variant: string;
    betAmount: number;
    payout: number;
    outcome: 'win' | 'loss' | 'draw';
    summary: string;
  }) => Promise<boolean>;
  canAfford: (amount: number) => boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  walletModalTab: 'deposit' | 'withdraw' | 'history' | null;
  setWalletModalTab: (tab: 'deposit' | 'withdraw' | 'history' | null) => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);
const LOCAL_PHONE_UID_KEY = 'royalclub_phone_uid';

function formatTimestamp(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return (val as Timestamp).toDate().toISOString();
  }
  return new Date().toISOString();
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [gameRounds, setGameRounds] = useState<GameRound[]>([]);
  const [smsToasts, setSmsToasts] = useState<SmsToast[]>([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [walletModalTab, setWalletModalTab] = useState<'deposit' | 'withdraw' | 'history' | null>(null);

  const pushSmsToast = useCallback((phone: string, otp: string) => {
    const id = `sms_${Date.now()}`;
    const toast: SmsToast = {
      id,
      phone,
      otp,
      message: `Yono Real Game OTP: ${otp}. Valid for 5 minutes. Do not share with anyone.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setSmsToasts((prev) => [toast, ...prev.slice(0, 2)]);
  }, []);

  const dismissSmsToast = useCallback((id: string) => {
    setSmsToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load phone-OTP user from Express backend if present
  const loadPhoneSession = useCallback(async (uid: string) => {
    try {
      const res = await fetch(`/api/user/${encodeURIComponent(uid)}`);
      if (!res.ok) {
        localStorage.removeItem(LOCAL_PHONE_UID_KEY);
        return false;
      }
      const data = await res.json();
      if (data?.user) {
        setUser({
          uid: data.user.uid,
          displayName: data.user.displayName,
          phone: data.user.phone,
          phoneVerified: Boolean(data.user.phoneVerified),
          balance: Number(data.user.balance ?? 0),
          totalDeposited: Number(data.user.totalDeposited ?? 0),
          totalWithdrawn: Number(data.user.totalWithdrawn ?? 0),
          gamesPlayed: Number(data.user.gamesPlayed ?? 0),
          authMethod: 'phone_otp',
        });
        setTransactions(data.user.transactions ?? []);
        setGameRounds(data.user.gameRounds ?? []);
        return true;
      }
    } catch {
      // ignore offline
    }
    return false;
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        localStorage.removeItem(LOCAL_PHONE_UID_KEY);
        const userRef = doc(db, 'users', fbUser.uid);
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            const cleanName = (fbUser.displayName || fbUser.email?.split('@')[0] || 'Player').slice(0, 80);
            await setDoc(userRef, {
              uid: fbUser.uid,
              displayName: cleanName,
              email: (fbUser.email || '').slice(0, 120),
              phoneVerified: false,
              balance: 10,
              totalDeposited: 0,
              totalWithdrawn: 0,
              gamesPlayed: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            const bonusId = `tx_join_${Date.now()}`;
            await setDoc(doc(db, 'users', fbUser.uid, 'transactions', bonusId), {
              id: bonusId,
              userId: fbUser.uid,
              type: 'deposit',
              amount: 10,
              method: 'Signup Balance',
              reference: 'JOINING-10',
              status: 'completed',
              balanceAfter: 10,
              createdAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${fbUser.uid}`);
        }
        setAuthReady(true);
      } else {
        const storedPhoneUid = localStorage.getItem(LOCAL_PHONE_UID_KEY);
        if (storedPhoneUid) {
          await loadPhoneSession(storedPhoneUid);
        } else {
          setUser(null);
          setTransactions([]);
          setGameRounds([]);
        }
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, [loadPhoneSession]);

  // Attach Firestore snapshots only when Firebase user is authenticated
  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    const unsubProfile = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setUser({
            uid: d.uid,
            displayName: d.displayName,
            email: d.email,
            phone: d.phone,
            phoneVerified: Boolean(d.phoneVerified),
            balance: Number(d.balance ?? 0),
            totalDeposited: Number(d.totalDeposited ?? 0),
            totalWithdrawn: Number(d.totalWithdrawn ?? 0),
            gamesPlayed: Number(d.gamesPlayed ?? 0),
            authMethod: 'google',
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      }
    );

    const txQuery = query(
      collection(db, 'users', uid, 'transactions'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(60)
    );
    const unsubTx = onSnapshot(
      txQuery,
      (snap) => {
        const list: WalletTransaction[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: d.id,
            userId: d.userId,
            type: d.type,
            amount: Number(d.amount ?? 0),
            method: d.method,
            reference: d.reference,
            gameName: d.gameName,
            status: d.status,
            balanceAfter: Number(d.balanceAfter ?? 0),
            createdAt: formatTimestamp(d.createdAt),
          };
        });
        setTransactions(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${uid}/transactions`);
      }
    );

    const rndQuery = query(
      collection(db, 'users', uid, 'gameRounds'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(40)
    );
    const unsubRounds = onSnapshot(
      rndQuery,
      (snap) => {
        const list: GameRound[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: d.id,
            userId: d.userId,
            gameId: d.gameId,
            variant: d.variant,
            betAmount: Number(d.betAmount ?? 0),
            payout: Number(d.payout ?? 0),
            outcome: d.outcome,
            summary: d.summary,
            createdAt: formatTimestamp(d.createdAt),
          };
        });
        setGameRounds(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${uid}/gameRounds`);
      }
    );

    return () => {
      unsubProfile();
      unsubTx();
      unsubRounds();
    };
  }, [firebaseUser]);

  const sendPhoneOtp = useCallback(
    async (phone: string, name?: string) => {
      try {
        const res = await fetch('/api/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, name }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error || 'Failed to send OTP.' };
        }
        if (data.previewOtp && data.phone) {
          pushSmsToast(data.phone, data.previewOtp);
        }
        return { success: true, phone: data.phone, otp: data.previewOtp };
      } catch {
        return { success: false, error: 'Network error while sending OTP.' };
      }
    },
    [pushSmsToast]
  );

  const verifyPhoneOtp = useCallback(async (phone: string, otp: string, name?: string) => {
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, name }),
      });
      const data = await res.json();
      if (!res.ok || !data.user) {
        return { success: false, error: data.error || 'OTP verification failed.' };
      }
      localStorage.setItem(LOCAL_PHONE_UID_KEY, data.user.uid);
      setUser({
        uid: data.user.uid,
        displayName: data.user.displayName,
        phone: data.user.phone,
        phoneVerified: true,
        balance: Number(data.user.balance ?? 0),
        totalDeposited: Number(data.user.totalDeposited ?? 0),
        totalWithdrawn: Number(data.user.totalWithdrawn ?? 0),
        gamesPlayed: Number(data.user.gamesPlayed ?? 0),
        authMethod: 'phone_otp',
      });
      setTransactions(data.user.transactions ?? []);
      setGameRounds(data.user.gameRounds ?? []);
      setAuthModalOpen(false);
      soundFx.win();
      return { success: true };
    } catch {
      return { success: false, error: 'Network error verifying OTP.' };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setAuthModalOpen(false);
      soundFx.win();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      return { success: false, error: msg };
    }
  }, []);

  const verifyPhoneForSignedInUser = useCallback(
    async (phone: string, otp: string) => {
      if (!firebaseUser) return { success: false, error: 'Not signed in with Google.' };
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'OTP verification failed.' };
      }
      const userRef = doc(db, 'users', firebaseUser.uid);
      try {
        await updateDoc(userRef, {
          phone: phone.slice(0, 20),
          phoneVerified: true,
          updatedAt: serverTimestamp(),
        });
        return { success: true };
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
      }
    },
    [firebaseUser]
  );

  const logout = useCallback(async () => {
    localStorage.removeItem(LOCAL_PHONE_UID_KEY);
    if (firebaseUser) {
      await signOut(auth);
    }
    setUser(null);
    setTransactions([]);
    setGameRounds([]);
  }, [firebaseUser]);

  const deposit = useCallback(
    async (amount: number, method: string, reference: string) => {
      if (!user) {
        setAuthModalOpen(true);
        return { success: false, error: 'Please login first to deposit.' };
      }
      if (amount < 10 || amount > 500000) {
        return { success: false, error: 'Deposit amount must be between ₹10 and ₹5,00,000.' };
      }

      if (user.authMethod === 'google' && firebaseUser) {
        const newBal = Math.round((user.balance + amount) * 100) / 100;
        const newTotalDep = Math.round((user.totalDeposited + amount) * 100) / 100;
        const txId = `tx_dep_${Date.now()}`;
        const cleanRef = (reference || `UTR${Date.now().toString().slice(-8)}`).slice(0, 120);
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            balance: newBal,
            totalDeposited: newTotalDep,
            updatedAt: serverTimestamp(),
          });
          await setDoc(doc(db, 'users', user.uid, 'transactions', txId), {
            id: txId,
            userId: user.uid,
            type: 'deposit',
            amount,
            method: method.slice(0, 60),
            reference: cleanRef,
            status: 'completed',
            balanceAfter: newBal,
            createdAt: serverTimestamp(),
          });
          soundFx.cashout();
          return {
            success: true,
            tx: {
              id: txId,
              userId: user.uid,
              type: 'deposit',
              amount,
              method,
              reference: cleanRef,
              status: 'completed',
              balanceAfter: newBal,
              createdAt: new Date().toISOString(),
            },
          };
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/transactions/${txId}`);
        }
      }

      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, amount, method, reference }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Deposit failed.' };
      }
      setUser((prev) =>
        prev
          ? {
              ...prev,
              balance: data.user.balance,
              totalDeposited: data.user.totalDeposited,
            }
          : prev
      );
      setTransactions(data.user.transactions ?? []);
      soundFx.cashout();
      return { success: true, tx: data.transaction };
    },
    [user, firebaseUser]
  );

  const withdraw = useCallback(
    async (amount: number, method: string, destination: string) => {
      if (!user) {
        setAuthModalOpen(true);
        return { success: false, error: 'Please login first to withdraw.' };
      }
      if (amount < 10) {
        return { success: false, error: 'Minimum withdrawal is ₹10.' };
      }
      if (user.balance < amount) {
        return { success: false, error: 'Insufficient wallet balance.' };
      }
      if (!destination.trim()) {
        return { success: false, error: 'Enter UPI ID or Bank Account details.' };
      }

      if (user.authMethod === 'google' && firebaseUser) {
        const newBal = Math.round((user.balance - amount) * 100) / 100;
        const newTotalW = Math.round((user.totalWithdrawn + amount) * 100) / 100;
        const txId = `tx_wd_${Date.now()}`;
        const cleanRef = `${method}: ${destination}`.slice(0, 120);
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            balance: newBal,
            totalWithdrawn: newTotalW,
            updatedAt: serverTimestamp(),
          });
          await setDoc(doc(db, 'users', user.uid, 'transactions', txId), {
            id: txId,
            userId: user.uid,
            type: 'withdraw',
            amount,
            method: method.slice(0, 60),
            reference: cleanRef,
            status: 'completed',
            balanceAfter: newBal,
            createdAt: serverTimestamp(),
          });
          soundFx.cashout();
          return {
            success: true,
            tx: {
              id: txId,
              userId: user.uid,
              type: 'withdraw',
              amount,
              method,
              reference: cleanRef,
              status: 'completed',
              balanceAfter: newBal,
              createdAt: new Date().toISOString(),
            },
          };
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/transactions/${txId}`);
        }
      }

      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, amount, method, destination }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Withdrawal failed.' };
      }
      setUser((prev) =>
        prev
          ? {
              ...prev,
              balance: data.user.balance,
              totalWithdrawn: data.user.totalWithdrawn,
            }
          : prev
      );
      setTransactions(data.user.transactions ?? []);
      soundFx.cashout();
      return { success: true, tx: data.transaction };
    },
    [user, firebaseUser]
  );

  const settleGameRound = useCallback(
    async (params: {
      gameId: string;
      variant: string;
      betAmount: number;
      payout: number;
      outcome: 'win' | 'loss' | 'draw';
      summary: string;
    }) => {
      if (!user) {
        setAuthModalOpen(true);
        return false;
      }
      const netDelta = params.payout - params.betAmount;
      if (user.balance + netDelta < 0) {
        return false;
      }

      if (user.authMethod === 'google' && firebaseUser) {
        const newBal = Math.round((user.balance + netDelta) * 100) / 100;
        const roundId = `rnd_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`;
        const txId = `tx_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`;
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            balance: newBal,
            gamesPlayed: user.gamesPlayed + 1,
            updatedAt: serverTimestamp(),
          });
          await setDoc(doc(db, 'users', user.uid, 'gameRounds', roundId), {
            id: roundId,
            userId: user.uid,
            gameId: params.gameId.slice(0, 40),
            variant: params.variant.slice(0, 60),
            betAmount: params.betAmount,
            payout: params.payout,
            outcome: params.outcome,
            summary: params.summary.slice(0, 160),
            createdAt: serverTimestamp(),
          });
          if (params.payout > 0 || params.betAmount > 0) {
            await setDoc(doc(db, 'users', user.uid, 'transactions', txId), {
              id: txId,
              userId: user.uid,
              type: params.payout > 0 ? 'win' : 'bet',
              amount: params.payout > 0 ? params.payout : params.betAmount,
              method: params.variant.slice(0, 60),
              reference: params.summary.slice(0, 120),
              gameName: params.gameId.slice(0, 60),
              status: 'completed',
              balanceAfter: newBal,
              createdAt: serverTimestamp(),
            });
          }
          return true;
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/gameRounds/${roundId}`);
        }
      }

      const res = await fetch('/api/games/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, ...params }),
      });
      const data = await res.json();
      if (!res.ok) return false;

      setUser((prev) =>
        prev
          ? {
              ...prev,
              balance: data.user.balance,
              gamesPlayed: data.user.gamesPlayed,
            }
          : prev
      );
      setTransactions(data.user.transactions ?? []);
      setGameRounds(data.user.gameRounds ?? []);
      return true;
    },
    [user, firebaseUser]
  );

  const canAfford = useCallback(
    (amount: number) => {
      if (!user) return false;
      return user.balance >= amount && amount > 0;
    },
    [user]
  );

  return (
    <WalletContext.Provider
      value={{
        user,
        authReady,
        transactions,
        gameRounds,
        smsToasts,
        dismissSmsToast,
        sendPhoneOtp,
        verifyPhoneOtp,
        signInWithGoogle,
        verifyPhoneForSignedInUser,
        logout,
        deposit,
        withdraw,
        settleGameRound,
        canAfford,
        authModalOpen,
        setAuthModalOpen,
        walletModalTab,
        setWalletModalTab,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWallet must be used inside WalletProvider');
  }
  return ctx;
}
