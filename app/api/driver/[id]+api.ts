import { neon } from "@neondatabase/serverless";

const toNumber = (value: unknown) => {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

export async function GET(_request: Request, { id }: { id: string }) {
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const driverId = Number(id);
    if (!Number.isFinite(driverId)) {
      return Response.json({ error: "Invalid id" }, { status: 400 });
    }

    const rows = await sql`SELECT * FROM drivers WHERE id = ${driverId} LIMIT 1;`;
    const row = rows?.[0];
    if (!row) {
      return Response.json({ error: "Driver not found" }, { status: 404 });
    }

    return Response.json({ data: row });
  } catch (error) {
    console.error("Error fetching driver:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { id }: { id: string }) {
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const driverId = Number(id);
    if (!Number.isFinite(driverId)) {
      return Response.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await request.json();
    const {
      first_name,
      last_name,
      profile_image_url,
      car_image_url,
      car_seats,
      rating,
    } = body ?? {};

    const seats = toNumber(car_seats);
    const safeSeats =
      seats == null ? null : Math.max(1, Math.floor(seats));

    const parsedRating = toNumber(rating);
    const safeRating =
      parsedRating == null ? null : Math.max(0, Math.min(5, parsedRating));

    const rows = await sql`
      UPDATE drivers
      SET
        first_name = COALESCE(${first_name != null ? String(first_name) : null}, first_name),
        last_name = COALESCE(${last_name != null ? String(last_name) : null}, last_name),
        profile_image_url = COALESCE(${profile_image_url != null ? String(profile_image_url) : null}, profile_image_url),
        car_image_url = COALESCE(${car_image_url != null ? String(car_image_url) : null}, car_image_url),
        car_seats = COALESCE(${safeSeats}, car_seats),
        rating = COALESCE(${safeRating}, rating)
      WHERE id = ${driverId}
      RETURNING *;
    `;

    const row = rows?.[0];
    if (!row) {
      return Response.json({ error: "Driver not found" }, { status: 404 });
    }

    return Response.json({ data: row });
  } catch (error) {
    console.error("Error updating driver:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { id }: { id: string }) {
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const driverId = Number(id);
    if (!Number.isFinite(driverId)) {
      return Response.json({ error: "Invalid id" }, { status: 400 });
    }

    const rows = await sql`
      DELETE FROM drivers
      WHERE id = ${driverId}
      RETURNING *;
    `;

    const row = rows?.[0];
    if (!row) {
      return Response.json({ error: "Driver not found" }, { status: 404 });
    }

    return Response.json({ data: row }, { status: 200 });
  } catch (error) {
    console.error("Error deleting driver:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

