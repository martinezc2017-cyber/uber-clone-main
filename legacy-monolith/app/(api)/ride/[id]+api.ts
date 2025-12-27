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

export async function GET(request: Request, { id }: { id: string }) {
  if (!id) return Response.json({ error: "Missing required fields" }, { status: 400 });

  try {
    const sql = neon(`${process.env.DATABASE_URL}`);

    const hasCompletedAt = await columnExists(sql, "rides", "completed_at");
    const hasTripNumber = await columnExists(sql, "rides", "trip_number");
    const hasDeletedAt = await columnExists(sql, "rides", "deleted_at");

    const selectFields = [
      sql`r.ride_id`,
      sql`r.origin_address`,
      sql`r.destination_address`,
      sql`r.origin_latitude`,
      sql`r.origin_longitude`,
      sql`r.destination_latitude`,
      sql`r.destination_longitude`,
      sql`r.user_id`,
      sql`r.driver_id`,
      sql`r.ride_time`,
      sql`r.fare_price`,
      sql`r.payment_status`,
      sql`r.ride_status`,
      sql`r.created_at`,
    ];
    if (hasCompletedAt) selectFields.push(sql`r.completed_at`);
    if (hasTripNumber) selectFields.push(sql`r.trip_number`);
    selectFields.push(
      sql`json_build_object(
        'driver_id', d.id,
        'first_name', d.first_name,
        'last_name', d.last_name,
        'profile_image_url', d.profile_image_url,
        'car_image_url', d.car_image_url,
        'car_seats', d.car_seats,
        'rating', d.rating
      ) AS driver`,
    );

    const rides = await sql`
      SELECT ${sql.join(selectFields, sql`, `)}
      FROM rides r
      LEFT JOIN drivers d ON r.driver_id = d.id
      INNER JOIN users u ON r.user_id = u.id
      WHERE u.clerk_id = ${id}
      ${hasDeletedAt ? sql`AND r.deleted_at IS NULL` : sql``}
      ORDER BY r.created_at DESC;
    `;

    return Response.json({ data: rides });
  } catch (error) {
    console.error("Error fetching recent rides:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { id }: { id: string }) {
  if (!id) return Response.json({ error: "Missing ride_id" }, { status: 400 });

  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const hasDeletedAt = await columnExists(sql, "rides", "deleted_at");

    if (hasDeletedAt) {
      const response = await sql`
        UPDATE rides
        SET deleted_at = NOW()
        WHERE ride_id = ${id}
        RETURNING ride_id;
      `;

      if (!response || response.length === 0) {
        return Response.json({ error: "Ride not found" }, { status: 404 });
      }
    } else {
      const response = await sql`
        DELETE FROM rides
        WHERE ride_id = ${id}
        RETURNING ride_id;
      `;
      if (!response || response.length === 0) {
        return Response.json({ error: "Ride not found" }, { status: 404 });
      }
    }

    return Response.json({ data: { message: "Ride deleted successfully" }, status: 200 });
  } catch (error) {
    console.error("Error deleting ride:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
