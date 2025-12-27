import { neon } from "@neondatabase/serverless";

type RideRow = {
  ride_id: number;
  driver_id: number | null;
  origin_latitude: number;
  origin_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  ride_status: string | null;
  miles_traveled: number | null;
};

const columnExists = async (sql: any, table: string, column: string) => {
  try {
    const rows = await sql`
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = ${table} AND column_name = ${column}
      LIMIT 1;
    `;
    return Array.isArray(rows) && rows.length > 0;
  } catch (e) {
    console.warn(`columnExists check failed for ${table}.${column}`, e);
    return false;
  }
};

const tableExists = async (sql: any, table: string) => {
  try {
    const rows = await sql`
      SELECT 1
      FROM information_schema.tables
      WHERE table_name = ${table}
      LIMIT 1;
    `;
    return Array.isArray(rows) && rows.length > 0;
  } catch (e) {
    console.warn(`tableExists check failed for ${table}`, e);
    return false;
  }
};

// Haversine distance in miles
const haversineMiles = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 3958.8;
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

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch (err) {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const rideId = Number(body?.ride_id);
    const driverId = Number(body?.driver_id);
    const lat = Number(body?.latitude);
    const lng = Number(body?.longitude);
    const hasValidIds = Number.isFinite(rideId) && rideId > 0 && Number.isFinite(driverId) && driverId > 0;
    const hasValidCoords = Number.isFinite(lat) && Number.isFinite(lng);

    if (!hasValidIds || !hasValidCoords) {
      return Response.json(
        { error: "Missing or invalid ride_id, driver_id, latitude, or longitude" },
        { status: 400 },
      );
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    const hasRideLocations = await tableExists(sql, "ride_locations");
    const hasMilesColumn = await columnExists(sql, "rides", "miles_traveled");

    // Fetch ride to validate
    const rides = (hasMilesColumn
      ? await sql`
          SELECT ride_id, driver_id, origin_latitude, origin_longitude, destination_latitude, destination_longitude,
                 ride_status, miles_traveled
          FROM rides
          WHERE ride_id = ${rideId}
          LIMIT 1;
        `
      : await sql`
          SELECT ride_id, driver_id, origin_latitude, origin_longitude, destination_latitude, destination_longitude,
                 ride_status
          FROM rides
          WHERE ride_id = ${rideId}
          LIMIT 1;
        `) as RideRow[];

    if (!rides?.length) {
      return Response.json({ error: "Ride not found" }, { status: 404 });
    }

    const ride = rides[0];
    if (ride.driver_id && ride.driver_id !== driverId) {
      return Response.json({ error: "Driver mismatch for this ride" }, { status: 403 });
    }

    if (ride.ride_status === "cancelled" || ride.ride_status === "completed") {
      return Response.json({ error: "Ride is not active" }, { status: 400 });
    }

    // Get last location for this ride to compute incremental distance
    const lastLoc = hasRideLocations
      ? await sql`
          SELECT lat, lng
          FROM ride_locations
          WHERE ride_id = ${rideId}
          ORDER BY recorded_at DESC
          LIMIT 1;
        `
      : [];

    let addedMiles = 0;
    if (lastLoc?.length) {
      addedMiles = haversineMiles(
        Number(lastLoc[0].lat),
        Number(lastLoc[0].lng),
        lat,
        lng,
      );
    } else {
      // If no previous point, compute from pickup as a baseline (optional)
      addedMiles = haversineMiles(
        Number(ride.origin_latitude),
        Number(ride.origin_longitude),
        lat,
        lng,
      );
    }

    const milesSoFar = hasMilesColumn ? Number(ride.miles_traveled ?? 0) || 0 : 0;
    const totalMiles = milesSoFar + addedMiles;

    // Insert location
    if (hasRideLocations) {
      try {
        await sql`
          INSERT INTO ride_locations (ride_id, driver_id, lat, lng)
          VALUES (${rideId}, ${driverId}, ${lat}, ${lng});
        `;
      } catch (e) {
        console.warn("Could not insert ride_location (table missing?)", e);
      }
    }

    // Update ride miles (if column exists) and driver_status position
    if (hasMilesColumn) {
      await sql`
        UPDATE rides
        SET miles_traveled = ${totalMiles}
        WHERE ride_id = ${rideId};
      `;
    }
    await sql`
      INSERT INTO driver_status (driver_id, status, latitude, longitude, updated_at)
      VALUES (${driverId}, 'online', ${lat}, ${lng}, NOW())
      ON CONFLICT (driver_id) DO UPDATE SET
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        updated_at = NOW();
    `;

    return Response.json(
      {
        data: {
          ride_id: rideId,
          driver_id: driverId,
          miles_traveled: totalMiles,
          added_miles: addedMiles,
          speed_mph: null,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating ride location:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
