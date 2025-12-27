import { DbClient, pool } from '../db';
import { config } from '../config/env';
import { insertLedgerEntries } from './ledgerService';
import { stripe } from './stripeClient';

interface PayoutResult {
  payoutRecordId: number;
  stripePayoutId: string;
  netAmount: number;
  fee: number;
}

export async function getDriverStripeAccount(driverId: number, client?: DbClient): Promise<{
  stripe_account_id: string;
  kyc_status: string;
}> {
  const c = client ?? pool;
  const driver = await c.query(
    'SELECT stripe_account_id, kyc_status FROM finance.drivers WHERE id = $1',
    [driverId]
  );
  if (!driver.rowCount) {
    throw new Error(`Driver ${driverId} not found`);
  }
  return driver.rows[0];
}

export async function createDriverPayout(
  driverId: number,
  grossAmount: number,
  type: 'weekly' | 'instant',
  client?: DbClient
): Promise<PayoutResult> {
  const c = client ?? (await pool.connect());
  const manageTx = !client;
  try {
    if (manageTx) {
      await c.query('BEGIN');
    }

    const driver = await getDriverStripeAccount(driverId, c);
    if (driver.kyc_status !== 'verified') {
      throw new Error('Driver KYC is not verified');
    }
    if (grossAmount <= 0) {
      throw new Error('Payout amount must be > 0');
    }

    const fee =
      type === 'instant'
        ? Math.ceil((grossAmount * config.instantPayoutFeeBps) / 10000)
        : 0;
    const netAmount = grossAmount - fee;
    if (netAmount <= 0) {
      throw new Error('Net amount after fees must be > 0');
    }

    const payout = await stripe.payouts.create(
      {
        amount: netAmount,
        currency: config.defaultCurrency,
        method: type === 'instant' ? 'instant' : 'standard',
        metadata: {
          driver_id: String(driverId),
          payout_type: type
        }
      },
      { stripeAccount: driver.stripe_account_id }
    );

    const payoutRow = await c.query(
      `INSERT INTO finance.payouts
        (driver_id, amount, payout_type, stripe_payout_id, status, currency)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id`,
      [driverId, grossAmount, type, payout.id, 'processing', config.defaultCurrency]
    );

    await insertLedgerEntries(
      [
        {
          account_type: 'DRIVER_BALANCE',
          owner_id: driverId,
          amount: -grossAmount,
          currency: config.defaultCurrency,
          event_type: type === 'instant' ? 'PAYOUT_INSTANT' : 'PAYOUT_WEEKLY',
          external_ref: payout.id
        },
        {
          account_type: 'PLATFORM_REVENUE',
          owner_id: driverId,
          amount: fee,
          currency: config.defaultCurrency,
          event_type: 'INSTANT_PAYOUT_FEE',
          external_ref: payout.id
        }
      ],
      c
    );

    if (manageTx) {
      await c.query('COMMIT');
    }

    return {
      payoutRecordId: payoutRow.rows[0].id,
      stripePayoutId: payout.id,
      netAmount,
      fee
    };
  } catch (err) {
    if (manageTx) {
      await c.query('ROLLBACK');
    }
    throw err;
  } finally {
    if (manageTx) {
      c.release();
    }
  }
}
