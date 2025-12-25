import { neon } from "@neondatabase/serverless";

const STALE_MINUTES = 120;

const autoCancelIfStale = async (ride: any, sql: any) => {
  if (!ride) return false;
  const createdAt = ride.created_at ? new Date(ride.created_at) : null;
  if (!createdAt) return false;

  const ageMinutes = (Date.now() - createdAt.getTime()) / 60000;
  if (ageMinutes <= STALE_MINUTES) return false;

  await sql`
    UPDATE rides
    SET ride_status = 'cancelled',
        cancellation_reason = 'auto-cancelled stale',
        cancellation_fee = 0
    WHERE ride_id = ${ride.ride_id};
  `;
  return true;
};

// GET - Get active ride for a driver (accepted or in_progress)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const driver_id = url.searchParams.get("driver_id");

    if (!driver_id) {
      return Response.json({ error: "Missing driver_id" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Find any active ride for this driver
    const rides = await sql`
      SELECT
        r.*,
        u.name as user_name,
        u.email as user_email
      FROM rides r
      LEFT JOIN users u ON r.clerk_id = u.clerk_id
      WHERE r.driver_id = ${driver_id}
        AND r.ride_status IN ('accepted', 'active', 'in_progress', 'arrived')
      ORDER BY r.created_at DESC
      LIMIT 1;
    `;

    if (!rides?.length) {
      return Response.json({ data: null }, { status: 200 });
    }

    const ride = rides[0];

    const cancelled = await autoCancelIfStale(ride, sql);
    if (cancelled) {
      return Response.json({ data: null, message: "Ride auto-cancelled (stale)" }, { status: 200 });
    }

    return Response.json({ data: ride }, { status: 200 });
  } catch (error) {
    console.error("Error fetching driver active ride:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
