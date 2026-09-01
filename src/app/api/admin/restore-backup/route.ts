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

    const order = [
      "user",
      "account",
      "organization",
      "member",
      "session",
      "agent_profile",
      "pipeline_stage",
      "contact",
      "conversation",
      "message",
      "agent_test_run",
      "agent_test_case"
    ];

    const results: Record<string, number> = {};

    for (const tableName of order) {
      const rows = payload[tableName];
      if (Array.isArray(rows) && rows.length > 0) {
        await sql.unsafe(`TRUNCATE TABLE "${tableName}" CASCADE;`);
        await sql`INSERT INTO ${sql(tableName)} ${sql(rows)}`;
        results[tableName] = rows.length;
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
