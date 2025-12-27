import { DbClient, pool } from '../db';

export type LedgerAccountType =
  | 'PASSENGER_CASH'
  | 'DRIVER_BALANCE'
  | 'PLATFORM_REVENUE'
  | 'TAX_PAYABLE'
  | 'ADJUSTMENTS';

export interface LedgerEntryInput {
  account_type: LedgerAccountType;
  owner_id?: number;
  trip_id?: number;
  amount: number;
  currency: string;
  event_type: string;
  external_ref?: string;
}

export async function insertLedgerEntries(entries: LedgerEntryInput[], client?: DbClient): Promise<void> {
  const c = client ?? (await pool.connect());
  const shouldManageTx = !client;
  try {
    if (shouldManageTx) {
      await c.query('BEGIN');
    }
    for (const entry of entries) {
      await c.query(
        `INSERT INTO finance.ledger_entries
          (account_type, owner_id, trip_id, amount, currency, event_type, external_ref)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          entry.account_type,
          entry.owner_id ?? null,
          entry.trip_id ?? null,
          entry.amount,
          entry.currency,
          entry.event_type,
          entry.external_ref ?? null
        ]
      );
    }
    if (shouldManageTx) {
      await c.query('COMMIT');
    }
  } catch (err) {
    if (shouldManageTx) {
      await c.query('ROLLBACK');
    }
    throw err;
  } finally {
    if (shouldManageTx) {
      c.release();
    }
  }
}

export async function getDriverBalance(driverId: number, client?: DbClient): Promise<number> {
  const c = client ?? pool;
  const result = await c.query(
    `SELECT COALESCE(SUM(amount), 0) AS balance
     FROM finance.ledger_entries
     WHERE owner_id = $1 AND account_type = 'DRIVER_BALANCE'`,
    [driverId]
  );
  const balance = result.rows[0]?.balance ?? 0;
  return typeof balance === 'string' ? parseInt(balance, 10) : balance;
}

export async function stripeEventProcessed(eventId: string, client: DbClient): Promise<boolean> {
  const existing = await client.query('SELECT id FROM finance.stripe_events WHERE stripe_event_id = $1', [eventId]);
  return existing.rowCount > 0;
}

export async function markStripeEventProcessed(eventId: string, type: string, client: DbClient): Promise<void> {
  await client.query('INSERT INTO finance.stripe_events (stripe_event_id, type) VALUES ($1,$2)', [eventId, type]);
}
