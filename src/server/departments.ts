import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import { DEPARTMENTS, type DepartmentConfig } from "@/lib/departments";

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

export type DepartmentAssignmentMap = Record<
  string,
  { name: string; email: string }
>;

/**
 * Obtiene las asignaciones de departamento guardadas en organization.metadata
 */
export async function getDepartmentAssignments(
  organizationId: string
): Promise<DepartmentAssignmentMap> {
  const db = getDb();
  const rows = await db
    .select({ metadata: schema.organization.metadata })
    .from(schema.organization)
    .where(eq(schema.organization.id, organizationId))
    .limit(1);

  if (!rows[0]?.metadata) return {};
  try {
    const meta = JSON.parse(rows[0].metadata) as Record<string, unknown>;
    return (meta.departmentAssignments as DepartmentAssignmentMap) ?? {};
  } catch {
    return {};
  }
}

/**
 * Guarda las asignaciones de departamento en organization.metadata
 */
export async function saveDepartmentAssignments(
  organizationId: string,
  assignments: DepartmentAssignmentMap
): Promise<void> {
  const db = getDb();
  const rows = await db
    .select({ metadata: schema.organization.metadata })
    .from(schema.organization)
    .where(eq(schema.organization.id, organizationId))
    .limit(1);

  let meta: Record<string, unknown> = {};
  if (rows[0]?.metadata) {
    try {
      meta = JSON.parse(rows[0].metadata) as Record<string, unknown>;
    } catch {}
  }
  meta.departmentAssignments = assignments;

  await db
    .update(schema.organization)
    .set({ metadata: JSON.stringify(meta) })
    .where(eq(schema.organization.id, organizationId));
}

/**
 * Retorna la lista de departamentos de la organización, incorporando
 * los responsables personalizados si fueron asignados.
 */
export async function getResolvedDepartments(
  organizationId?: string | null
): Promise<DepartmentConfig[]> {
  if (!organizationId) return DEPARTMENTS;
  const assignments = await getDepartmentAssignments(organizationId);
  return DEPARTMENTS.map((d) => {
    const custom = assignments[d.id];
    if (custom && custom.name && custom.email) {
      return {
        ...d,
        assignedName: custom.name,
        assignedEmail: custom.email,
      };
    }
    return d;
  });
}

