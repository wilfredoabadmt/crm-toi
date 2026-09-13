import { and, eq, gte, lte } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { DEPARTMENTS, getDepartmentByStageName } from "@/lib/departments";

export type DateRange = "today" | "7d" | "30d" | "month";

export interface AnalyticsSummary {
  range: DateRange;
  startDate: string;
  endDate: string;
  kpis: {
    totalConversations: number;
    inboundMessages: number;
    outboundMessages: number;
    totalMessages: number;
    aiGeneratedMessages: number;
    aiAutomationRate: number; // porcentaje 0 - 100
    totalLeads: number;
    wonLeads: number;
    conversionRate: number; // porcentaje 0 - 100
    totalAppointments: number;
    completedAppointments: number;
    unreadConversations: number;
  };
  hourlyActivity: Array<{
    hour: string; // "00", "01" ... "23"
    label: string; // "00:00", "01:00"
    inbound: number;
    outbound: number;
    total: number;
  }>;
  peakHour: {
    hour: string;
    total: number;
  };
  weekdayActivity: Array<{
    day: string; // "Lun", "Mar", etc.
    dayNum: number; // 1 .. 7
    total: number;
  }>;
  pipelineBreakdown: Array<{
    stageId: string;
    stageName: string;
    kind: "open" | "won" | "lost";
    count: number;
    percentage: number;
  }>;
  departmentWorkload: Array<{
    id: string;
    name: string;
    assignedName: string;
    assignedEmail: string;
    badgeColor: string;
    activeLeads: number;
  }>;
}

function getRangeDates(range: DateRange): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "7d":
      start.setDate(end.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case "30d":
      start.setDate(end.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setDate(end.getDate() - 7);
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

export async function getAnalyticsSummary(
  organizationId: string,
  range: DateRange = "7d"
): Promise<AnalyticsSummary> {
  const db = getDb();
  const { start, end } = getRangeDates(range);

  // 1. Consultar mensajes en el período
  const messages = await db
    .select({
      id: schema.message.id,
      direction: schema.message.direction,
      aiGenerated: schema.message.aiGenerated,
      waTimestamp: schema.message.waTimestamp,
      createdAt: schema.message.createdAt,
    })
    .from(schema.message)
    .where(
      and(
        eq(schema.message.organizationId, organizationId),
        gte(schema.message.createdAt, start),
        lte(schema.message.createdAt, end)
      )
    );

  // 2. Consultar conversaciones activas
  const conversations = await db
    .select({
      id: schema.conversation.id,
      unreadCount: schema.conversation.unreadCount,
      handoffAt: schema.conversation.handoffAt,
      lastMessageAt: schema.conversation.lastMessageAt,
    })
    .from(schema.conversation)
    .where(
      and(
        eq(schema.conversation.organizationId, organizationId),
        eq(schema.conversation.isTest, false),
        gte(schema.conversation.lastMessageAt, start)
      )
    );

  // 3. Consultar leads y etapas de pipeline
  const stages = await db
    .select({
      id: schema.pipelineStage.id,
      name: schema.pipelineStage.name,
      kind: schema.pipelineStage.kind,
      position: schema.pipelineStage.position,
    })
    .from(schema.pipelineStage)
    .where(eq(schema.pipelineStage.organizationId, organizationId));

  const leads = await db
    .select({
      id: schema.lead.id,
      stageId: schema.lead.stageId,
    })
    .from(schema.lead)
    .where(eq(schema.lead.organizationId, organizationId));

  // 4. Consultar citas en el período
  const appointments = await db
    .select({
      id: schema.appointment.id,
      status: schema.appointment.status,
      scheduledAt: schema.appointment.scheduledAt,
    })
    .from(schema.appointment)
    .where(
      and(
        eq(schema.appointment.organizationId, organizationId),
        gte(schema.appointment.scheduledAt, start),
        lte(schema.appointment.scheduledAt, end)
      )
    );

  // Procesamiento de métricas
  const inboundMessages = messages.filter((m) => m.direction === "in").length;
  const outboundMessages = messages.filter((m) => m.direction === "out").length;
  const aiGeneratedMessages = messages.filter((m) => m.aiGenerated).length;
  const aiAutomationRate =
    outboundMessages > 0
      ? Math.round((aiGeneratedMessages / outboundMessages) * 100)
      : 0;

  const totalLeads = leads.length;
  const wonStageIds = new Set(stages.filter((s) => s.kind === "won").map((s) => s.id));
  const wonLeads = leads.filter((l) => wonStageIds.has(l.stageId)).length;
  const conversionRate =
    totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter(
    (a) => a.status === "completed"
  ).length;

  const unreadConversations = conversations.filter(
    (c) => c.unreadCount > 0
  ).length;

  // Distribución horaria (0 a 23)
  const hourlyMap: Record<number, { inbound: number; outbound: number }> = {};
  for (let i = 0; i < 24; i++) {
    hourlyMap[i] = { inbound: 0, outbound: 0 };
  }

  // Distribución por día de semana (1=Lun .. 7=Dom)
  const weekdayMap: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
  };

  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  for (const msg of messages) {
    const d = msg.waTimestamp ?? msg.createdAt;
    const h = d.getHours();
    if (hourlyMap[h]) {
      if (msg.direction === "in") hourlyMap[h].inbound++;
      else hourlyMap[h].outbound++;
    }

    // day 0 = Dom, 1 = Lun ... 6 = Sab
    const rawDow = d.getDay();
    const dow = rawDow === 0 ? 7 : rawDow;
    if (weekdayMap[dow] !== undefined) {
      weekdayMap[dow]++;
    }
  }

  const hourlyActivity = Object.entries(hourlyMap).map(([hourStr, counts]) => {
    const hNum = Number(hourStr);
    const label = `${String(hNum).padStart(2, "0")}:00`;
    return {
      hour: String(hNum).padStart(2, "0"),
      label,
      inbound: counts.inbound,
      outbound: counts.outbound,
      total: counts.inbound + counts.outbound,
    };
  });

  let peakHour = { hour: "10:00", total: 0 };
  for (const ha of hourlyActivity) {
    if (ha.total > peakHour.total) {
      peakHour = { hour: ha.label, total: ha.total };
    }
  }

  const weekdayActivity = [1, 2, 3, 4, 5, 6, 7].map((dow) => ({
    day: dayNames[dow - 1] || "Día",
    dayNum: dow,
    total: weekdayMap[dow] || 0,
  }));

  // Desglose del Pipeline
  const stageCountMap: Record<string, number> = {};
  for (const l of leads) {
    stageCountMap[l.stageId] = (stageCountMap[l.stageId] || 0) + 1;
  }

  const sortedStages = [...stages].sort((a, b) => a.position - b.position);
  const pipelineBreakdown = sortedStages.map((s) => {
    const count = stageCountMap[s.id] || 0;
    const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
    return {
      stageId: s.id,
      stageName: s.name,
      kind: s.kind as "open" | "won" | "lost",
      count,
      percentage,
    };
  });

  // Carga por departamento
  const stageMap = new Map(stages.map((s) => [s.id, s.name]));
  const departmentWorkload = DEPARTMENTS.map((dept) => {
    const activeLeads = leads.filter((l) => {
      const stageName = stageMap.get(l.stageId);
      if (!stageName) return false;
      const d = getDepartmentByStageName(stageName, DEPARTMENTS);
      return d?.id === dept.id;
    }).length;

    return {
      id: dept.id,
      name: dept.name,
      assignedName: dept.assignedName,
      assignedEmail: dept.assignedEmail,
      badgeColor: dept.badgeColor,
      activeLeads,
    };
  });

  return {
    range,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    kpis: {
      totalConversations: conversations.length,
      inboundMessages,
      outboundMessages,
      totalMessages: messages.length,
      aiGeneratedMessages,
      aiAutomationRate,
      totalLeads,
      wonLeads,
      conversionRate,
      totalAppointments,
      completedAppointments,
      unreadConversations,
    },
    hourlyActivity,
    peakHour,
    weekdayActivity,
    pipelineBreakdown,
    departmentWorkload,
  };
}

/**
 * Genera un archivo CSV tabulado con las métricas del período.
 */
export function generateReportsCsv(summary: AnalyticsSummary): string {
  const lines: string[] = [];

  lines.push("REPORTE DE METRICAS Y RENDIMIENTO - CRM TOI");
  lines.push(`Periodo: ${summary.range} (${summary.startDate.split("T")[0]} a ${summary.endDate.split("T")[0]})`);
  lines.push("");

  lines.push("INDICADORES CLAVE (KPIS)");
  lines.push(`Conversaciones Activas,${summary.kpis.totalConversations}`);
  lines.push(`Mensajes Entrantes (Leads),${summary.kpis.inboundMessages}`);
  lines.push(`Mensajes Salientes (Agentes + IA),${summary.kpis.outboundMessages}`);
  lines.push(`Total Mensajes,${summary.kpis.totalMessages}`);
  lines.push(`Mensajes Automatizados por IA,${summary.kpis.aiGeneratedMessages}`);
  lines.push(`Tasa de Automatizacion IA,${summary.kpis.aiAutomationRate}%`);
  lines.push(`Total Leads en Pipeline,${summary.kpis.totalLeads}`);
  lines.push(`Clientes Ganados,${summary.kpis.wonLeads}`);
  lines.push(`Tasa de Conversion Comercial,${summary.kpis.conversionRate}%`);
  lines.push(`Total Citas Agendadas,${summary.kpis.totalAppointments}`);
  lines.push(`Citas Completadas,${summary.kpis.completedAppointments}`);
  lines.push("");

  lines.push("ACTIVIDAD POR DIA DE LA SEMANA");
  lines.push("Dia,Total Mensajes");
  for (const d of summary.weekdayActivity) {
    lines.push(`${d.day},${d.total}`);
  }
  lines.push("");

  lines.push("DISTRIBUCION POR ETAPA DEL PIPELINE");
  lines.push("Etapa,Tipo,Cantidad de Leads,Porcentaje");
  for (const p of summary.pipelineBreakdown) {
    lines.push(`"${p.stageName}",${p.kind},${p.count},${p.percentage}%`);
  }
  lines.push("");

  lines.push("CARGA POR DEPARTAMENTO");
  lines.push("Departamento,Titular,Email,Leads Activos");
  for (const d of summary.departmentWorkload) {
    lines.push(`"${d.name}","${d.assignedName}","${d.assignedEmail}",${d.activeLeads}`);
  }

  return lines.join("\n");
}
