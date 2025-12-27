-- Finance schema for rideshare marketplace (Stripe Connect + ledger)
CREATE SCHEMA IF NOT EXISTS finance;
SET search_path TO finance;

-- Drivers onboarded to Stripe Connect Express
CREATE TABLE IF NOT EXISTS drivers (
  id BIGSERIAL PRIMARY KEY,
  legal_name TEXT NOT NULL,
  stripe_account_id TEXT NOT NULL UNIQUE,
  kyc_status TEXT NOT NULL CHECK (kyc_status IN ('pending', 'verified', 'restricted', 'requires_action')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trips table (financial view)
CREATE TABLE IF NOT EXISTS trips (
  id BIGSERIAL PRIMARY KEY,
  rider_id BIGINT NOT NULL,
  driver_id BIGINT NOT NULL REFERENCES finance.drivers(id),
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'cancelled')),
  distance_miles NUMERIC(10, 2) NOT NULL DEFAULT 0,
  duration_minutes NUMERIC(10, 2) NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Charges per trip
CREATE TABLE IF NOT EXISTS trip_charges (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES finance.trips(id) ON DELETE CASCADE,
  passenger_total BIGINT NOT NULL,
  driver_gross BIGINT NOT NULL,
  platform_fee BIGINT NOT NULL,
  tax_amount BIGINT NOT NULL,
  tip_amount BIGINT NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'usd',
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  stripe_charge_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trip_id),
  CONSTRAINT trip_charge_total_check CHECK (
    passenger_total = driver_gross + platform_fee + tax_amount + tip_amount
  )
);

-- Ledger account catalog
CREATE TABLE IF NOT EXISTS ledger_accounts (
  id SMALLSERIAL PRIMARY KEY,
  account_type TEXT NOT NULL UNIQUE CHECK (
    account_type IN ('PASSENGER_CASH', 'DRIVER_BALANCE', 'PLATFORM_REVENUE', 'TAX_PAYABLE', 'ADJUSTMENTS')
  )
);

INSERT INTO ledger_accounts (account_type) VALUES
  ('PASSENGER_CASH'),
  ('DRIVER_BALANCE'),
  ('PLATFORM_REVENUE'),
  ('TAX_PAYABLE'),
  ('ADJUSTMENTS')
ON CONFLICT (account_type) DO NOTHING;

-- Ledger entries (event-sourced)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id BIGSERIAL PRIMARY KEY,
  account_type TEXT NOT NULL REFERENCES finance.ledger_accounts(account_type),
  owner_id BIGINT REFERENCES finance.drivers(id) ON DELETE SET NULL,
  trip_id BIGINT REFERENCES finance.trips(id) ON DELETE SET NULL,
  amount BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'usd',
  event_type TEXT NOT NULL,
  external_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_owner_account ON finance.ledger_entries(owner_id, account_type);
CREATE INDEX IF NOT EXISTS idx_ledger_trip ON finance.ledger_entries(trip_id);
CREATE INDEX IF NOT EXISTS idx_ledger_external_ref ON finance.ledger_entries(external_ref);
CREATE INDEX IF NOT EXISTS idx_ledger_event_type ON finance.ledger_entries(event_type);

-- Payouts to drivers
CREATE TABLE IF NOT EXISTS payouts (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES finance.drivers(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  payout_type TEXT NOT NULL CHECK (payout_type IN ('weekly', 'instant')),
  stripe_payout_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  currency CHAR(3) NOT NULL DEFAULT 'usd',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_driver_status ON finance.payouts(driver_id, status);

-- Stripe webhook idempotency
CREATE TABLE IF NOT EXISTS stripe_events (
  id BIGSERIAL PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON finance.stripe_events(type);

-- Dead-letter for failed webhooks (audit + retries)
CREATE TABLE IF NOT EXISTS stripe_webhook_dlq (
  id BIGSERIAL PRIMARY KEY,
  stripe_event_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_dlq_event ON finance.stripe_webhook_dlq(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_dlq_type ON finance.stripe_webhook_dlq(type);
