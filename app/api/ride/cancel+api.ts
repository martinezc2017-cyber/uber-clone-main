import { neon } from "@neondatabase/serverless";

// Cancellation fee constants
const CANCELLATION_BASE_FEE = 500; // $5.00 in cents
const COST_PER_MILE_CENTS = 186; // $1.86 per mile in cents

type CancellationResult = {
  cancellationFee: number; // in cents
  milesTraveled: number;
  minutesElapsed: number;
  rideWasStarted: boolean;
  message: string;
};

// Haversine distance in miles
const haversineMiles = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Best-effort miles traveled: prefer stored miles_traveled, otherwise compute from driver_status
async function getMilesTraveled(ride: any, sql: any): Promise<number> {
  const stored = parseFloat(ride.miles_traveled) || 0;
  if (!ride.driver_id) return stored;

  try {
    const ds = await sql`
      SELECT latitude, longitude
      FROM driver_status
      WHERE driver_id = ${ride.driver_id}
      LIMIT 1;
    `;
    if (ds?.length && ds[0].latitude && ds[0].longitude) {
      const milesFromStatus = haversineMiles(
        Number(ride.origin_latitude),
        Number(ride.origin_longitude),
        Number(ds[0].latitude),
        Number(ds[0].longitude),
      );
      return Math.max(stored, milesFromStatus);
    }
  } catch (e) {
    console.warn("Could not fetch driver_status for miles", e);
  }

  return stored;
}

// Fetch rate card (base, per mile, per minute) with defaults
async function getRateCard(sql: any) {
  try {
    const rows = await sql`
      SELECT base_fare, service_fee, cost_per_mile, cost_per_minute
      FROM pricing_config
      WHERE id = 1
      LIMIT 1;
    `;
    if (!rows?.length) {
      return { baseFare: 2.5, serviceFee: 2.75, costPerMile: 1.86, costPerMinute: 0.15 };
    }
    const row = rows[0];
    const toNum = (v: any, fallback: number) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    return {
      baseFare: toNum(row.base_fare, 2.5),
      serviceFee: toNum(row.service_fee, 2.75),
      costPerMile: toNum(row.cost_per_mile, 1.86),
      costPerMinute: toNum(row.cost_per_minute, 0.15),
    };
  } catch {
    return { baseFare: 2.5, serviceFee: 2.75, costPerMile: 1.86, costPerMinute: 0.15 };
  }
}

// Calculate cancellation fee based on ride status and miles traveled
function calculateCancellationFee(
  ride: any,
  milesTraveled: number,
  rateCard: { baseFare: number; serviceFee: number; costPerMile: number; costPerMinute: number },
): CancellationResult {
  const rideStatus = ride.ride_status;
  const wasStarted = ride.started_at !== null;
  const now = new Date();
  const startTs = ride.started_at ? new Date(ride.started_at) : null;
  const createdTs = ride.created_at ? new Date(ride.created_at) : now;
  const elapsedMs = startTs ? Math.max(0, now.getTime() - startTs.getTime()) : Math.max(0, now.getTime() - createdTs.getTime());
  const minutesElapsed = elapsedMs / 60000;

  // distance/time charges
  const distanceFee = Math.round(Math.max(0, milesTraveled) * rateCard.costPerMile * 100); // cents
  const timeFee = Math.round(Math.max(0, minutesElapsed) * rateCard.costPerMinute * 100); // cents
  const baseFee = CANCELLATION_BASE_FEE;

  // If ride is pending or accepted/active pero sin haber iniciado (started_at null) -> solo base
  if (
    rideStatus === "pending" ||
    rideStatus === null ||
    ((rideStatus === "accepted" || rideStatus === "active") && !wasStarted)
  ) {
    const cancellationFee = baseFee;
    return {
      cancellationFee,
      milesTraveled: 0,
      minutesElapsed: 0,
      rideWasStarted: false,
      message: `Cargo por cancelación: $${(cancellationFee / 100).toFixed(2)} (cancelación anticipada)`,
    };
  }

  // If ride was started/in progress - charge distancia + tiempo + base
  if (wasStarted || rideStatus === "in_progress") {
    const distanceCharge = Math.round(Math.max(0, milesTraveled) * rateCard.costPerMile * 100);
    const timeCharge = Math.round(Math.max(0, minutesElapsed) * rateCard.costPerMinute * 100);
    const cancellationFee = baseFee + distanceCharge + timeCharge;

    return {
      cancellationFee,
      milesTraveled,
      minutesElapsed,
      rideWasStarted: true,
      message: `Cargo por cancelación: $${(cancellationFee / 100).toFixed(2)} (base $${(baseFee / 100).toFixed(2)} + ${milesTraveled.toFixed(
        1,
      )} mi + ${minutesElapsed.toFixed(1)} min)`,
    };
  }

  // Default fallback
  return {
    cancellationFee: 0,
    milesTraveled: 0,
    minutesElapsed: 0,
    rideWasStarted: false,
    message: "Viaje cancelado",
  };
}

// GET - Calculate cancellation fee without cancelling (for preview)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ride_id = url.searchParams.get("ride_id");

    if (!ride_id) {
      return Response.json({ error: "Missing ride_id" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    const rides = await sql`
      SELECT * FROM rides WHERE ride_id = ${ride_id} LIMIT 1;
    `;

    if (!rides?.length) {
      return Response.json({ error: "Ride not found" }, { status: 404 });
    }

    const ride = rides[0];
    const rateCard = await getRateCard(sql);
    const miles = await getMilesTraveled(ride, sql);
    const result = calculateCancellationFee(ride, miles, rateCard);

    return Response.json(
      {
        data: {
          ride_id: ride.ride_id,
          ride_status: ride.ride_status,
          cancellation_fee_cents: result.cancellationFee,
          cancellation_fee_display: `$${(result.cancellationFee / 100).toFixed(2)}`,
          miles_traveled: result.milesTraveled,
          minutes_elapsed: Number(result.minutesElapsed.toFixed(1)),
          ride_was_started: result.rideWasStarted,
          message: result.message,
          can_cancel_free: result.cancellationFee === 0,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error calculating cancellation fee:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST - Actually cancel the ride
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ride_id, confirm_fee, by_driver } = body;

    if (!ride_id) {
      return Response.json({ error: "Missing ride_id" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Get ride details
    const rides = await sql`
      SELECT * FROM rides WHERE ride_id = ${ride_id} LIMIT 1;
    `;

    if (!rides?.length) {
      return Response.json({ error: "Ride not found" }, { status: 404 });
    }

    const ride = rides[0];
    const rateCard = await getRateCard(sql);

    // Already terminal?
    if (ride.ride_status === "cancelled") {
      return Response.json({ error: "Ride is already cancelled" }, { status: 400 });
    }
    if (ride.ride_status === "completed") {
      return Response.json({ error: "Cannot cancel a completed ride" }, { status: 400 });
    }

    // If driver cancels, reset ride to pending so it can be reassigned
    if (by_driver) {
      const updated = await sql`
        UPDATE rides
        SET
          ride_status = 'pending',
          driver_id = NULL
        WHERE ride_id = ${ride_id}
        RETURNING *;
      `;

      if (ride.driver_id) {
        await sql`
          UPDATE driver_status
          SET status = 'available'
          WHERE driver_id = ${ride.driver_id};
        `;
      }

      return Response.json(
        {
          data: updated[0],
          message: "Ride returned to pending after driver cancel",
        },
        { status: 200 },
      );
    }

    const miles = await getMilesTraveled(ride, sql);
    const result = calculateCancellationFee(ride, miles, rateCard);

    // If there's a fee and user hasn't confirmed, return fee details
    if (result.cancellationFee > 0 && !confirm_fee) {
      return Response.json(
        {
          requires_confirmation: true,
          data: {
            ride_id: ride.ride_id,
            cancellation_fee_cents: result.cancellationFee,
            cancellation_fee_display: `$${(result.cancellationFee / 100).toFixed(2)}`,
            miles_traveled: result.milesTraveled,
            message: result.message,
          },
        },
        { status: 200 },
      );
    }

    // Update ride to cancelled and store the cancellation fee and miles traveled
    const response = await sql`
      UPDATE rides
      SET
        ride_status = 'cancelled'
      WHERE ride_id = ${ride_id}
      RETURNING *;
    `;

    // Also update driver status back to available if there was a driver assigned
    if (ride.driver_id) {
      await sql`
        UPDATE driver_status
        SET status = 'available'
        WHERE driver_id = ${ride.driver_id};
      `;
    }

    return Response.json(
      {
        data: response[0],
        cancellation_fee_cents: result.cancellationFee,
        cancellation_fee_display: `$${(result.cancellationFee / 100).toFixed(2)}`,
        message: result.message,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error cancelling ride:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
