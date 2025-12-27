import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ride_id } = body || {};

    if (!ride_id) {
      return Response.json({ error: "Missing ride_id" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    const rows = await sql`SELECT ride_status FROM rides WHERE ride_id = ${ride_id} LIMIT 1;`;
    if (!rows?.[0]) {
      return Response.json({ error: "Ride not found" }, { status: 404 });
    }

    await sql`
      UPDATE rides
      SET ride_status = 'in_progress',
          started_at = COALESCE(started_at, NOW())
      WHERE ride_id = ${ride_id};
    `;

    return Response.json({ data: { ride_id, ride_status: "in_progress" } });
  } catch (error) {
    console.error("Ride start error", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
