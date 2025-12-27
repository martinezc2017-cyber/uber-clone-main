import { neon } from "@neondatabase/serverless";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const driverIdParam = searchParams.get("driver_id");
    const driverId = driverIdParam ? Number(driverIdParam) : null;

    if (!driverId) {
      return Response.json({ error: "Missing driver_id" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    const rows = await sql`
      SELECT
        ride_id,
        origin_address,
        destination_address,
        origin_latitude,
        origin_longitude,
        destination_latitude,
        destination_longitude,
        ride_time,
        fare_price,
        payment_status,
        ride_status,
        created_at
      FROM rides
      WHERE driver_id = ${driverId}
      ORDER BY created_at DESC;
    `;

    return Response.json({ data: rows });
  } catch (error) {
    console.error("Error fetching rides by driver:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
