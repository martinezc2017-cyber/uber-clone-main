export type RateCard = {
  baseFare: number;
  serviceFee: number;
  costPerMile: number;
  costPerMinute: number;
  minFare: number;
  commissionRate: number;
};

export type PricingContext = {
  now?: Date;
  availableDrivers?: number;
  surgeMultiplierOverride?: number;
};

export type FareBreakdown = {
  timestamp: string;

  distanceMiles: number;
  durationMinutes: number;
  estimatedDurationMinutes: number;

  baseFare: number;
  serviceFee: number;
  costPerMile: number;
  costPerMinute: number;
  minFare: number;

  distanceFare: number;
  timeFare: number;
  subtotal: number;

  surgeMultiplier: number;
  surgeLabel: string;
  surgeAmount: number;
  subtotalWithSurge: number;

  total: number;
  minFareApplied: boolean;

  commissionRate: number;
  driverEarnings: number;
  platformCommission: number;
};

const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const MIN_FARE_FLOOR = 9;

export const DEFAULT_RATE_CARD: RateCard = {
  // Universal pricing: calibrated to ~$279 for Mesa → Flagstaff (~160 mi)
  baseFare: 2.5,
  serviceFee: 2.75,
  costPerMile: 1.86,
  costPerMinute: 0.15,
  minFare: MIN_FARE_FLOOR,
  commissionRate: 0.25, // 75% for driver (city trips)
};

// Uplift para alinear tarifas al nivel “Priority” (ej. ~\$279 en ~160 mi).
const PRIORITY_UPLIFT = 1; // sin multiplicador extra

const getTimeBasedMultipliers = (date: Date) => {
  // Simplified: No surge pricing, no traffic multipliers
  // Universal $1.86/mile pricing
  return {
    surgeMultiplier: 1.0,
    trafficMultiplier: 1.0,
    surgeLabel: "Standard"
  };
};

const applySupplyAdjustment = (baseSurge: number, availableDrivers?: number) => {
  // Simplified: No supply-based surge adjustments
  return baseSurge;
};

// Arizona tax rates by city
const AZ_TAX_RATES: Record<string, number> = {
  "Phoenix": 0.086,
  "Mesa": 0.0795,
  "Tempe": 0.0818,
  "Scottsdale": 0.0785,
  "Gilbert": 0.0765,
  "Chandler": 0.0775,
  "Glendale": 0.093,
  "Peoria": 0.086,
  "Surprise": 0.0825,
  "Flagstaff": 0.0956,
  "Tucson": 0.086,
  "default": 0.056, // Arizona state base rate
};

export const getTaxRate = (state: string, city?: string): number => {
  if (state === "AZ" && city) {
    const normalizedCity = city.trim();
    for (const [taxCity, rate] of Object.entries(AZ_TAX_RATES)) {
      if (normalizedCity.toLowerCase().includes(taxCity.toLowerCase())) {
        return rate;
      }
    }
  }
  return AZ_TAX_RATES["default"];
};

export const computeFare = ({
  distanceMiles,
  durationMinutes,
  rateCard = DEFAULT_RATE_CARD,
  context,
}: {
  distanceMiles: number;
  durationMinutes: number;
  rateCard?: RateCard;
  context?: PricingContext;
}): FareBreakdown => {
  const now = context?.now ?? new Date();
  const { surgeMultiplier: timeSurge, trafficMultiplier, surgeLabel } =
    getTimeBasedMultipliers(now);

  const computedSurge = applySupplyAdjustment(
    timeSurge,
    context?.availableDrivers,
  );

  const override = context?.surgeMultiplierOverride;
  const surgeMultiplier =
    override == null ? computedSurge : clamp(override, 1.0, 5.0);
  const finalSurgeLabel =
    override == null ? surgeLabel : `Admin surge x${surgeMultiplier}`;

  const estimatedDurationMinutes = durationMinutes * trafficMultiplier;

  const baseFare = rateCard.baseFare;
  const serviceFee = rateCard.serviceFee;
  const costPerMile = rateCard.costPerMile;
  const costPerMinute = rateCard.costPerMinute;

  const distanceFare = distanceMiles * costPerMile;
  const timeFare = estimatedDurationMinutes * costPerMinute;
  const subtotal = baseFare + distanceFare + timeFare;

  const surgeAmount = subtotal * (surgeMultiplier - 1);
  const subtotalWithSurge = subtotal + surgeAmount;

  // Business rule: dynamic pricing (surge) is folded into the service fee line.
  const serviceFeeWithSurge = serviceFee + surgeAmount;

  const totalBeforeMin = subtotal + serviceFeeWithSurge;
  const effectiveMinFare = Math.max(rateCard.minFare, MIN_FARE_FLOOR);
  const minFareApplied = totalBeforeMin < effectiveMinFare;
  const totalBase = Math.max(totalBeforeMin, effectiveMinFare);

  // Aplicar uplift para igualar al “Priority Pickup” objetivo.
  const total = totalBase * PRIORITY_UPLIFT;

  // Dynamic commission based on distance:
  // City trips (≤100 mi): 25% platform fee = 75% to driver
  // Long trips (>100 mi): 15% platform fee = 85% to driver
  const commissionRate = distanceMiles > 100 ? 0.15 : rateCard.commissionRate;
  const driverEarnings = total * (1 - commissionRate);
  const platformCommission = total - driverEarnings;

  return {
    timestamp: now.toISOString(),

    distanceMiles: roundMoney(distanceMiles),
    durationMinutes: roundMoney(durationMinutes),
    estimatedDurationMinutes: roundMoney(estimatedDurationMinutes),

    baseFare: roundMoney(baseFare),
    serviceFee: roundMoney(serviceFeeWithSurge),
    costPerMile: roundMoney(costPerMile),
    costPerMinute: roundMoney(costPerMinute),
    minFare: roundMoney(effectiveMinFare),

    distanceFare: roundMoney(distanceFare),
    timeFare: roundMoney(timeFare),
    subtotal: roundMoney(subtotal),

    surgeMultiplier: roundMoney(surgeMultiplier),
    surgeLabel: finalSurgeLabel,
    surgeAmount: roundMoney(surgeAmount),
    subtotalWithSurge: roundMoney(subtotalWithSurge),

    total: roundMoney(total),
    minFareApplied,

    commissionRate: roundMoney(commissionRate),
    driverEarnings: roundMoney(driverEarnings),
    platformCommission: roundMoney(platformCommission),
  };
};
