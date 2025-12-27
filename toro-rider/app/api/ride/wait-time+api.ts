import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rideId = body?.ride_id ? Number(body.ride_id) : null;
    const waitSeconds = body?.wait_seconds !== undefined ? Number(body.wait_seconds) : null;
    const waitFeeCents = body?.wait_fee_cents !== undefined ? Number(body.wait_fee_cents) : null;

    if (!rideId || waitSeconds === null || waitFeeCents === null) {
      return Response.json({ error: "Missing ride_id, wait_seconds, or wait_fee_cents" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    const rideRows = await sql`
      SELECT ride_id, ride_status
      FROM rides
      WHERE ride_id = ${rideId}
      LIMIT 1;
    `;

    if (!rideRows?.length) {
      return Response.json({ error: "Ride not found" }, { status: 404 });
    }

    const ride = rideRows[0];
    if (ride.ride_status === "completed" || ride.ride_status === "cancelled") {
      return Response.json({ error: "Ride is not active" }, { status: 400 });
    }

    const updated = await sql`
      UPDATE rides
      SET wait_seconds = ${waitSeconds}, wait_fee_cents = ${waitFeeCents}
      WHERE ride_id = ${rideId}
      RETURNING ride_id, wait_seconds, wait_fee_cents, ride_status;
    `;

    return Response.json({ data: updated[0] }, { status: 200 });
  } catch (error) {
    console.error("Error updating wait time:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
