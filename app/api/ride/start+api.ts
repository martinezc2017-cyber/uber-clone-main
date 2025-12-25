import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rideId = body?.ride_id ? Number(body.ride_id) : null;
    if (!rideId) {
      return Response.json({ error: "Missing ride_id" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    const updated = await sql`
      UPDATE rides
      SET
        ride_status = 'in_progress',
        started_at = COALESCE(started_at, NOW())
      WHERE ride_id = ${rideId}
      RETURNING *;
    `;

    if (!updated?.length) {
      return Response.json({ error: "Ride not found" }, { status: 404 });
    }

    return Response.json({ data: updated[0] }, { status: 200 });
  } catch (error) {
    console.error("Error starting ride:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
