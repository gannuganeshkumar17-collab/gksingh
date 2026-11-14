import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';

interface OtpEntry {
  otp: string;
  name: string;
  phone: string;
  expiresAt: number;
}

interface StoredTransaction {
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

interface StoredRound {
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

interface StoredUser {
  uid: string;
  displayName: string;
  phone: string;
  phoneVerified: boolean;
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  gamesPlayed: number;
  createdAt: string;
  updatedAt: string;
  transactions: StoredTransaction[];
  gameRounds: StoredRound[];
}

interface DbShape {
  users: Record<string, StoredUser>;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'club_db.json');

function ensureDb(): DbShape {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial: DbShape = { users: {} };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as DbShape;
    return parsed && parsed.users ? parsed : { users: {} };
  } catch {
    return { users: {} };
  }
}

function saveDb(db: DbShape) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

const otpStore = new Map<string, OtpEntry>();

function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  return digits.startsWith('+') ? digits : `+${digits}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/otp/send', (req, res) => {
    const rawPhone = String(req.body?.phone ?? '');
    const rawName = String(req.body?.name ?? '').trim();
    const digits = rawPhone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) {
      res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
      return;
    }

    const phone = normalizePhone(digits);
    const otp = String(crypto.randomInt(100000, 999999));
    const expiresAt = Date.now() + 5 * 60 * 1000;

    otpStore.set(phone, {
      otp,
      name: rawName || 'Player',
      phone,
      expiresAt,
    });

    res.json({
      success: true,
      phone,
      expiresInSeconds: 300,
      previewOtp: otp,
      message: `OTP sent to ${phone}`,
    });
  });

  app.post('/api/otp/verify', (req, res) => {
    const rawPhone = String(req.body?.phone ?? '');
    const otp = String(req.body?.otp ?? '').trim();
    const rawName = String(req.body?.name ?? '').trim();
    const phone = normalizePhone(rawPhone);

    const record = otpStore.get(phone);
    if (!record) {
      res.status(400).json({ error: 'No active OTP found. Please request a new OTP.' });
      return;
    }
    if (Date.now() > record.expiresAt) {
      otpStore.delete(phone);
      res.status(400).json({ error: 'OTP expired. Please request a new OTP.' });
      return;
    }
    if (record.otp !== otp) {
      res.status(400).json({ error: 'Incorrect OTP code. Please check your SMS notification.' });
      return;
    }

    otpStore.delete(phone);

    const db = ensureDb();
    const uid = `mob_${phone.replace(/\D/g, '')}`;
    const now = new Date().toISOString();

    let user = db.users[uid];
    if (!user) {
      const displayName = rawName || record.name || `Player ${phone.slice(-4)}`;
      user = {
        uid,
        displayName,
        phone,
        phoneVerified: true,
        balance: 10,
        totalDeposited: 0,
        totalWithdrawn: 0,
        gamesPlayed: 0,
        createdAt: now,
        updatedAt: now,
        transactions: [
          {
            id: `tx_${Date.now()}`,
            userId: uid,
            type: 'deposit',
            amount: 10,
            method: 'Signup Balance',
            reference: 'JOINING-10',
            status: 'completed',
            balanceAfter: 10,
            createdAt: now,
          },
        ],
        gameRounds: [],
      };
      db.users[uid] = user;
      saveDb(db);
    } else if (rawName && rawName !== 'Player') {
      user.displayName = rawName;
      user.updatedAt = now;
      saveDb(db);
    }

    res.json({ success: true, user });
  });

  app.get('/api/user/:uid', (req, res) => {
    const db = ensureDb();
    const user = db.users[req.params.uid];
    if (!user) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    res.json({ user });
  });

  app.post('/api/wallet/deposit', (req, res) => {
    const uid = String(req.body?.uid ?? '');
    const amount = Number(req.body?.amount ?? 0);
    const method = String(req.body?.method ?? 'UPI');
    const reference = String(req.body?.reference ?? `UTR${Date.now().toString().slice(-8)}`);

    if (!uid || !Number.isFinite(amount) || amount < 10 || amount > 500000) {
      res.status(400).json({ error: 'Invalid deposit amount (₹10 - ₹5,00,000).' });
      return;
    }

    const db = ensureDb();
    const user = db.users[uid];
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const now = new Date().toISOString();
    user.balance = Math.round((user.balance + amount) * 100) / 100;
    user.totalDeposited = Math.round((user.totalDeposited + amount) * 100) / 100;
    user.updatedAt = now;

    const tx: StoredTransaction = {
      id: `tx_${Date.now()}_${crypto.randomInt(100, 999)}`,
      userId: uid,
      type: 'deposit',
      amount,
      method,
      reference,
      status: 'completed',
      balanceAfter: user.balance,
      createdAt: now,
    };
    user.transactions = [tx, ...user.transactions].slice(0, 100);
    saveDb(db);

    res.json({ success: true, user, transaction: tx });
  });

  app.post('/api/wallet/withdraw', (req, res) => {
    const uid = String(req.body?.uid ?? '');
    const amount = Number(req.body?.amount ?? 0);
    const method = String(req.body?.method ?? 'UPI');
    const destination = String(req.body?.destination ?? '');

    if (!uid || !Number.isFinite(amount) || amount < 10) {
      res.status(400).json({ error: 'Minimum withdrawal is ₹10.' });
      return;
    }
    if (!destination.trim()) {
      res.status(400).json({ error: 'Please enter a valid UPI ID or Bank Account.' });
      return;
    }

    const db = ensureDb();
    const user = db.users[uid];
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (user.balance < amount) {
      res.status(400).json({ error: 'Insufficient wallet balance.' });
      return;
    }

    const now = new Date().toISOString();
    user.balance = Math.round((user.balance - amount) * 100) / 100;
    user.totalWithdrawn = Math.round((user.totalWithdrawn + amount) * 100) / 100;
    user.updatedAt = now;

    const tx: StoredTransaction = {
      id: `tx_${Date.now()}_${crypto.randomInt(100, 999)}`,
      userId: uid,
      type: 'withdraw',
      amount,
      method,
      reference: `${method}: ${destination.slice(0, 48)}`,
      status: 'completed',
      balanceAfter: user.balance,
      createdAt: now,
    };
    user.transactions = [tx, ...user.transactions].slice(0, 100);
    saveDb(db);

    res.json({ success: true, user, transaction: tx });
  });

  app.post('/api/games/settle', (req, res) => {
    const uid = String(req.body?.uid ?? '');
    const gameId = String(req.body?.gameId ?? '');
    const variant = String(req.body?.variant ?? '');
    const betAmount = Number(req.body?.betAmount ?? 0);
    const payout = Number(req.body?.payout ?? 0);
    const outcome = (req.body?.outcome ?? 'loss') as 'win' | 'loss' | 'draw';
    const summary = String(req.body?.summary ?? 'Round completed').slice(0, 160);

    const db = ensureDb();
    const user = db.users[uid];
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const now = new Date().toISOString();
    const netDelta = payout - betAmount;
    if (user.balance + netDelta < 0) {
      res.status(400).json({ error: 'Insufficient balance for bet.' });
      return;
    }

    user.balance = Math.round((user.balance + netDelta) * 100) / 100;
    user.gamesPlayed += 1;
    user.updatedAt = now;

    const round: StoredRound = {
      id: `rnd_${Date.now()}_${crypto.randomInt(100, 999)}`,
      userId: uid,
      gameId,
      variant,
      betAmount,
      payout,
      outcome,
      summary,
      createdAt: now,
    };
    user.gameRounds = [round, ...user.gameRounds].slice(0, 80);

    if (payout > 0) {
      const winTx: StoredTransaction = {
        id: `tx_${Date.now()}_${crypto.randomInt(100, 999)}`,
        userId: uid,
        type: 'win',
        amount: payout,
        method: variant || gameId,
        reference: summary.slice(0, 60),
        gameName: gameId,
        status: 'completed',
        balanceAfter: user.balance,
        createdAt: now,
      };
      user.transactions = [winTx, ...user.transactions].slice(0, 100);
    } else if (betAmount > 0) {
      const betTx: StoredTransaction = {
        id: `tx_${Date.now()}_${crypto.randomInt(100, 999)}`,
        userId: uid,
        type: 'bet',
        amount: betAmount,
        method: variant || gameId,
        reference: summary.slice(0, 60),
        gameName: gameId,
        status: 'completed',
        balanceAfter: user.balance,
        createdAt: now,
      };
      user.transactions = [betTx, ...user.transactions].slice(0, 100);
    }

    saveDb(db);
    res.json({ success: true, user, round });
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('Yono Real Game running on http://0.0.0.0:3000');
  });
}

startServer();
