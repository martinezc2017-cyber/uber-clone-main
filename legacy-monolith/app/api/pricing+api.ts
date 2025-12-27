import { neon } from "@neondatabase/serverless";

import { DEFAULT_RATE_CARD, MIN_FARE_FLOOR, RateCard } from "@/lib/pricing";

type PricingConfig = {
  rateCard: RateCard;
  surgeMultiplierOverride: number | null;
  updatedAt: string | null;
};

const toNumber = (value: unknown) => {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const toRateCard = (row: any): RateCard => {
  const baseFare = toNumber(row?.base_fare) ?? DEFAULT_RATE_CARD.baseFare;
  const serviceFee = toNumber(row?.service_fee) ?? DEFAULT_RATE_CARD.serviceFee;
  const costPerMile =
    toNumber(row?.cost_per_mile) ?? DEFAULT_RATE_CARD.costPerMile;
  const costPerMinute =
    toNumber(row?.cost_per_minute) ?? DEFAULT_RATE_CARD.costPerMinute;
  const minFare = Math.max(
    toNumber(row?.min_fare) ?? DEFAULT_RATE_CARD.minFare,
    MIN_FARE_FLOOR,
  );
  const commissionRate =
    toNumber(row?.commission_rate) ?? DEFAULT_RATE_CARD.commissionRate;

  return {
    baseFare,
    serviceFee,
    costPerMile,
    costPerMinute,
    minFare,
    commissionRate,
  };
};

export async function GET() {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);

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
      SELECT
        base_fare,
        service_fee,
        cost_per_mile,
        cost_per_minute,
        min_fare,
        commission_rate,
        surge_multiplier_override,
        updated_at
      FROM pricing_config
      WHERE id = 1
      LIMIT 1;
    `;

    const row = rows?.[0];
    const config: PricingConfig = {
      rateCard: toRateCard(row),
      surgeMultiplierOverride: toNumber(row?.surge_multiplier_override),
      updatedAt: row?.updated_at ? String(row.updated_at) : null,
    };

    return Response.json({ data: config });
  } catch (error) {
    console.error("Error fetching pricing config:", error);

    const config: PricingConfig = {
      rateCard: DEFAULT_RATE_CARD,
      surgeMultiplierOverride: null,
      updatedAt: null,
    };
    return Response.json({ data: config }, { status: 200 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      baseFare,
      serviceFee,
      costPerMile,
      costPerMinute,
      minFare,
      commissionRate,
      surgeMultiplierOverride,
    } = body ?? {};

    const nextRateCard: RateCard = {
      baseFare: toNumber(baseFare) ?? DEFAULT_RATE_CARD.baseFare,
      serviceFee: toNumber(serviceFee) ?? DEFAULT_RATE_CARD.serviceFee,
      costPerMile: toNumber(costPerMile) ?? DEFAULT_RATE_CARD.costPerMile,
      costPerMinute: toNumber(costPerMinute) ?? DEFAULT_RATE_CARD.costPerMinute,
      minFare: Math.max(
        toNumber(minFare) ?? DEFAULT_RATE_CARD.minFare,
        MIN_FARE_FLOOR,
      ),
      commissionRate:
        toNumber(commissionRate) ?? DEFAULT_RATE_CARD.commissionRate,
    };

    const surgeOverride = toNumber(surgeMultiplierOverride);

    const sql = neon(`${process.env.DATABASE_URL}`);
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
        ${nextRateCard.baseFare},
        ${nextRateCard.serviceFee},
        ${nextRateCard.costPerMile},
        ${nextRateCard.costPerMinute},
        ${nextRateCard.minFare},
        ${nextRateCard.commissionRate},
        ${surgeOverride},
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
      RETURNING
        base_fare,
        service_fee,
        cost_per_mile,
        cost_per_minute,
        min_fare,
        commission_rate,
        surge_multiplier_override,
        updated_at;
    `;

    const row = rows?.[0];
    const config: PricingConfig = {
      rateCard: toRateCard(row),
      surgeMultiplierOverride: toNumber(row?.surge_multiplier_override),
      updatedAt: row?.updated_at ? String(row.updated_at) : null,
    };

    return Response.json({ data: config }, { status: 200 });
  } catch (error) {
    console.error("Error updating pricing config:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
