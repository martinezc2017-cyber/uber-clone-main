import { neon } from "@neondatabase/serverless";

// Returns the most recent active ride for a given Clerk user id (not completed/cancelled)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clerkId = searchParams.get("clerk_id");

  if (!clerkId) {
    return Response.json({ error: "Missing clerk_id" }, { status: 400 });
  }

  try {
    const sql = neon(`${process.env.DATABASE_URL}`);

    const rows = await sql`
      SELECT
        r.*,
        json_build_object(
          'id', d.id,
          'driver_id', d.id,
          'first_name', d.first_name,
          'last_name', d.last_name,
          'profile_image_url', d.profile_image_url,
          'car_image_url', d.car_image_url,
          'car_seats', d.car_seats,
          'rating', d.rating
        ) AS driver
      FROM rides r
      INNER JOIN users u ON r.user_id = u.id
      LEFT JOIN drivers d ON r.driver_id = d.id
      WHERE u.clerk_id = ${clerkId}
        AND r.ride_status NOT IN ('completed', 'cancelled')
      ORDER BY r.created_at DESC
      LIMIT 1;
    `;

    if (!rows?.[0]) {
      return Response.json({ data: null });
    }

    return Response.json({ data: rows[0] });
  } catch (error) {
    console.error("active ride error", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
