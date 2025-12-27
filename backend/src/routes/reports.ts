import { Router } from 'express';
import { pool } from '../db';
import { getDriverBalance } from '../services/ledgerService';

const router = Router();

router.get('/reports/driver/:id', async (req, res, next) => {
  try {
    const driverId = Number(req.params.id);
    if (!Number.isInteger(driverId)) {
      return res.status(400).json({ error: 'Invalid driver id' });
    }
    const year =
      req.query.year && !Number.isNaN(Number(req.query.year))
        ? Number(req.query.year)
        : new Date().getFullYear();

    const earnings = await pool.query(
      `SELECT
          COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS gross_earnings,
          COALESCE(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END), 0) AS debits
         FROM finance.ledger_entries
        WHERE owner_id = $1
          AND account_type = 'DRIVER_BALANCE'
          AND date_part('year', created_at) = $2`,
      [driverId, year]
    );

    const fees = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS instant_fees
         FROM finance.ledger_entries
        WHERE owner_id = $1
          AND event_type = 'INSTANT_PAYOUT_FEE'
          AND date_part('year', created_at) = $2`,
      [driverId, year]
    );

    const payouts = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS gross_requested
         FROM finance.payouts
        WHERE driver_id = $1
          AND status = 'paid'
          AND date_part('year', created_at) = $2`,
      [driverId, year]
    );

    const balance = await getDriverBalance(driverId);

    return res.json({
      driverId,
      year,
      grossEarnings: Number(earnings.rows[0].gross_earnings),
      payoutsRequested: Number(payouts.rows[0].gross_requested),
      instantFees: Number(fees.rows[0].instant_fees),
      netPosition: Number(earnings.rows[0].gross_earnings) + Number(earnings.rows[0].debits),
      currentBalance: balance
    });
  } catch (err) {
    next(err);
  }
});

router.get('/reports/1099-preview', async (req, res, next) => {
  try {
    const year =
      req.query.year && !Number.isNaN(Number(req.query.year))
        ? Number(req.query.year)
        : new Date().getFullYear();

    const rows = await pool.query(
      `SELECT
          d.id AS driver_id,
          d.legal_name,
          COALESCE(SUM(CASE WHEN le.account_type = 'DRIVER_BALANCE' AND le.amount > 0 THEN le.amount ELSE 0 END), 0) AS gross_earnings,
          COALESCE(SUM(CASE WHEN le.account_type = 'DRIVER_BALANCE' AND le.amount < 0 THEN le.amount ELSE 0 END), 0) AS payouts_and_adjustments,
          COALESCE(SUM(CASE WHEN le.event_type = 'INSTANT_PAYOUT_FEE' THEN le.amount ELSE 0 END), 0) AS fees
        FROM finance.drivers d
        LEFT JOIN finance.ledger_entries le
          ON le.owner_id = d.id
         AND date_part('year', le.created_at) = $1
        GROUP BY d.id, d.legal_name
        ORDER BY d.id`,
      [year]
    );

    return res.json({
      year,
      drivers: rows.rows.map((r) => ({
        driverId: r.driver_id,
        legalName: r.legal_name,
        grossEarnings: Number(r.gross_earnings),
        payoutsAndAdjustments: Number(r.payouts_and_adjustments),
        instantFees: Number(r.fees),
        1099NECReportable: Number(r.gross_earnings)
      }))
    });
  } catch (err) {
    next(err);
  }
});

export default router;
