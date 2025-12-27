import cron from 'node-cron';
import pino from 'pino';
import { config } from '../config/env';
import { runWeeklyPayouts } from '../services/payoutOrchestrator';

export function scheduleWeeklyPayout(logger: pino.Logger): void {
  if (!config.enableWeeklyPayoutCron) {
    logger.info('Weekly payout cron disabled');
    return;
  }

  cron.schedule(config.weeklyPayoutCron, async () => {
    logger.info({ cron: config.weeklyPayoutCron }, 'Weekly payout cron started');
    try {
      const results = await runWeeklyPayouts();
      logger.info({ payouts: results }, 'Weekly payout cron finished');
    } catch (err: any) {
      logger.error({ err }, 'Weekly payout cron failed');
    }
  });

  logger.info({ cron: config.weeklyPayoutCron }, 'Weekly payout cron scheduled');
}
