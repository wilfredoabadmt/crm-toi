import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import { DEPARTMENTS } from "@/lib/departments";

/**
 * Asegura que los 4 departamentos oficiales existan en la base de datos
 * como etapas del pipeline para la organización especificada.
 */
export async function ensureDepartmentStages(organizationId: string) {
  const db = getDb();
  let stages = await db
    .select()
    .from(schema.pipelineStage)
    .where(scoped(schema.pipelineStage.organizationId, organizationId))
    .orderBy(asc(schema.pipelineStage.position));

  const existingNames = new Set(stages.map((s) => s.name.toLowerCase()));
  const missingDeps = DEPARTMENTS.filter(
    (d) => !existingNames.has(d.name.toLowerCase())
  );

  if (missingDeps.length > 0) {
    const maxPos = stages.length > 0 ? Math.max(...stages.map((s) => s.position)) : -1;
    for (let i = 0; i < missingDeps.length; i++) {
      const dep = missingDeps[i]!;
      await db.insert(schema.pipelineStage).values({
        id: newId("stage"),
        organizationId,
        name: dep.name,
        position: maxPos + 1 + i,
        kind: "open",
      });
    }
    stages = await db
      .select()
      .from(schema.pipelineStage)
      .where(scoped(schema.pipelineStage.organizationId, organizationId))
      .orderBy(asc(schema.pipelineStage.position));
  }

  return stages;
}
