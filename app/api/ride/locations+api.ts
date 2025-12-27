import { neon } from "@neondatabase/serverless";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rideId = url.searchParams.get("ride_id");

    if (!rideId) {
      return Response.json({ error: "Missing ride_id" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Only get locations from the last 10 minutes to avoid stale data
    const rows = await sql`
      SELECT ride_id, driver_id, lat, lng, recorded_at
      FROM ride_locations
      WHERE ride_id = ${rideId}
        AND recorded_at > NOW() - INTERVAL '10 minutes'
      ORDER BY recorded_at DESC
      LIMIT 1;
    `;

    return Response.json({ data: rows }, { status: 200 });
  } catch (error) {
    console.error("Error fetching ride locations:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
