import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ride_id, wait_seconds = 0, wait_fee_cents = 0 } = body || {};

    if (!ride_id) {
      return Response.json({ error: "Missing ride_id" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    const rows = await sql`SELECT ride_id FROM rides WHERE ride_id = ${ride_id} LIMIT 1;`;
    if (!rows?.[0]) {
      return Response.json({ error: "Ride not found" }, { status: 404 });
    }

    await sql`
      UPDATE rides
      SET wait_seconds = ${wait_seconds},
          wait_fee_cents = ${wait_fee_cents}
      WHERE ride_id = ${ride_id};
    `;

    return Response.json({ data: { ride_id, wait_seconds, wait_fee_cents } });
  } catch (error) {
    console.error("Ride wait-time error", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
