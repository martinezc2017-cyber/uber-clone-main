import { Router } from 'express';
import bodyParser from 'body-parser';
import { stripe } from '../services/stripeClient';
import { config } from '../config/env';
import { pool } from '../db';
import {
  handleChargeRefunded,
  handlePaymentIntentSucceeded,
  handlePayoutEvent,
  handleTransferEvent,
  handleChargeSucceeded
} from '../services/paymentEvents';
import { markStripeEventProcessed, stripeEventProcessed } from '../services/ledgerService';
import { insertWebhookDlq } from '../services/webhookDlq';

const router = Router();

router.post('/webhooks/stripe', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  if (!signature || typeof signature !== 'string') {
    return res.status(400).send('Missing Stripe signature header');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, config.stripeWebhookSecret);
  } catch (err: any) {
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (await stripeEventProcessed(event.id, client)) {
      await client.query('ROLLBACK');
      return res.json({ received: true, idempotent: true });
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event, client);
        break;
      case 'charge.succeeded':
        await handleChargeSucceeded(event, client);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event, client);
        break;
      case 'payout.paid':
      case 'payout.failed':
        await handlePayoutEvent(event, client);
        break;
      case 'transfer.created':
      case 'transfer.reversed':
        await handleTransferEvent(event, client);
        break;
      default:
        break;
    }

    await markStripeEventProcessed(event.id, event.type, client);
    await client.query('COMMIT');
    return res.json({ received: true });
  } catch (err: any) {
    await client.query('ROLLBACK');
    try {
      await insertWebhookDlq(event?.id ?? 'unknown', event?.type ?? 'unknown', event, err?.message ?? 'Webhook error');
    } catch (dlqErr) {
      // ignore DLQ failures
    }
    return res.status(500).send(err?.message ?? 'Webhook error');
  } finally {
    client.release();
  }
});

export default router;
