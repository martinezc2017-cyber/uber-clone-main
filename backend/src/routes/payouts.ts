import { Router } from 'express';
import { createDriverPayout } from '../services/payoutService';
import { runWeeklyPayouts } from '../services/payoutOrchestrator';

const router = Router();

router.post('/payouts/run-weekly', async (_req, res, next) => {
  try {
    const payouts = await runWeeklyPayouts();
    return res.json({ payouts });
  } catch (err) {
    next(err);
  }
});

export default router;
