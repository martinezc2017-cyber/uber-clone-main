import Stripe from 'stripe';
import { DbClient } from '../db';
import { config } from '../config/env';
import { insertLedgerEntries } from './ledgerService';
import { stripe } from './stripeClient';

export async function handlePaymentIntentSucceeded(event: Stripe.Event, client: DbClient): Promise<void> {
  const pi = event.data.object as Stripe.PaymentIntent;
  const currency = (pi.currency ?? config.defaultCurrency).toLowerCase();
  const tripIdFromMeta = pi.metadata?.trip_id ? Number(pi.metadata.trip_id) : undefined;
  const driverIdFromMeta = pi.metadata?.driver_id ? Number(pi.metadata.driver_id) : undefined;
  const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.charges?.data?.[0]?.id;

  const chargeRow = await client.query(
    `SELECT tc.*, t.driver_id AS trip_driver
       FROM finance.trip_charges tc
       LEFT JOIN finance.trips t ON tc.trip_id = t.id
      WHERE tc.stripe_payment_intent_id = $1
         OR (tc.trip_id IS NOT NULL AND tc.trip_id = $2)`,
    [pi.id, tripIdFromMeta ?? null]
  );

  if (!chargeRow.rowCount) {
    throw new Error(`trip_charges not found for payment_intent ${pi.id}`);
  }

  const row = chargeRow.rows[0];
  const driverId = driverIdFromMeta ?? row.trip_driver;
  const driverAmount = Number(row.driver_gross) + Number(row.tip_amount);
  const total = Number(row.passenger_total);
  const platformFee = Number(row.platform_fee);
  const taxAmount = Number(row.tax_amount);

  await client.query(
    `UPDATE finance.trip_charges
        SET stripe_payment_intent_id = $1,
            stripe_charge_id = COALESCE(stripe_charge_id, $2)
      WHERE id = $3`,
    [pi.id, chargeId ?? null, row.id]
  );

  await client.query('UPDATE finance.trips SET status = $1, completed_at = COALESCE(completed_at, NOW()) WHERE id = $2', [
    'completed',
    row.trip_id
  ]);

  await insertLedgerEntries(
    [
      {
        account_type: 'PASSENGER_CASH',
        amount: total,
        currency,
        trip_id: row.trip_id,
        event_type: 'PAYMENT_INTENT_SUCCEEDED',
        external_ref: pi.id
      },
      {
        account_type: 'DRIVER_BALANCE',
        owner_id: driverId,
        amount: driverAmount,
        currency,
        trip_id: row.trip_id,
        event_type: 'TRIP_DRIVER_EARNING',
        external_ref: pi.id
      },
      {
        account_type: 'PLATFORM_REVENUE',
        amount: platformFee,
        currency,
        trip_id: row.trip_id,
        event_type: 'PLATFORM_FEE',
        external_ref: pi.id
      },
      {
        account_type: 'TAX_PAYABLE',
        amount: taxAmount,
        currency,
        trip_id: row.trip_id,
        event_type: 'TAX',
        external_ref: pi.id
      }
    ],
    client
  );
}

export async function handleChargeRefunded(event: Stripe.Event, client: DbClient): Promise<void> {
  const charge = event.data.object as Stripe.Charge;
  const currency = (charge.currency ?? config.defaultCurrency).toLowerCase();
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id ?? null;

  const chargeRow = await client.query(
    `SELECT tc.*, t.driver_id AS trip_driver
       FROM finance.trip_charges tc
       LEFT JOIN finance.trips t ON tc.trip_id = t.id
      WHERE tc.stripe_payment_intent_id = $1
         OR tc.stripe_charge_id = $2`,
    [paymentIntentId, charge.id]
  );

  if (!chargeRow.rowCount) {
    throw new Error(`trip_charges not found for refund charge ${charge.id}`);
  }

  const row = chargeRow.rows[0];
  const driverId = row.trip_driver;
  const originalTotal = Number(charge.amount);

  for (const refund of charge.refunds?.data ?? []) {
    const existing = await client.query(
      'SELECT 1 FROM finance.ledger_entries WHERE external_ref = $1 AND event_type = $2',
      [refund.id, 'REFUND']
    );
    if (existing.rowCount) {
      continue;
    }
    const ratio = refund.amount / originalTotal;
    const total = refund.amount;
    const driverAmount = Math.round((Number(row.driver_gross) + Number(row.tip_amount)) * ratio);
    const platformFee = Math.round(Number(row.platform_fee) * ratio);
    const taxAmount = Math.round(Number(row.tax_amount) * ratio);

    await insertLedgerEntries(
      [
        {
          account_type: 'PASSENGER_CASH',
          amount: -total,
          currency,
          trip_id: row.trip_id,
          event_type: 'REFUND',
          external_ref: refund.id
        },
        {
          account_type: 'DRIVER_BALANCE',
          owner_id: driverId,
          amount: -driverAmount,
          currency,
          trip_id: row.trip_id,
          event_type: 'REFUND',
          external_ref: refund.id
        },
        {
          account_type: 'PLATFORM_REVENUE',
          amount: -platformFee,
          currency,
          trip_id: row.trip_id,
          event_type: 'REFUND',
          external_ref: refund.id
        },
        {
          account_type: 'TAX_PAYABLE',
          amount: -taxAmount,
          currency,
          trip_id: row.trip_id,
          event_type: 'REFUND',
          external_ref: refund.id
        }
      ],
      client
    );
  }
}

export async function handleChargeSucceeded(event: Stripe.Event, client: DbClient): Promise<void> {
  const charge = event.data.object as Stripe.Charge;
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id ?? null;

  if (!paymentIntentId) {
    throw new Error(`charge ${charge.id} missing payment_intent`);
  }

  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  const piEvent = { ...event, data: { object: pi } } as Stripe.Event;
  await handlePaymentIntentSucceeded(piEvent, client);
}

export async function handlePayoutEvent(event: Stripe.Event, client: DbClient): Promise<void> {
  const payout = event.data.object as Stripe.Payout;
  const status = event.type === 'payout.paid' ? 'paid' : 'failed';
  const payoutRow = await client.query(
    'SELECT id, driver_id, amount FROM finance.payouts WHERE stripe_payout_id = $1',
    [payout.id]
  );

  if (!payoutRow.rowCount) {
    // Unknown payout but keep audit trail.
    await insertLedgerEntries(
      [
        {
          account_type: 'ADJUSTMENTS',
          amount: event.type === 'payout.failed' ? payout.amount : -payout.amount,
          currency: (payout.currency ?? config.defaultCurrency).toLowerCase(),
          event_type: 'UNMATCHED_PAYOUT',
          external_ref: payout.id
        }
      ],
      client
    );
    return;
  }

  const row = payoutRow.rows[0];
  await client.query('UPDATE finance.payouts SET status = $1 WHERE id = $2', [status, row.id]);

  if (status === 'failed') {
    const existing = await client.query(
      'SELECT 1 FROM finance.ledger_entries WHERE external_ref = $1 AND event_type = $2',
      [payout.id, 'PAYOUT_FAILED_REVERSAL']
    );
    if (!existing.rowCount) {
      await insertLedgerEntries(
        [
          {
            account_type: 'DRIVER_BALANCE',
            owner_id: row.driver_id,
            amount: row.amount,
            currency: (payout.currency ?? config.defaultCurrency).toLowerCase(),
            event_type: 'PAYOUT_FAILED_REVERSAL',
            external_ref: payout.id
          }
        ],
        client
      );
    }
  }
}

export async function handleTransferEvent(event: Stripe.Event, client: DbClient): Promise<void> {
  const transfer = event.data.object as Stripe.Transfer;
  const currency = (transfer.currency ?? config.defaultCurrency).toLowerCase();
  const driverId = transfer.metadata?.driver_id ? Number(transfer.metadata.driver_id) : undefined;
  const amount = transfer.amount;
  const direction = event.type === 'transfer.reversed' ? 1 : -1;
  const eventType = event.type === 'transfer.reversed' ? 'TRANSFER_REVERSED' : 'TRANSFER_CREATED';

  await insertLedgerEntries(
    [
      {
        account_type: 'PASSENGER_CASH',
        amount: direction * amount,
        currency,
        event_type: eventType,
        external_ref: transfer.id
      },
      {
        account_type: driverId ? 'DRIVER_BALANCE' : 'ADJUSTMENTS',
        owner_id: driverId,
        amount: direction * amount,
        currency,
        event_type: eventType,
        external_ref: transfer.id
      }
    ],
    client
  );
}
