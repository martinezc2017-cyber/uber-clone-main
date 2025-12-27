import { neon } from "@neondatabase/serverless";

let ensuredDriverContactColumns = false;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rideIdParam = searchParams.get("ride_id");

  if (!rideIdParam) {
    return Response.json(
      { error: "Missing ride_id" },
      { status: 400 }
    );
  }

  const rideId = Number(rideIdParam);
  if (!rideId || Number.isNaN(rideId)) {
    return Response.json(
      { error: "Invalid ride_id" },
      { status: 400 }
    );
  }

  try {
    const sql = neon(`${process.env.DATABASE_URL}`);

    // Ensure optional driver contact columns exist to avoid missing-column errors
    if (!ensuredDriverContactColumns) {
      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'phone_number') THEN
            ALTER TABLE drivers ADD COLUMN phone_number VARCHAR(20);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'allow_calls') THEN
            ALTER TABLE drivers ADD COLUMN allow_calls BOOLEAN DEFAULT false;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'allow_messages') THEN
            ALTER TABLE drivers ADD COLUMN allow_messages BOOLEAN DEFAULT true;
          END IF;
        END $$;
      `;
      ensuredDriverContactColumns = true;
    }
    const rows = await sql`
      SELECT
        r.ride_id,
        r.user_id,
        r.driver_id,
        r.origin_address,
        r.destination_address,
        r.origin_latitude,
        r.origin_longitude,
        r.destination_latitude,
        r.destination_longitude,
        r.ride_time,
        r.fare_price,
        r.payment_status,
        r.ride_status,
        r.created_at,
        ds.latitude AS driver_latitude,
        ds.longitude AS driver_longitude,
        json_build_object(
          'id', d.id,
          'first_name', d.first_name,
          'last_name', d.last_name,
          'profile_image_url', d.profile_image_url,
          'car_image_url', d.car_image_url,
          'car_seats', d.car_seats,
          'rating', d.rating,
          'phone_number', d.phone_number,
          'allow_calls', d.allow_calls,
          'allow_messages', d.allow_messages
        ) AS driver,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email,
          'clerk_id', u.clerk_id
        ) AS user
      FROM rides r
      LEFT JOIN drivers d ON r.driver_id = d.id
      LEFT JOIN driver_status ds ON ds.driver_id = d.id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.ride_id = ${rideId}
      LIMIT 1;
    `;

    return Response.json({ data: rows[0] ?? null });
  } catch (error) {
    console.error("Error fetching ride status:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
