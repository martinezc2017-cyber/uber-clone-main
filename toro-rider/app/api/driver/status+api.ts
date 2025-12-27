import { neon } from "@neondatabase/serverless";

type StatusBody = {
  driver_id: number;
  status?: "online" | "offline";
  latitude?: number | null;
  longitude?: number | null;
};

const ensureTable = async (sql: any) => {
  await sql`
    CREATE TABLE IF NOT EXISTS driver_status (
      driver_id INTEGER PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'offline',
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
};

export async function GET() {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    await ensureTable(sql);
    const rows = await sql`
      SELECT
        ds.driver_id,
        ds.status,
        ds.latitude,
        ds.longitude,
        ds.updated_at,
        d.first_name,
        d.last_name,
        d.profile_image_url,
        d.car_image_url,
        d.car_seats,
        d.rating
      FROM driver_status ds
      LEFT JOIN drivers d ON ds.driver_id = d.id;
    `;
    return Response.json({ data: rows });
  } catch (error) {
    console.error("Error fetching driver status:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    await ensureTable(sql);
    const body = (await request.json()) as StatusBody;
    const driverId = Number(body?.driver_id);
    if (!driverId) {
      return Response.json({ error: "Missing driver_id" }, { status: 400 });
    }

    const status =
      body.status === "online" || body.status === "offline"
        ? body.status
        : "offline";

    const lat =
      body.latitude == null || Number.isNaN(Number(body.latitude))
        ? null
        : Number(body.latitude);
    const lng =
      body.longitude == null || Number.isNaN(Number(body.longitude))
        ? null
        : Number(body.longitude);

    const rows = await sql`
      INSERT INTO driver_status (driver_id, status, latitude, longitude, updated_at)
      VALUES (${driverId}, ${status}, ${lat}, ${lng}, CURRENT_TIMESTAMP)
      ON CONFLICT (driver_id) DO UPDATE
      SET status = EXCLUDED.status,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          updated_at = CURRENT_TIMESTAMP
      RETURNING driver_id, status, latitude, longitude, updated_at;
    `;

    return Response.json({ data: rows[0] });
  } catch (error) {
    console.error("Error updating driver status:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
