import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rideId = body?.ride_id ? Number(body.ride_id) : null;
    const driverId = body?.driver_id ? Number(body.driver_id) : null;

    if (!rideId || !driverId) {
      return Response.json({ error: "Missing ride_id or driver_id" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Assign ride to driver only if it's unassigned
    const result = await sql`
      UPDATE rides
      SET driver_id = ${driverId}, ride_status = 'active'
      WHERE ride_id = ${rideId} AND (driver_id IS NULL)
      RETURNING
        ride_id,
        origin_address,
        destination_address,
        origin_latitude,
        origin_longitude,
        destination_latitude,
        destination_longitude,
        fare_price,
        ride_time,
        payment_status,
        ride_status,
        created_at,
        driver_id,
        user_id;
    `;

    if (!result || result.length === 0) {
      return Response.json(
        { error: "Ride already assigned or not found" },
        { status: 409 },
      );
    }

    return Response.json({ data: result[0] }, { status: 200 });
  } catch (error) {
    console.error("Error accepting ride:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
