import { neon } from "@neondatabase/serverless";

const haversineMiles = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 3958.8; // miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const driverIdParam = searchParams.get("driver_id");
    const driverId = driverIdParam ? Number(driverIdParam) : null;

    if (!driverId) {
      return Response.json({ error: "Missing driver_id" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    const driverRows = await sql`
      SELECT
        id,
        first_name,
        last_name,
        profile_image_url,
        car_image_url,
        car_seats,
        rating,
        created_at
      FROM drivers
      WHERE id = ${driverId}
      LIMIT 1;
    `;

    if (!driverRows || driverRows.length === 0) {
      return Response.json({ error: "Driver not found" }, { status: 404 });
    }

    const rides = await sql`
      SELECT
        ride_id,
        origin_latitude,
        origin_longitude,
        destination_latitude,
        destination_longitude,
        ride_time,
        fare_price,
        payment_status,
        created_at
      FROM rides
      WHERE driver_id = ${driverId}
      ORDER BY created_at DESC;
    `;

    const totalRides = rides.length;
    const totalEarnings = rides.reduce(
      (sum, r) => sum + Number(r.fare_price || 0),
      0,
    );
    const totalMinutes = rides.reduce(
      (sum, r) => sum + Number(r.ride_time || 0),
      0,
    );
    const totalHours = totalMinutes / 60;
    const totalMiles = rides.reduce((sum, r) => {
      const lat1 = Number(r.origin_latitude);
      const lon1 = Number(r.origin_longitude);
      const lat2 = Number(r.destination_latitude);
      const lon2 = Number(r.destination_longitude);
      if (
        [lat1, lon1, lat2, lon2].some(
          (v) => v == null || Number.isNaN(Number(v)),
        )
      ) {
        return sum;
      }
      return sum + haversineMiles(lat1, lon1, lat2, lon2);
    }, 0);

    return Response.json({
      data: {
        driver: driverRows[0],
        stats: {
          totalRides,
          totalEarnings,
          totalHours,
          totalMiles,
        },
        rides,
      },
    });
  } catch (error) {
    console.error("Error fetching driver profile:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
