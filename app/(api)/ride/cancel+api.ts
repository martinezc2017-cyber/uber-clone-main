import { neon } from "@neondatabase/serverless";

const CANCEL_BASE_FEE_CENTS = 500; // $5 base fee when ride already started

const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const parseNum = (value: any, fallback = 0) => {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const computeFee = (row: any, applyFee: boolean) => {
  const rideWasStarted = !!row?.started_at || row?.ride_status === "in_progress";
  const milesTraveled = parseNum(row?.miles_traveled, 0);

  // If fee does not apply (e.g., driver cancel), force zero
  const cancellationFeeCents = applyFee
    ? CANCEL_BASE_FEE_CENTS
    : 0;

  return {
    ride_was_started: rideWasStarted,
    miles_traveled: milesTraveled,
    cancellation_fee_cents: cancellationFeeCents,
    cancellation_fee_display: formatCents(cancellationFeeCents),
    can_cancel_free: cancellationFeeCents === 0,
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rideId = searchParams.get("ride_id");

  if (!rideId) {
    return Response.json({ error: "Missing ride_id" }, { status: 400 });
  }

  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const rows = await sql`SELECT ride_id, ride_status, started_at, miles_traveled FROM rides WHERE ride_id = ${rideId} LIMIT 1;`;
    const ride = rows?.[0];

    if (!ride) {
      return Response.json({ error: "Ride not found" }, { status: 404 });
    }

    const fee = computeFee(ride, true);
    return Response.json({ data: fee });
  } catch (error) {
    console.error("Cancel GET error", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ride_id, confirm_fee = false, by_driver = false } = body || {};

    if (!ride_id) {
      return Response.json({ error: "Missing ride_id" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    const rows = await sql`SELECT ride_id, ride_status, started_at, miles_traveled FROM rides WHERE ride_id = ${ride_id} LIMIT 1;`;
    const ride = rows?.[0];

    if (!ride) {
      return Response.json({ error: "Ride not found" }, { status: 404 });
    }

    if (ride.ride_status === "cancelled") {
      const fee = computeFee(ride);
      return Response.json({ data: fee, message: "Ride already cancelled" });
    }

    if (ride.ride_status === "completed") {
      return Response.json({ error: "Ride already completed" }, { status: 400 });
    }

    // Driver cancellation does not incur a fee
    const fee = computeFee(ride, !by_driver);

    if (fee.cancellation_fee_cents > 0 && !confirm_fee) {
      return Response.json({ requires_confirmation: true, data: fee });
    }

    await sql`
      UPDATE rides
      SET ride_status = 'cancelled',
          cancellation_fee = ${fee.cancellation_fee_cents / 100.0}
      WHERE ride_id = ${ride_id};
    `;

    return Response.json({
      data: { ride_id, cancelled_by: by_driver ? "driver" : "user" },
      cancellation_fee_cents: fee.cancellation_fee_cents,
      cancellation_fee_display: fee.cancellation_fee_display,
      message:
        fee.cancellation_fee_cents > 0
          ? `Ride cancelled. Fee applied: ${fee.cancellation_fee_display}`
          : "Ride cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel POST error", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
