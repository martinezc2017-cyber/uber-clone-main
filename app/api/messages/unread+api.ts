import { neon } from "@neondatabase/serverless";

// GET - Get unread message count for a ride
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ride_id = url.searchParams.get("ride_id");
    const reader_type = url.searchParams.get("reader_type"); // 'user' or 'driver'

    if (!ride_id || !reader_type) {
      return Response.json(
        { error: "Missing ride_id or reader_type" },
        { status: 400 }
      );
    }

    // Count messages from the other party that are unread
    const other_type = reader_type === "user" ? "driver" : "user";

    const sql = neon(`${process.env.DATABASE_URL}`);

    const result = await sql`
      SELECT COUNT(*) as unread_count
      FROM ride_messages
      WHERE ride_id = ${ride_id}
        AND sender_type = ${other_type}
        AND is_read = false;
    `;

    return Response.json(
      { data: { unread_count: parseInt(result[0]?.unread_count || "0") } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
