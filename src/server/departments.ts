import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import {
  DEPARTMENTS,
  RECOMMENDED_DEPARTMENT_STAGES,
  getRecommendedStagesForDepartment,
  resolveDepartmentIdForStage,
  type DepartmentConfig,
} from "@/lib/departments";

/**
 * Asegura que existan las etapas por departamento en la base de datos
 * para la organización especificada, asignando departmentId.
 */
export async function ensureDepartmentStages(organizationId: string) {
  const db = getDb();
  let stages = await db
    .select()
    .from(schema.pipelineStage)
    .where(scoped(schema.pipelineStage.organizationId, organizationId))
    .orderBy(asc(schema.pipelineStage.position));

  // 1. Asignar departmentId a etapas existentes que aún no lo tengan
  for (const s of stages) {
    if (!s.departmentId) {
      const resolvedDepId = resolveDepartmentIdForStage(s);
      await db
        .update(schema.pipelineStage)
        .set({ departmentId: resolvedDepId })
        .where(eq(schema.pipelineStage.id, s.id));
      s.departmentId = resolvedDepId;
    }
  }

  // 2. Verificar que cada departamento cuente con sus etapas especializadas
  let maxPos = stages.length > 0 ? Math.max(...stages.map((s) => s.position)) : -1;
  let addedAny = false;

  const allDepartments = await getResolvedDepartments(organizationId);

  for (const dep of allDepartments) {
    const existingInDep = stages.filter((s) => s.departmentId === dep.id);
    const hasOnlyLegacySingleStage =
      existingInDep.length === 1 &&
      (existingInDep[0]!.name.toLowerCase() === dep.name.toLowerCase() ||
        existingInDep[0]!.name.toLowerCase() === dep.shortName.toLowerCase());

    if (existingInDep.length === 0 || hasOnlyLegacySingleStage) {
      const recommended = getRecommendedStagesForDepartment(dep);
      for (const item of recommended) {
        if (stages.some((s) => s.name.toLowerCase() === item.name.toLowerCase() && s.departmentId === dep.id)) {
          continue;
        }
        maxPos += 1;
        await db.insert(schema.pipelineStage).values({
          id: newId("stage"),
          organizationId,
          departmentId: dep.id,
          name: item.name,
          position: maxPos,
          kind: item.kind,
        });
        addedAny = true;
      }
    }
  }

  if (addedAny) {
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
  {
    name: string;
    email: string;
    memberEmails?: string[];
    members?: { name: string; email: string }[];
  }
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
 * Obtiene los departamentos o sucursales personalizados guardados en organization.metadata
 */
export async function getCustomDepartments(
  organizationId: string
): Promise<DepartmentConfig[]> {
  const db = getDb();
  const rows = await db
    .select({ metadata: schema.organization.metadata })
    .from(schema.organization)
    .where(eq(schema.organization.id, organizationId))
    .limit(1);

  if (!rows[0]?.metadata) return [];
  try {
    const meta = JSON.parse(rows[0].metadata) as Record<string, unknown>;
    return (meta.customDepartments as DepartmentConfig[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * Guarda los departamentos o sucursales personalizados en organization.metadata
 */
export async function saveCustomDepartments(
  organizationId: string,
  customDepartments: DepartmentConfig[]
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
  meta.customDepartments = customDepartments;

  await db
    .update(schema.organization)
    .set({ metadata: JSON.stringify(meta) })
    .where(eq(schema.organization.id, organizationId));
}

/**
 * Remueve un correo de todos los departamentos en organization.metadata,
 * reasignando el titular si coincide con un miembro sustituto.
 */
export async function removeMemberFromAllDepartments(
  organizationId: string,
  userEmail: string,
  replacementLead?: { name: string; email: string }
): Promise<void> {
  const assignments = await getDepartmentAssignments(organizationId);
  const lower = userEmail.trim().toLowerCase();
  let changed = false;

  for (const depId of Object.keys(assignments)) {
    const dep = assignments[depId];
    if (!dep) continue;

    if (dep.memberEmails) {
      const filtered = dep.memberEmails.filter(
        (e) => e.trim().toLowerCase() !== lower
      );
      if (filtered.length !== dep.memberEmails.length) {
        dep.memberEmails = filtered;
        changed = true;
      }
    }

    if (dep.email.trim().toLowerCase() === lower && replacementLead) {
      dep.name = replacementLead.name;
      dep.email = replacementLead.email;
      changed = true;
    }
  }

  if (changed) {
    await saveDepartmentAssignments(organizationId, assignments);
  }
}

/**
 * Retorna la lista de departamentos de la organización, incorporando
 * los departamentos base + las sucursales o departamentos creados,
 * junto con sus responsables y miembros asignados.
 */
export async function getResolvedDepartments(
  organizationId?: string | null
): Promise<DepartmentConfig[]> {
  if (!organizationId) return DEPARTMENTS;
  const [assignments, customDeps] = await Promise.all([
    getDepartmentAssignments(organizationId),
    getCustomDepartments(organizationId),
  ]);

  const allDepartments = [...DEPARTMENTS, ...customDeps];

  return allDepartments.map((d) => {
    const custom = assignments[d.id];
    if (custom && custom.name && custom.email) {
      const customEmails =
        custom.memberEmails !== undefined
          ? custom.memberEmails
          : d.memberEmails ?? [];
      const allEmails = Array.from(
        new Set([
          custom.email.trim().toLowerCase(),
          ...customEmails.map((e) => e.trim().toLowerCase()),
        ])
      );
      return {
        ...d,
        assignedName: custom.name,
        assignedEmail: custom.email,
        memberEmails: allEmails,
        members: custom.members,
      };
    }
    return d;
  });
}

