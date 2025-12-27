import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  databaseUrl: requireEnv('DATABASE_URL'),
  stripeSecretKey: requireEnv('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: requireEnv('STRIPE_WEBHOOK_SECRET'),
  platformFeeBps: parseInt(process.env.PLATFORM_FEE_BPS ?? '2000', 10),
  instantPayoutFeeBps: parseInt(process.env.INSTANT_PAYOUT_FEE_BPS ?? '150', 10),
  defaultCurrency: process.env.DEFAULT_CURRENCY ?? 'usd',
  financeApiKey: process.env.FINANCE_API_KEY,
  enableWeeklyPayoutCron: (process.env.ENABLE_WEEKLY_PAYOUT_CRON ?? 'false').toLowerCase() === 'true',
  weeklyPayoutCron: process.env.WEEKLY_PAYOUT_CRON ?? '0 9 * * 1'
};
