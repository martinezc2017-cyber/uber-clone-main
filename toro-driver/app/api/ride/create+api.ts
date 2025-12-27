import {neon} from "@neondatabase/serverless";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            origin_address,
            destination_address,
            origin_latitude,
            origin_longitude,
            destination_latitude,
            destination_longitude,
            ride_time,
            fare_price,
            payment_status,
            driver_id,
            user_id,
            clerk_id,
            user_name,
            user_email,
        } = body;

        if (
            !origin_address ||
            !destination_address ||
            !origin_latitude ||
            !origin_longitude ||
            !destination_latitude ||
            !destination_longitude ||
            !ride_time ||
            !fare_price ||
            !payment_status ||
            !(user_id || clerk_id)
        ) {
            return Response.json(
                {error: "Missing required fields"},
                {status: 400},
            );
        }

        const driverId = driver_id ? Number(driver_id) : null;
        const sql = neon(`${process.env.DATABASE_URL}`);

        let resolvedUserId: number | null = null;
        if (user_id) {
            const uid = Number(user_id);
            resolvedUserId = Number.isFinite(uid) ? uid : null;
        }

        if (!resolvedUserId && clerk_id) {
            const existing = await sql`
              SELECT id FROM users WHERE clerk_id = ${String(clerk_id)} LIMIT 1;
            `;
            if (existing?.length) {
                resolvedUserId = Number(existing[0].id);
            } else {
                const inserted = await sql`
                  INSERT INTO users (name, email, clerk_id)
                  VALUES (${user_name ?? "Rydo User"}, ${user_email ?? "user@example.com"}, ${String(clerk_id)})
                  ON CONFLICT (clerk_id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email
                  RETURNING id;
                `;
                resolvedUserId = Number(inserted?.[0]?.id) || null;
            }
        }

        if (!resolvedUserId) {
            return Response.json({ error: "Could not resolve user" }, { status: 400 });
        }

        const response = await sql`
        INSERT INTO rides (
          origin_address,
          destination_address,
          origin_latitude,
          origin_longitude,
          destination_latitude,
          destination_longitude,
          ride_time,
          fare_price,
          payment_status,
          ride_status,
          driver_id,
          user_id
        ) VALUES (
          ${origin_address},
          ${destination_address},
          ${origin_latitude},
          ${origin_longitude},
          ${destination_latitude},
          ${destination_longitude},
          ${ride_time},
          ${fare_price},
          ${payment_status},
          'pending',
          ${driverId},
          ${resolvedUserId}
        )
        RETURNING *;
        `;

        return Response.json({data: response[0]}, {status: 201});
    } catch (error) {
        console.error("Error inserting data into recent_rides:", error);
        return Response.json({error: "Internal Server Error"}, {status: 500});
    }
}
