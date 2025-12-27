import { neon } from "@neondatabase/serverless";

export async function GET() {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);

    const rows = await sql`
      SELECT
        rides.ride_id,
        rides.user_id,
        rides.driver_id,
        rides.origin_address,
        rides.destination_address,
        rides.origin_latitude,
        rides.origin_longitude,
        rides.destination_latitude,
        rides.destination_longitude,
        rides.ride_time,
        rides.fare_price,
        rides.payment_status,
        rides.ride_status,
        rides.created_at,
        json_build_object(
          'id', users.id,
          'name', users.name,
          'email', users.email,
          'clerk_id', users.clerk_id
        ) AS user,
        json_build_object(
          'id', drivers.id,
          'first_name', drivers.first_name,
          'last_name', drivers.last_name,
          'profile_image_url', drivers.profile_image_url,
          'car_image_url', drivers.car_image_url,
          'car_seats', drivers.car_seats,
          'rating', drivers.rating
        ) AS driver
      FROM rides
      LEFT JOIN users ON rides.user_id = users.id
      LEFT JOIN drivers ON rides.driver_id = drivers.id
      ORDER BY rides.created_at DESC;
    `;

    return Response.json({ data: rows });
  } catch (error) {
    console.error("Error fetching rides list:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
