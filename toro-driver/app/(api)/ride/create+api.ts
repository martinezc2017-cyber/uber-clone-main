import { neon } from "@neondatabase/serverless";

const columnExists = async (sql: any, table: string, column: string) => {
  try {
    const rows = await sql`
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = ${table} AND column_name = ${column}
      LIMIT 1;
    `;
    return Array.isArray(rows) && rows.length > 0;
  } catch (e) {
    console.warn(`columnExists check failed for ${table}.${column}`, e);
    return false;
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      origin_address,
      destination_address,
      origin_latitude,
      origin_longitude,
      destination_latitude,
      destination_longitude,
      ride_time,
      fare_price,
      payment_status = "pending",
      driver_id = null,
      user_id = null,
      clerk_id,
      user_name,
      user_email,
    } = body || {};

    if (
      !origin_address ||
      !destination_address ||
      origin_latitude == null ||
      origin_longitude == null ||
      destination_latitude == null ||
      destination_longitude == null
    ) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    const hasTripNumber = await columnExists(sql, "rides", "trip_number");

    // Resolve user_id from clerk_id; create user if missing
    let resolvedUserId = user_id;
    if (!resolvedUserId && clerk_id) {
      const existing = await sql`
        SELECT id FROM users WHERE clerk_id = ${clerk_id} LIMIT 1;
      `;
      if (existing?.length) {
        resolvedUserId = existing[0].id;
      } else {
        const inserted = await sql`
          INSERT INTO users (name, email, clerk_id)
          VALUES (${user_name || "Guest"}, ${user_email || ""}, ${clerk_id})
          RETURNING id;
        `;
        resolvedUserId = inserted?.[0]?.id ?? null;
      }
    }

    if (!resolvedUserId) {
      return Response.json({ error: "Missing user_id/clerk_id" }, { status: 400 });
    }

    const driverIdValue = driver_id ? Number(driver_id) : null;

    let trip_number: number | null = null;
    if (hasTripNumber) {
      const userTripsCount = await sql`
        SELECT COUNT(*) as count FROM rides WHERE user_id = ${resolvedUserId};
      `;
      trip_number = (userTripsCount[0]?.count || 0) + 1;
    }

    const columns = [
      sql`origin_address`,
      sql`destination_address`,
      sql`origin_latitude`,
      sql`origin_longitude`,
      sql`destination_latitude`,
      sql`destination_longitude`,
      sql`ride_time`,
      sql`fare_price`,
      sql`payment_status`,
      sql`driver_id`,
      sql`user_id`,
    ];
    const values = [
      origin_address,
      destination_address,
      origin_latitude,
      origin_longitude,
      destination_latitude,
      destination_longitude,
      ride_time ?? null,
      fare_price ?? 0,
      payment_status,
      driverIdValue,
      resolvedUserId,
    ];
    if (hasTripNumber) {
      columns.push(sql`trip_number`);
      values.push(trip_number);
    }

    const response = await sql`
      INSERT INTO rides (${sql.join(columns, sql`, `)})
      VALUES (${sql.join(values, sql`, `)})
      RETURNING *;
    `;

    return Response.json({ data: response[0] }, { status: 201 });
  } catch (error) {
    console.error("Error inserting data into recent_rides:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
