import { and, asc, eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { getDepartmentByStageName } from "@/lib/departments";
import { ensureDepartmentStages, getResolvedDepartments } from "@/server/departments";

export const dynamic = "force-dynamic";

/** Datos completos del kanban: etapas ordenadas + tarjetas con su contacto. */
export const GET = withAuth(async (session) => {
  const db = getDb();

  const [stages, departments] = await Promise.all([
    ensureDepartmentStages(session.organizationId),
    getResolvedDepartments(session.organizationId),
  ]);

  const leads = await db
    .select({
      lead: schema.lead,
      contact: schema.contact,
      conversationId: schema.conversation.id,
    })
    .from(schema.lead)
    .innerJoin(schema.contact, eq(schema.lead.contactId, schema.contact.id))
    .leftJoin(
      schema.conversation,
      and(
        eq(schema.conversation.contactId, schema.contact.id),
        eq(schema.conversation.isTest, false)
      )
    )
    .where(scoped(schema.lead.organizationId, session.organizationId))
    .orderBy(asc(schema.lead.position));

  return Response.json({
    stages: stages.map((s) => {
      const dep = getDepartmentByStageName(s.name, departments, s.departmentId);
      return {
        id: s.id,
        name: s.name,
        position: s.position,
        kind: s.kind,
        departmentId: dep?.id ?? s.departmentId ?? "comercial",
        assignedName: dep?.assignedName ?? null,
        assignedEmail: dep?.assignedEmail ?? null,
        badgeColor: dep?.badgeColor ?? null,
      };
    }),
    leads: leads.map((r) => ({
      id: r.lead.id,
      stageId: r.lead.stageId,
      position: r.lead.position,
      lastActivityAt: r.lead.lastActivityAt?.toISOString() ?? null,
      contact: {
        id: r.contact.id,
        name: r.contact.name,
        phone: r.contact.phone,
      },
      conversationId: r.conversationId,
    })),
  });
});
