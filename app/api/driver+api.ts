import { neon } from "@neondatabase/serverless";

export async function GET() {
    try {
        const sql = neon(`${process.env.DATABASE_URL}`);

        const response = await sql`
          SELECT * FROM drivers
          ORDER BY created_at DESC;
        `;

        return Response.json({ data: response });
    } catch (error){
        console.log(error);
        return Response.json({ error: error });
    }
}

export async function POST(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const body = await request.json();

    const {
      first_name,
      last_name,
      profile_image_url,
      car_image_url,
      car_seats,
      rating,
    } = body ?? {};

    if (!first_name || !last_name) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const seats = car_seats != null ? Number(car_seats) : 4;
    const safeSeats = Number.isFinite(seats) ? Math.max(1, Math.floor(seats)) : 4;

    const parsedRating =
      rating != null && rating !== ""
        ? Number(rating)
        : 5.0;
    const safeRating = Number.isFinite(parsedRating)
      ? Math.max(0, Math.min(5, parsedRating))
      : 5.0;

    const response = await sql`
      INSERT INTO drivers (
        first_name,
        last_name,
        profile_image_url,
        car_image_url,
        car_seats,
        rating
      ) VALUES (
        ${String(first_name)},
        ${String(last_name)},
        ${profile_image_url ? String(profile_image_url) : null},
        ${car_image_url ? String(car_image_url) : null},
        ${safeSeats},
        ${safeRating}
      )
      RETURNING *;
    `;

    return Response.json({ data: response[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating driver:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
