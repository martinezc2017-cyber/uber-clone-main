import { neon } from "@neondatabase/serverless";

const allowedStatuses = new Set(["pending", "approved", "rejected"]);

const ensureWaitlistTable = async (sql: any) => {
  await sql`
    CREATE TABLE IF NOT EXISTS driver_waitlist (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(30),
      city VARCHAR(120),
      vehicle TEXT,
      experience_years INTEGER,
      status VARCHAR(20) DEFAULT 'pending',
      source VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_waitlist_email ON driver_waitlist(email);`;
};

const normalize = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export async function PATCH(request: Request, { id }: { id: string }) {
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    await ensureWaitlistTable(sql);

    const waitlistId = Number(id);
    if (!Number.isFinite(waitlistId)) {
      return Response.json({ error: "Invalid id" }, { status: 400 });
    }

    const existingRows = await sql`
      SELECT * FROM driver_waitlist WHERE id = ${waitlistId} LIMIT 1;
    `;
    const existing = existingRows?.[0];
    if (!existing) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    const body = await request.json();
    const requestedStatus = normalize(body?.status).toLowerCase();
    const status = allowedStatuses.has(requestedStatus) ? requestedStatus : null;
    const notes = normalize(body?.notes);
    const promoteToDriver = Boolean(body?.promote_to_driver ?? body?.create_driver);

    const updatedRows = await sql`
      UPDATE driver_waitlist
      SET
        status = COALESCE(${status}, status),
        notes = COALESCE(${notes || null}, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${waitlistId}
      RETURNING *;
    `;

    const updated = updatedRows?.[0];
    if (!updated) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    let driver: any = null;
    if (promoteToDriver && updated.status === "approved") {
      const existingDriver = await sql`
        SELECT id, first_name, last_name FROM drivers
        WHERE LOWER(first_name) = LOWER(${updated.first_name})
          AND LOWER(last_name) = LOWER(${updated.last_name})
        LIMIT 1;
      `;

      if (existingDriver?.[0]) {
        driver = existingDriver[0];
      } else {
        const inserted = await sql`
          INSERT INTO drivers (
            first_name,
            last_name,
            profile_image_url,
            car_image_url,
            car_seats,
            rating
          ) VALUES (
            ${updated.first_name},
            ${updated.last_name},
            NULL,
            NULL,
            4,
            5.0
          )
          RETURNING *;
        `;
        driver = inserted?.[0] ?? null;
      }
    }

    return Response.json({ data: updated, driver });
  } catch (error) {
    console.error("Error updating driver waitlist entry:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { id }: { id: string }) {
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    await ensureWaitlistTable(sql);

    const waitlistId = Number(id);
    if (!Number.isFinite(waitlistId)) {
      return Response.json({ error: "Invalid id" }, { status: 400 });
    }

    const deleted = await sql`
      DELETE FROM driver_waitlist
      WHERE id = ${waitlistId}
      RETURNING *;
    `;

    if (!deleted?.[0]) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    return Response.json({ data: deleted[0] });
  } catch (error) {
    console.error("Error deleting driver waitlist entry:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
