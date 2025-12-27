import { pool } from '../db';
import { createDriverPayout } from './payoutService';

export interface WeeklyPayoutResult {
  driverId: number;
  amount?: number;
  error?: string;
}

async function withAdvisoryLock<T>(key: number, fn: () => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    const gotLock = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [key]);
    if (!gotLock.rows[0]?.locked) {
      throw new Error('Weekly payout already running');
    }
    const result = await fn();
    await client.query('SELECT pg_advisory_unlock($1)', [key]);
    return result;
  } finally {
    client.release();
  }
}

export async function runWeeklyPayouts(): Promise<WeeklyPayoutResult[]> {
  return withAdvisoryLock(42_004_001, async () => {
    const balances = await pool.query(
      `SELECT owner_id AS driver_id, SUM(amount) AS balance
         FROM finance.ledger_entries
        WHERE account_type = 'DRIVER_BALANCE' AND owner_id IS NOT NULL
        GROUP BY owner_id
        HAVING SUM(amount) > 0`
    );

    const results: WeeklyPayoutResult[] = [];

    for (const row of balances.rows) {
      const driverId = Number(row.driver_id);
      const amount = Number(row.balance);
      try {
        const payout = await createDriverPayout(driverId, amount, 'weekly');
        results.push({ driverId, amount: payout.netAmount });
      } catch (err: any) {
        results.push({ driverId, error: err?.message ?? 'Failed to payout' });
      }
    }

    return results;
  });
}
