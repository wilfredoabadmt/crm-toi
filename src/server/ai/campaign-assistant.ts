import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { chatJson, type ChatMessage } from "@/lib/ai";
import { calculateAudience } from "@/server/campaigns/campaigns";
import { getResolvedDepartments } from "@/server/departments";

export const CampaignAiAction = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("reply"),
    text: z.string().min(1),
    suggestions: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal("campaign_draft"),
    text: z.string().min(1),
    name: z.string().min(1),
    templateId: z.string().min(1),
    templateName: z.string().min(1),
    variableValues: z.record(z.string(), z.string()).optional(),
    mediaUrl: z.string().nullable().optional(),
    mediaType: z.enum(["image", "video", "document"]).nullable().optional(),
    targetType: z.enum(["all_contacts", "pipeline_stages"]).default("all_contacts"),
    targetStageIds: z.array(z.string()).optional(),
    targetStageNames: z.array(z.string()).optional(),
    scheduledAt: z.string().nullable().optional(),
    departmentId: z.string().nullable().optional(),
    departmentName: z.string().nullable().optional(),
    phoneNumberId: z.string().nullable().optional(),
    estimatedAudience: z.number().int().nonnegative().optional(),
    suggestions: z.array(z.string()).optional(),
  }),
]);

export type CampaignAiActionType = z.infer<typeof CampaignAiAction>;

export interface ProcessCampaignTurnInput {
  organizationId: string;
  userRole: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export async function processCampaignAssistantTurn(
  input: ProcessCampaignTurnInput
): Promise<CampaignAiActionType> {
  const db = getDb();
  const { organizationId } = input;

  // 1. Obtener plantillas aprobadas
  const templates = await db
    .select({
      id: schema.template.id,
      name: schema.template.name,
      category: schema.template.category,
      language: schema.template.language,
      body: schema.template.body,
    })
    .from(schema.template)
    .where(
      and(
        scoped(schema.template.organizationId, organizationId),
        eq(schema.template.status, "approved")
      )
    );

  // 2. Obtener etapas del embudo comercial
  const stages = await db
    .select({
      id: schema.pipelineStage.id,
      name: schema.pipelineStage.name,
      kind: schema.pipelineStage.kind,
    })
    .from(schema.pipelineStage)
    .where(scoped(schema.pipelineStage.organizationId, organizationId))
    .orderBy(asc(schema.pipelineStage.order));

  // 3. Obtener departamentos con sus números de WhatsApp
  const departments = await getResolvedDepartments(organizationId);

  // 4. Conteo rápido de contactos totales
  const allContacts = await calculateAudience(organizationId, "all_contacts");
  const totalContactsCount = allContacts.length;

  const systemPrompt = `Eres el Asistente Experto en Creación y Control de Campañas Masivas de WhatsApp de Vocero CRM.
Tu rol es ayudar a administradores y operadores a crear, configurar, segmentar y programar campañas de WhatsApp oficiales de forma segura, profesional y fluida.

REGLAS ESTRICTAS DE OPERACIÓN:
1. SOLO se pueden usar plantillas APROBADAS por Meta. Si el usuario pide un mensaje libre o una plantilla inexistente, explícale con amabilidad qué plantillas aprobadas existen y sugiérele la más adecuada.
2. Cada plantilla contiene variables marcadas como {{1}}, {{2}}, etc. Debes solicitar o inferir valores lógicos para cada variable (ej. {{1}} = nombre del cliente o un saludo, {{2}} = porcentaje de descuento o fecha).
3. Si el usuario indica un segmento (ej: "los de cotización", "leads nuevos"), mapea ese segmento con las etapas del pipeline disponibles.
4. Si la empresa tiene múltiples departamentos con líneas de WhatsApp, ayuda a seleccionar la línea adecuada (ej. Ventas/Comercial para promociones, Cobranzas para pagos, Soporte para avisos técnicos).
5. Cuando tengas suficiente información (plantilla, audiencia o etapas, variables y fecha aproximada o envío inmediato), genera una acción de tipo "campaign_draft".
6. En "campaign_draft", calcula o incluye los datos exactos:
   - "name": nombre claro y descriptivo (ej: "Promo Fibra Óptica - Septiembre")
   - "templateId": ID exacto de la plantilla seleccionada
   - "templateName": nombre de la plantilla
   - "variableValues": objeto clave-valor con los valores de las variables (ej: {"1": "estimado cliente", "2": "50% de descuento"})
   - "targetType": "all_contacts" o "pipeline_stages"
   - "targetStageIds": arreglo con los IDs de las etapas si aplica
   - "targetStageNames": nombres legibles de las etapas seleccionadas
   - "departmentId": ID del departamento emisor (o null si es línea principal)
   - "departmentName": nombre legible del departamento
   - "phoneNumberId": ID del número de WhatsApp emisor si aplica
   - "scheduledAt": fecha ISO en el futuro (ej: "2026-09-28T09:00:00Z") o null si es para envío inmediato
   - "text": breve resumen explicativo del borrador preparado para que el usuario lo revise.
   - "suggestions": lista de 2 o 3 botones de acción rápida para el usuario (ej: "Enviar prueba a mi WhatsApp", "Cambiar horario", "Cambiar de departamento").
7. Si faltan datos clave o el usuario está explorando, responde con tipo "reply", explicando las opciones y ofreciendo sugerencias concisas en el campo "suggestions".

CATÁLOGO ACTUAL DE LA ORGANIZACIÓN:
- Total de contactos registrados en la base: ${totalContactsCount} contactos
- Plantillas aprobadas por Meta disponibles:
${
  templates.length > 0
    ? templates
        .map(
          (t) =>
            `  * ID: "${t.id}" | Nombre: "${t.name}" | Categoría: ${t.category} | Idioma: ${t.language}\n    Cuerpo: "${t.body}"`
        )
        .join("\n")
    : "  (No hay plantillas aprobadas aún. Informa al usuario que debe sincronizar o crear plantillas aprobadas)."
}

- Etapas del Embudo (Pipeline):
${
  stages.length > 0
    ? stages.map((s) => `  * ID: "${s.id}" | Nombre: "${s.name}" (${s.kind})`).join("\n")
    : "  (No hay etapas configuradas)"
}

- Departamentos y Líneas de WhatsApp:
${
  departments.length > 0
    ? departments
        .map(
          (d) =>
            `  * ID: "${d.id}" | Nombre: "${d.name}" | WhatsApp: ${
              d.displayPhoneNumber ? d.displayPhoneNumber : "Línea central"
            } (PhoneId: ${d.phoneNumberId ?? "central"})`
        )
        .join("\n")
    : "  (Línea central única)"
}
`;

  const chatMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...input.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const { getLlmCredentials } = await import("@/server/ai/credentials");
  const llmCreds = await getLlmCredentials(organizationId);

  const result = await chatJson(CampaignAiAction, chatMessages, {
    baseUrl: llmCreds.baseUrl,
    model: llmCreds.model,
    token: llmCreds.token ?? undefined,
  });

  if (!result.ok) {
    return {
      type: "reply",
      text:
        "Disculpa, tuve un inconveniente temporal consultando las opciones de campaña. ¿Deseas indicarme qué tipo de campaña buscas enviar?",
      suggestions: ["Ver plantillas disponibles", "Calcular contactos por etapa"],
    };
  }

  const action = result.data;

  // Si generó un borrador con etapas, calcular la audiencia real exacta
  if (action.type === "campaign_draft") {
    try {
      const calculated = await calculateAudience(
        organizationId,
        action.targetType,
        action.targetStageIds
      );
      action.estimatedAudience = calculated.length;
    } catch {
      action.estimatedAudience = action.targetType === "all_contacts" ? totalContactsCount : 0;
    }
  }

  return action;
}

