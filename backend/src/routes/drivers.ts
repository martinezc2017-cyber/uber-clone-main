import { Router } from 'express';
import { z, ZodError } from 'zod';
import { getDriverBalance } from '../services/ledgerService';
import { createDriverPayout } from '../services/payoutService';

const router = Router();

router.get('/drivers/:id/balance', async (req, res, next) => {
  try {
    const driverId = Number(req.params.id);
    if (!Number.isInteger(driverId)) {
      return res.status(400).json({ error: 'Invalid driver id' });
    }
    const balance = await getDriverBalance(driverId);
    return res.json({ driverId, available: balance });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: 'validation_error', details: err.errors });
    }
    next(err);
  }
});

router.post('/drivers/:id/cashout', async (req, res, next) => {
  try {
    const paramSchema = z.object({ id: z.string().regex(/^\d+$/) });
    const bodySchema = z.object({
      amount: z
        .preprocess((v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v), z.number().positive())
        .optional()
    });
    const { id } = paramSchema.parse(req.params);
    const { amount: requestedAmount } = bodySchema.parse(req.body ?? {});
    const driverId = Number(id);
    const balance = await getDriverBalance(driverId);
    const amount = requestedAmount ?? balance;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'No available balance' });
    }
    if (amount > balance) {
      return res.status(400).json({ error: 'Amount exceeds available balance' });
    }

    const payout = await createDriverPayout(driverId, amount, 'instant');
    return res.json({
      driverId,
      payoutId: payout.payoutRecordId,
      stripePayoutId: payout.stripePayoutId,
      netAmount: payout.netAmount,
      fee: payout.fee
    });
  } catch (err) {
    next(err);
  }
});

export default router;
