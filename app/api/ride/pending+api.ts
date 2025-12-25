import { neon } from "@neondatabase/serverless";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const driverLatParam = searchParams.get("driver_lat");
    const driverLngParam = searchParams.get("driver_lng");
    const maxDistanceParam = searchParams.get("max_distance") || "20"; // default 20 miles

    if (!driverLatParam || !driverLngParam) {
      return Response.json(
        { error: "Missing driver location parameters" },
        { status: 400 }
      );
    }

    const driverLat = parseFloat(driverLatParam);
    const driverLng = parseFloat(driverLngParam);
    const maxDistance = parseFloat(maxDistanceParam);

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Helper: fetch route metrics (prefers ORS with your key, falls back to OSRM)
    const getRouteMetrics = async (
      start: { lat: number; lng: number },
      end: { lat: number; lng: number },
    ): Promise<{ miles: number; minutes: number } | null> => {
      const orsKey = process.env.EXPO_PUBLIC_OPENROUTE_API_KEY;
      // Try ORS first (supports better routing)
      if (orsKey) {
        try {
          const url = `https://api.openrouteservice.org/v2/directions/driving-car?start=${start.lng},${start.lat}&end=${end.lng},${end.lat}`;
          const res = await fetch(url, {
            headers: {
              "Authorization": orsKey,
              "Content-Type": "application/json",
              "Accept": "application/json, application/geo+json",
            },
          });
          if (res.ok) {
            const json = await res.json();
            const summary = json?.features?.[0]?.properties?.summary;
            if (summary) {
              const miles = (summary.distance ?? 0) / 1609.34; // meters to miles
              const minutes = (summary.duration ?? 0) / 60;     // seconds to minutes
              return { miles, minutes };
            }
          }
        } catch (e) {
          console.warn("ORS metrics error", e);
        }
      }

      // Fallback: OSRM (no traffic)
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=false`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const json = await res.json();
        const route = json?.routes?.[0];
        if (!route) return null;
        const miles = (route.distance ?? 0) / 1609.34;
        const minutes = (route.duration ?? 0) / 60;
        return { miles, minutes };
      } catch (e) {
        console.warn("OSRM metrics error", e);
        return null;
      }
    };

    // Get pending rides (no driver assigned yet)
    const pendingRides = await sql`
      SELECT
        r.ride_id,
        r.origin_address,
        r.destination_address,
        r.origin_latitude,
        r.origin_longitude,
        r.destination_latitude,
        r.destination_longitude,
        r.fare_price,
        r.ride_time,
        r.created_at,
        u.name as user_name,
        u.id as user_id
      FROM rides r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.driver_id IS NULL
        AND r.ride_status = 'pending'
      ORDER BY r.created_at DESC
      LIMIT 50;
    `;

    // Calculate distance from driver to each pickup location using Haversine formula
    const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const toRad = (v: number) => (v * Math.PI) / 180;
      const R = 3958.8; // Earth radius in miles
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

    // Filter rides within max distance and add distance info
    // Use Haversine first to pre-filter, then only fetch routes for nearby rides
    const ridesWithDistance = [];

    for (const ride of pendingRides) {
      // Quick distance check with Haversine
      const straightLineDistance = haversineDistance(
        driverLat,
        driverLng,
        Number(ride.origin_latitude),
        Number(ride.origin_longitude)
      );

      // Skip rides that are obviously too far (add 50% buffer for road distance)
      if (straightLineDistance > maxDistance * 1.5) {
        continue;
      }

      // Use Haversine estimates instead of external API calls for speed
      const pickupMiles = straightLineDistance;
      const pickupMinutes = Math.round((pickupMiles / 30) * 60); // Assume 30 mph average

      const tripDistance = haversineDistance(
        Number(ride.origin_latitude),
        Number(ride.origin_longitude),
        Number(ride.destination_latitude),
        Number(ride.destination_longitude)
      );
      const tripMinutes = Math.round((tripDistance / 50) * 60); // Assume 50 mph average

      ridesWithDistance.push({
        ...ride,
        distance_to_pickup: pickupMiles,
        estimated_pickup_time: pickupMinutes,
        ride_distance: tripDistance,
        ride_duration: tripMinutes,
      });
    }

    const filtered = ridesWithDistance
      .filter((ride) => {
        const d = Number(ride.distance_to_pickup ?? NaN);
        const trip = Number(ride.ride_distance ?? NaN);
        return Number.isFinite(d) && Number.isFinite(trip) && d <= maxDistance;
      })
      .sort((a, b) => a.distance_to_pickup - b.distance_to_pickup);

    return Response.json({ data: filtered });
  } catch (error) {
    console.error("Error fetching pending rides:", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
