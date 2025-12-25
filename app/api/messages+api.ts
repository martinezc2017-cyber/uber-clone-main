import { neon } from "@neondatabase/serverless";

// GET - Get messages for a ride
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ride_id = url.searchParams.get("ride_id");

    if (!ride_id) {
      return Response.json({ error: "Missing ride_id" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

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
        END as sender_name
      FROM ride_messages m
      LEFT JOIN users u ON m.sender_type = 'user' AND m.sender_id = u.id
      LEFT JOIN drivers d ON m.sender_type = 'driver' AND m.sender_id = d.id
      WHERE m.ride_id = ${ride_id}
      ORDER BY m.created_at ASC;
    `;

    return Response.json({ data: messages }, { status: 200 });
  } catch (error) {
    console.error("Error fetching messages:", error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: "Internal Server Error", details: errorMsg, dbUrl: process.env.DATABASE_URL ? "set" : "missing" },
      { status: 500 }
    );
  }
}

// POST - Send a new message
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ride_id, sender_type, sender_id, message } = body;

    if (!ride_id || !sender_type || !sender_id || !message) {
      return Response.json(
        { error: "Missing required fields: ride_id, sender_type, sender_id, message" },
        { status: 400 }
      );
    }

    if (!["user", "driver"].includes(sender_type)) {
      return Response.json(
        { error: "sender_type must be 'user' or 'driver'" },
        { status: 400 }
      );
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Insert the message
    const result = await sql`
      INSERT INTO ride_messages (ride_id, sender_type, sender_id, message)
      VALUES (${ride_id}, ${sender_type}, ${sender_id}, ${message})
      RETURNING *;
    `;

    return Response.json({ data: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Error sending message:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH - Mark messages as read
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { ride_id, reader_type } = body;

    if (!ride_id || !reader_type) {
      return Response.json(
        { error: "Missing required fields: ride_id, reader_type" },
        { status: 400 }
      );
    }

    // Mark messages from the other party as read
    const other_type = reader_type === "user" ? "driver" : "user";

    const sql = neon(`${process.env.DATABASE_URL}`);

    await sql`
      UPDATE ride_messages
      SET is_read = true
      WHERE ride_id = ${ride_id}
        AND sender_type = ${other_type}
        AND is_read = false;
    `;

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
