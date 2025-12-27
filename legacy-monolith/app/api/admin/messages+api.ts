import { neon } from "@neondatabase/serverless";

// GET - Get all messages with ride and user info for admin
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ride_id = url.searchParams.get("ride_id");
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const sql = neon(`${process.env.DATABASE_URL}`);

    // If ride_id provided, get messages for specific ride
    if (ride_id) {
      const messages = await sql`
        SELECT
          m.id,
          m.ride_id,
          m.sender_type,
          m.sender_id,
          m.message,
          m.is_read,
          m.created_at,
          CASE
            WHEN m.sender_type = 'user' THEN u.name
            WHEN m.sender_type = 'driver' THEN CONCAT(d.first_name, ' ', d.last_name)
          END as sender_name,
          r.origin_address,
          r.destination_address
        FROM ride_messages m
        LEFT JOIN users u ON m.sender_type = 'user' AND m.sender_id = u.id
        LEFT JOIN drivers d ON m.sender_type = 'driver' AND m.sender_id = d.id
        LEFT JOIN rides r ON m.ride_id = r.ride_id
        WHERE m.ride_id = ${ride_id}
        ORDER BY m.created_at ASC;
      `;

      return Response.json({ data: messages }, { status: 200 });
    }

    // Get rides with message counts
    const ridesWithMessages = await sql`
      SELECT
        r.ride_id,
        r.origin_address,
        r.destination_address,
        r.ride_status,
        r.created_at as ride_created_at,
        u.name as user_name,
        CONCAT(d.first_name, ' ', d.last_name) as driver_name,
        COUNT(m.id) as message_count,
        MAX(m.created_at) as last_message_at,
        SUM(CASE WHEN m.is_read = false THEN 1 ELSE 0 END) as unread_count
      FROM rides r
      INNER JOIN ride_messages m ON r.ride_id = m.ride_id
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN drivers d ON r.driver_id = d.id
      GROUP BY r.ride_id, r.origin_address, r.destination_address, r.ride_status, r.created_at, u.name, d.first_name, d.last_name
      ORDER BY last_message_at DESC
      LIMIT ${limit}
      OFFSET ${offset};
    `;

    return Response.json({ data: ridesWithMessages }, { status: 200 });
  } catch (error) {
    console.error("Error fetching admin messages:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
