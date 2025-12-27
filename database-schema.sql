-- Rydo Rideshare Database Schema for Neon PostgreSQL

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    clerk_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  profile_image_url TEXT,
  car_image_url TEXT,
  car_seats INTEGER DEFAULT 4,
  rating DECIMAL(2,1) DEFAULT 5.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Driver waitlist (prospect drivers before activation)
CREATE TABLE IF NOT EXISTS driver_waitlist (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  city VARCHAR(120),
  vehicle TEXT,
  experience_years INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  source VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Keep one entry per email for the waitlist
CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_waitlist_email ON driver_waitlist(email);

-- Driver status (availability + last known location)
CREATE TABLE IF NOT EXISTS driver_status (
  driver_id INTEGER PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'offline',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rides table
CREATE TABLE IF NOT EXISTS rides (
  ride_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
    origin_address TEXT NOT NULL,
    destination_address TEXT NOT NULL,
    origin_latitude DECIMAL(10, 8) NOT NULL,
    origin_longitude DECIMAL(11, 8) NOT NULL,
    destination_latitude DECIMAL(10, 8) NOT NULL,
    destination_longitude DECIMAL(11, 8) NOT NULL,
    ride_time INTEGER NOT NULL,
    fare_price DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending',
    ride_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add ride_status column if it doesn't exist (for existing databases)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rides' AND column_name = 'ride_status'
    ) THEN
        ALTER TABLE rides ADD COLUMN ride_status VARCHAR(20) DEFAULT 'pending';
    END IF;
END $$;

-- Add trip_number column for sequential numbering per user
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rides' AND column_name = 'trip_number'
    ) THEN
        ALTER TABLE rides ADD COLUMN trip_number INTEGER;
        CREATE INDEX idx_rides_user_trip ON rides(user_id, trip_number);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS pricing_config (
    id INTEGER PRIMARY KEY,
    base_fare DECIMAL(10, 2) NOT NULL,
    service_fee DECIMAL(10, 2) NOT NULL,
    cost_per_mile DECIMAL(10, 3) NOT NULL,
    cost_per_minute DECIMAL(10, 3) NOT NULL,
    min_fare DECIMAL(10, 2) NOT NULL,
    commission_rate DECIMAL(6, 4) NOT NULL,
    surge_multiplier_override DECIMAL(6, 3),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default pricing config (id=1) if missing
INSERT INTO pricing_config (
  id,
  base_fare,
  service_fee,
  cost_per_mile,
  cost_per_minute,
  min_fare,
  commission_rate,
  surge_multiplier_override
)
SELECT
  1,
  2.50,
  2.75,
  0.970,
  0.205,
  8.00,
  0.3773,
  NULL
WHERE NOT EXISTS (SELECT 1 FROM pricing_config WHERE id = 1);

-- Insert sample drivers data
INSERT INTO drivers (first_name, last_name, profile_image_url, car_image_url, car_seats, rating) VALUES
('James', 'Wilson', 'https://ucarecdn.com/dae59f69-2c1f-48c3-a883-017bcf0f9950/-/preview/1000x666/', 'https://ucarecdn.com/a2dc52b2-8bf7-4e49-9a36-3ffb5229ed02/-/preview/465x466/', 4, 4.8),
('David', 'Brown', 'https://ucarecdn.com/6ea6961b-b948-443e-87f9-8f3e7e9bffcf/-/preview/1000x666/', 'https://ucarecdn.com/a3872f80-c094-409c-82f8-c9ff38429327/-/preview/930x932/', 5, 4.6),
('Michael', 'Johnson', 'https://ucarecdn.com/0330d85c-232e-4c30-bd04-e5e4d0e3d688/-/preview/826x822/', 'https://ucarecdn.com/289764fb-55b6-4427-b1d1-f655987b4a14/-/preview/930x932/', 4, 4.9),
('Robert', 'Green', 'https://ucarecdn.com/fdfc54df-9d24-40f7-b7d3-6f391561c0db/-/preview/626x417/', 'https://ucarecdn.com/b6fb3b55-7676-4ff3-8484-fb115e268d32/-/preview/930x932/', 4, 4.7);

-- Add ride progress tracking columns (for cancellation fee calculation)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rides' AND column_name = 'started_at'
    ) THEN
        ALTER TABLE rides ADD COLUMN started_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rides' AND column_name = 'miles_traveled'
    ) THEN
        ALTER TABLE rides ADD COLUMN miles_traveled DECIMAL(10, 2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rides' AND column_name = 'cancellation_fee'
    ) THEN
        ALTER TABLE rides ADD COLUMN cancellation_fee DECIMAL(10, 2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rides' AND column_name = 'cancellation_reason'
    ) THEN
        ALTER TABLE rides ADD COLUMN cancellation_reason TEXT;
    END IF;
END $$;

-- Ride location tracking for history (driver/cliente/admin)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'ride_locations'
    ) THEN
        CREATE TABLE ride_locations (
            id SERIAL PRIMARY KEY,
            ride_id INT REFERENCES rides(ride_id),
            driver_id INT REFERENCES drivers(id),
            lat NUMERIC(10, 6) NOT NULL,
            lng NUMERIC(10, 6) NOT NULL,
            recorded_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX ride_locations_ride_idx ON ride_locations (ride_id);
        CREATE INDEX ride_locations_driver_idx ON ride_locations (driver_id);
        CREATE INDEX ride_locations_time_idx ON ride_locations (recorded_at);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rides_user_id ON rides(user_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_rides_created_at ON rides(created_at DESC);


-- Wait tracking columns for rides
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rides' AND column_name = 'wait_seconds'
    ) THEN
        ALTER TABLE rides ADD COLUMN wait_seconds INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rides' AND column_name = 'wait_fee_cents'
    ) THEN
        ALTER TABLE rides ADD COLUMN wait_fee_cents INTEGER DEFAULT 0;
    END IF;
END $$;

-- Driver contact preferences columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'drivers' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE drivers ADD COLUMN phone_number VARCHAR(20);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'drivers' AND column_name = 'allow_calls'
    ) THEN
        ALTER TABLE drivers ADD COLUMN allow_calls BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'drivers' AND column_name = 'allow_messages'
    ) THEN
        ALTER TABLE drivers ADD COLUMN allow_messages BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Ride messages table for internal chat between user and driver
CREATE TABLE IF NOT EXISTS ride_messages (
    id SERIAL PRIMARY KEY,
    ride_id INTEGER NOT NULL REFERENCES rides(ride_id) ON DELETE CASCADE,
    sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('user', 'driver')),
    sender_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for ride_messages
CREATE INDEX IF NOT EXISTS idx_ride_messages_ride_id ON ride_messages(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_messages_created_at ON ride_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ride_messages_sender ON ride_messages(sender_type, sender_id);

-- User contact preferences and phone
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'phone'
    ) THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'share_phone_with_driver'
    ) THEN
        ALTER TABLE users ADD COLUMN share_phone_with_driver BOOLEAN DEFAULT false;
    END IF;
END $$;
