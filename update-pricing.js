require("dotenv").config();
const { neon } = require("@neondatabase/serverless");

const RATE_CARD = {
  base_fare: 2.5,
  service_fee: 2.75,
  cost_per_mile: 1.55,
  cost_per_minute: 0.15,
  min_fare: 9,
  commission_rate: 0.25, // 75% driver city, 85% long via code
  surge_multiplier_override: null,
};

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  await sql`
    CREATE TABLE IF NOT EXISTS pricing_config (
      id INTEGER PRIMARY KEY,
      base_fare DECIMAL(10, 2),
      service_fee DECIMAL(10, 2),
      cost_per_mile DECIMAL(10, 4),
      cost_per_minute DECIMAL(10, 4),
      min_fare DECIMAL(10, 2),
      commission_rate DECIMAL(10, 4),
      surge_multiplier_override DECIMAL(10, 2),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const rows = await sql`
    INSERT INTO pricing_config (
      id,
      base_fare,
      service_fee,
      cost_per_mile,
      cost_per_minute,
      min_fare,
      commission_rate,
      surge_multiplier_override,
      updated_at
    ) VALUES (
      1,
      ${RATE_CARD.base_fare},
      ${RATE_CARD.service_fee},
      ${RATE_CARD.cost_per_mile},
      ${RATE_CARD.cost_per_minute},
      ${RATE_CARD.min_fare},
      ${RATE_CARD.commission_rate},
      ${RATE_CARD.surge_multiplier_override},
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (id) DO UPDATE SET
      base_fare = EXCLUDED.base_fare,
      service_fee = EXCLUDED.service_fee,
      cost_per_mile = EXCLUDED.cost_per_mile,
      cost_per_minute = EXCLUDED.cost_per_minute,
      min_fare = EXCLUDED.min_fare,
      commission_rate = EXCLUDED.commission_rate,
      surge_multiplier_override = EXCLUDED.surge_multiplier_override,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;

  console.log("✅ Pricing updated:", rows[0]);
}

main().catch((err) => {
  console.error("❌ Error updating pricing:", err);
  process.exit(1);
});
