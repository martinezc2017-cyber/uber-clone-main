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

const toNumberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export async function GET(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    await ensureWaitlistTable(sql);

    const url = new URL(request.url);
    const statusParam = normalize(url.searchParams.get("status") || "").toLowerCase();
    const statusFilter = allowedStatuses.has(statusParam) ? statusParam : null;

    const rows = statusFilter
      ? await sql`
          SELECT * FROM driver_waitlist
          WHERE status = ${statusFilter}
          ORDER BY created_at DESC;
        `
      : await sql`
          SELECT * FROM driver_waitlist
          ORDER BY created_at DESC;
        `;

    return Response.json({ data: rows });
  } catch (error) {
    console.error("Error fetching driver waitlist:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    await ensureWaitlistTable(sql);

    const body = await request.json();
    const firstName = normalize(body?.first_name);
    const lastName = normalize(body?.last_name);
    const email = normalize(body?.email).toLowerCase();
    const phone = normalize(body?.phone);
    const city = normalize(body?.city);
    const vehicle = normalize(body?.vehicle);
    const experienceYears = toNumberOrNull(body?.experience_years);
    const notes = normalize(body?.notes);
    const source = normalize(body?.source) || "app";

    if (!firstName || !lastName || !email) {
      return Response.json(
        { error: "Faltan nombre, apellido o email" },
        { status: 400 },
      );
    }

    const safeExperience = experienceYears != null ? Math.max(0, Math.min(60, experienceYears)) : null;

    const rows = await sql`
      INSERT INTO driver_waitlist (
        first_name,
        last_name,
        email,
        phone,
        city,
        vehicle,
        experience_years,
        status,
        source,
        notes
      ) VALUES (
        ${firstName},
        ${lastName},
        ${email},
        ${phone || null},
        ${city || null},
        ${vehicle || null},
        ${safeExperience},
        'pending',
        ${source},
        ${notes || null}
      )
      ON CONFLICT (email) DO UPDATE
      SET first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          phone = EXCLUDED.phone,
          city = EXCLUDED.city,
          vehicle = EXCLUDED.vehicle,
          experience_years = EXCLUDED.experience_years,
          source = COALESCE(EXCLUDED.source, driver_waitlist.source),
          updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    return Response.json({ data: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating driver waitlist entry:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
