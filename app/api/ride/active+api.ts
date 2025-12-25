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

// GET - Get active ride for a user (pending, accepted, or in_progress)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clerk_id = url.searchParams.get("clerk_id");

    if (!clerk_id) {
      return Response.json({ error: "Missing clerk_id" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Resolve user_id from clerk_id
    const userRows = await sql`
      SELECT id FROM users WHERE clerk_id = ${clerk_id} LIMIT 1;
    `;
    if (!userRows?.length) {
      return Response.json({ data: null }, { status: 200 });
    }
    const userId = userRows[0].id;

    // Find any active ride for this user (also consider legacy rows with user_id null)
    const rides = await sql`
      SELECT
        r.*,
        json_build_object(
          'id', d.id,
          'first_name', d.first_name,
          'last_name', d.last_name,
          'profile_image_url', d.profile_image_url,
          'car_image_url', d.car_image_url,
          'car_seats', d.car_seats,
          'rating', d.rating
        ) as driver
      FROM rides r
      LEFT JOIN drivers d ON r.driver_id = d.id
      WHERE (r.user_id = ${userId} OR r.user_id IS NULL)
        AND r.ride_status IN ('pending', 'accepted', 'active', 'in_progress', 'arrived')
      ORDER BY r.created_at DESC
      LIMIT 1;
    `;

    if (!rides?.length) {
      return Response.json({ data: null }, { status: 200 });
    }

    const ride = rides[0];

    // Auto-cancel stale rides to avoid "limbo" states
    const cancelled = await autoCancelIfStale(ride, sql);
    if (cancelled) {
      return Response.json({ data: null, message: "Ride auto-cancelled (stale)" }, { status: 200 });
    }

    // Backfill missing user_id on legacy rows
    if (!ride.user_id) {
      await sql`
        UPDATE rides SET user_id = ${userId} WHERE ride_id = ${ride.ride_id};
      `;
      ride.user_id = userId;
    }

    // Clean up driver object if no driver assigned
    if (ride.driver && !ride.driver.id) {
      ride.driver = null;
    }

    return Response.json({ data: ride }, { status: 200 });
  } catch (error) {
    console.error("Error fetching active ride:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
