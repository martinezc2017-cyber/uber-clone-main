-- One-time helper to backfill finance schema from existing public tables.
-- Assumptions:
--  - public.drivers has first_name, last_name, created_at.
--  - Add columns stripe_account_id, kyc_status if missing.
--  - public.rides stores ride_id, user_id (rider), driver_id, ride_time, fare_price, ride_status, created_at.
--  - Amount breakdown per trip is not reconstructed here; trip_charges must be created from live payments.

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending';

INSERT INTO finance.drivers (id, legal_name, stripe_account_id, kyc_status, created_at)
SELECT d.id,
       CONCAT(d.first_name, ' ', d.last_name) AS legal_name,
       d.stripe_account_id,
       COALESCE(d.kyc_status, 'pending') AS kyc_status,
       COALESCE(d.created_at, NOW())
  FROM public.drivers d
 WHERE d.stripe_account_id IS NOT NULL
ON CONFLICT (id) DO UPDATE
  SET legal_name = EXCLUDED.legal_name,
      stripe_account_id = EXCLUDED.stripe_account_id,
      kyc_status = EXCLUDED.kyc_status;

INSERT INTO finance.trips (id, rider_id, driver_id, status, distance_miles, duration_minutes, started_at, completed_at, created_at)
SELECT r.ride_id,
       r.user_id AS rider_id,
       r.driver_id,
       COALESCE(r.ride_status, 'completed') AS status,
       0 AS distance_miles,
       COALESCE(r.ride_time, 0) AS duration_minutes,
       COALESCE(r.created_at, NOW()),
       COALESCE(r.created_at, NOW()),
       COALESCE(r.created_at, NOW())
  FROM public.rides r
 WHERE r.driver_id IN (SELECT id FROM finance.drivers)
ON CONFLICT (id) DO NOTHING;
