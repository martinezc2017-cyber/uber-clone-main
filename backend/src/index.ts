import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { config } from './config/env';
import paymentsRouter from './routes/payments';
import webhookRouter from './routes/webhooks';
import driversRouter from './routes/drivers';
import payoutsRouter from './routes/payouts';
import reportsRouter from './routes/reports';
import { apiKeyGuard } from './middleware/auth';
import { requestLogger } from './middleware/requestId';
import { scheduleWeeklyPayout } from './jobs/weeklyPayout';

const app = express();

app.use(requestLogger);

// Webhooks must see the raw body to validate signatures.
app.use(webhookRouter);

app.use(cors());
app.use(bodyParser.json());
app.use(apiKeyGuard);

app.use(paymentsRouter);
app.use(driversRouter);
app.use(payoutsRouter);
app.use(reportsRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  requestLogger.logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'internal_error', message: err?.message ?? 'Unexpected error' });
});

app.listen(config.port, () => {
  requestLogger.logger.info({ port: config.port }, 'Finance service listening');
});

scheduleWeeklyPayout(requestLogger.logger);
