import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const driverId = body?.driver_id ? Number(body.driver_id) : null;
    const profileImage = body?.profile_image_url;

    if (!driverId || !profileImage) {
      return Response.json(
        { error: "Missing driver_id or profile_image_url" },
        { status: 400 },
      );
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    const result = await sql`
      UPDATE drivers
      SET profile_image_url = ${profileImage}
      WHERE id = ${driverId}
      RETURNING
        id,
        first_name,
        last_name,
        profile_image_url;
    `;

    if (!result || result.length === 0) {
      return Response.json({ error: "Driver not found" }, { status: 404 });
    }

    return Response.json({ data: result[0] }, { status: 200 });
  } catch (error) {
    console.error("Error updating driver photo:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
