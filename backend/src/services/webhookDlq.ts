import { pool } from '../db';

export async function insertWebhookDlq(eventId: string, type: string, payload: any, errorMessage: string): Promise<void> {
  await pool.query(
    `INSERT INTO finance.stripe_webhook_dlq (stripe_event_id, type, payload, error_message)
     VALUES ($1, $2, $3, $4)`,
    [eventId, type, payload, errorMessage]
  );
}
