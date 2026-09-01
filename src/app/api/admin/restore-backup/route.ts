import { NextResponse } from "next/server";
import postgres from "postgres";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.PROVISIONING_SECRET ?? "dev-provisioning-secret";
  
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json();
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });
  }

  const sql = postgres(dbUrl, { max: 1 });

  try {
    // Disable foreign key constraints temporarily
    await sql.unsafe(`SET session_replication_role = 'replica';`);

    const targetTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    const targetTableNames = new Set(targetTables.map((t) => t.table_name));

    const results: Record<string, number> = {};

    // First truncate target tables
    for (const tableName of Object.keys(payload)) {
      if (targetTableNames.has(tableName)) {
        await sql.unsafe(`TRUNCATE TABLE "${tableName}" CASCADE;`);
      }
    }

    // Insert all tables in payload
    for (const [tableName, rows] of Object.entries(payload)) {
      if (targetTableNames.has(tableName) && Array.isArray(rows) && rows.length > 0) {
        const cols = await sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = ${tableName}
        `;
        const validCols = new Set(cols.map((c) => c.column_name));

        const sanitizedRows = rows.map((r: Record<string, any>) => {
          const clean: Record<string, any> = {};
          for (const [k, v] of Object.entries(r)) {
            if (validCols.has(k)) {
              clean[k] = v;
            }
          }
          return clean;
        });

        // Insert in batches of 200 rows
        const BATCH_SIZE = 200;
        for (let i = 0; i < sanitizedRows.length; i += BATCH_SIZE) {
          const batch = sanitizedRows.slice(i, i + BATCH_SIZE);
          await sql`INSERT INTO ${sql(tableName)} ${sql(batch)}`;
        }
        results[tableName] = sanitizedRows.length;
      }
    }

    // Re-enable foreign key constraints
    await sql.unsafe(`SET session_replication_role = 'origin';`);

    return NextResponse.json({ ok: true, restored: results });
  } catch (err: any) {
    console.error("[restore-backup error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    await sql.end();
  }
}
