import { Router } from 'express';
import { pool } from '../db';
import { config } from '../config/env';
import { stripe } from '../services/stripeClient';
import { z, ZodError } from 'zod';

const router = Router();

function parseAmount(value: unknown, field: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Math.round(Number(value));
  }
  throw new Error(`Invalid amount for ${field}`);
}

router.post('/payments/create-intent', async (req, res, next) => {
  try {
    const money = (min: number, allowZero = false) =>
      z.preprocess(
        (val) => (typeof val === 'string' && val.trim() !== '' ? Number(val) : val),
        allowZero ? z.number().min(min) : z.number().gt(min)
      );

    const paymentSchema = z.object({
      tripId: z.preprocess((v) => Number(v), z.number().int().positive()),
      riderId: z.preprocess((v) => Number(v), z.number().int().positive()),
      driverId: z.preprocess((v) => Number(v), z.number().int().positive()),
      passengerTotal: money(0),
      driverGross: money(0),
      platformFee: money(0, true),
      taxAmount: money(0, true),
      tipAmount: money(0, true).default(0),
      currency: z.string().length(3).default(config.defaultCurrency),
      idempotencyKey: z.string().optional(),
      distanceMiles: money(0, true).default(0),
      durationMinutes: money(0, true).default(0)
    });

    const parsed = paymentSchema.parse(req.body);
    const {
      tripId,
      riderId,
      driverId,
      passengerTotal,
      driverGross,
      platformFee,
      taxAmount,
      tipAmount,
      currency,
      idempotencyKey,
      distanceMiles,
      durationMinutes
    } = parsed;

    if (!tripId || !riderId || !driverId) {
      return res.status(400).json({ error: 'tripId, riderId and driverId are required' });
    }

    const passengerTotalCents = parseAmount(passengerTotal, 'passengerTotal');
    const driverGrossCents = parseAmount(driverGross, 'driverGross');
    const platformFeeCents = parseAmount(platformFee, 'platformFee');
    const taxCents = parseAmount(taxAmount, 'taxAmount');
    const tipCents = parseAmount(tipAmount, 'tipAmount');

    if (passengerTotalCents !== driverGrossCents + platformFeeCents + taxCents + tipCents) {
      return res.status(400).json({ error: 'Amounts do not balance to passenger_total' });
    }
    if (passengerTotalCents <= 0) {
      return res.status(400).json({ error: 'Amounts must be > 0' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const driver = await client.query(
        'SELECT stripe_account_id, kyc_status FROM finance.drivers WHERE id = $1',
        [driverId]
      );
      if (!driver.rowCount) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Driver not found' });
      }
      if (driver.rows[0].kyc_status !== 'verified') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Driver KYC not verified' });
      }

      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: passengerTotalCents,
          currency: currency.toLowerCase(),
          automatic_payment_methods: { enabled: true },
          application_fee_amount: platformFeeCents + taxCents,
          transfer_data: {
            destination: driver.rows[0].stripe_account_id,
            amount: driverGrossCents + tipCents
          },
          metadata: {
            trip_id: String(tripId),
            driver_id: String(driverId),
            rider_id: String(riderId),
            passenger_total: String(passengerTotalCents),
            driver_gross: String(driverGrossCents),
            platform_fee: String(platformFeeCents),
            tax_amount: String(taxCents),
            tip_amount: String(tipCents)
          }
        },
        { idempotencyKey: idempotencyKey ?? `trip-${tripId}` }
      );

      await client.query(
        `INSERT INTO finance.trips (id, rider_id, driver_id, status, distance_miles, duration_minutes, started_at, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
         ON CONFLICT (id) DO UPDATE
           SET rider_id = EXCLUDED.rider_id,
               driver_id = EXCLUDED.driver_id,
               status = EXCLUDED.status,
               completed_at = NOW()`,
        [tripId, riderId, driverId, 'completed', Number(distanceMiles ?? 0), Number(durationMinutes ?? 0)]
      );

      await client.query(
        `INSERT INTO finance.trip_charges
          (trip_id, passenger_total, driver_gross, platform_fee, tax_amount, tip_amount, currency, stripe_payment_intent_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (trip_id) DO UPDATE
           SET passenger_total = EXCLUDED.passenger_total,
               driver_gross = EXCLUDED.driver_gross,
               platform_fee = EXCLUDED.platform_fee,
               tax_amount = EXCLUDED.tax_amount,
               tip_amount = EXCLUDED.tip_amount,
               currency = EXCLUDED.currency,
               stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id`,
        [
          tripId,
          passengerTotalCents,
          driverGrossCents,
          platformFeeCents,
          taxCents,
          tipCents,
          currency.toLowerCase(),
          paymentIntent.id
        ]
      );

      await client.query('COMMIT');

      return res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: 'validation_error', details: err.errors });
    }
    next(err);
  }
});

export default router;
