import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { sendText } from "@/server/inbox/send";

export interface ScheduleDayInput {
  dayOfWeek: number; // 1 = Lunes, 7 = Domingo
  isOpen: boolean;
  openTime1: string; // "HH:MM"
  closeTime1: string; // "HH:MM"
  openTime2?: string | null;
  closeTime2?: string | null;
}

export interface UpdateScheduleInput {
  timezone?: string;
  isEnabled?: boolean;
  outOfHoursAction?: "none" | "away_message" | "ai_takeover" | "both";
  awayMessage?: string;
  days?: ScheduleDayInput[];
}

const DEFAULT_DAYS: ScheduleDayInput[] = [
  { dayOfWeek: 1, isOpen: true, openTime1: "08:30", closeTime1: "12:30", openTime2: "14:30", closeTime2: "18:30" },
  { dayOfWeek: 2, isOpen: true, openTime1: "08:30", closeTime1: "12:30", openTime2: "14:30", closeTime2: "18:30" },
  { dayOfWeek: 3, isOpen: true, openTime1: "08:30", closeTime1: "12:30", openTime2: "14:30", closeTime2: "18:30" },
  { dayOfWeek: 4, isOpen: true, openTime1: "08:30", closeTime1: "12:30", openTime2: "14:30", closeTime2: "18:30" },
  { dayOfWeek: 5, isOpen: true, openTime1: "08:30", closeTime1: "12:30", openTime2: "14:30", closeTime2: "18:30" },
  { dayOfWeek: 6, isOpen: true, openTime1: "09:00", closeTime1: "13:00", openTime2: null, closeTime2: null },
  { dayOfWeek: 7, isOpen: false, openTime1: "09:00", closeTime1: "13:00", openTime2: null, closeTime2: null },
];

/**
 * Obtiene o inicializa la configuración de horarios para la organización.
 */
export async function getBusinessSchedule(organizationId: string) {
  const db = getDb();

  let sched = await db.query.businessSchedule?.findFirst({
    where: eq(schema.businessSchedule.organizationId, organizationId),
  });

  if (!sched) {
    const schedId = newId("businessSchedule");
    await db.insert(schema.businessSchedule).values({
      id: schedId,
      organizationId,
      timezone: "America/La_Paz",
      isEnabled: true,
      outOfHoursAction: "away_message",
      awayMessage:
        "¡Hola {{1}}! Gracias por comunicarte con nosotros. Nuestro horario de atención es de Lunes a Viernes de 8:30 a 18:30. En este momento el equipo se encuentra fuera de oficina, pero atenderemos tu solicitud a primera hora laboral.",
    });

    for (const d of DEFAULT_DAYS) {
      await db.insert(schema.businessScheduleDay).values({
        id: newId("businessScheduleDay"),
        scheduleId: schedId,
        dayOfWeek: d.dayOfWeek,
        isOpen: d.isOpen,
        openTime1: d.openTime1,
        closeTime1: d.closeTime1,
        openTime2: d.openTime2,
        closeTime2: d.closeTime2,
      });
    }

    sched = (await db
      .select()
      .from(schema.businessSchedule)
      .where(eq(schema.businessSchedule.id, schedId))
      .limit(1))[0];
  }

  if (!sched) {
    throw new Error("No se pudo obtener o inicializar el horario de atención");
  }

  const days = await db
    .select()
    .from(schema.businessScheduleDay)
    .where(eq(schema.businessScheduleDay.scheduleId, sched.id))
    .orderBy(asc(schema.businessScheduleDay.dayOfWeek));

  return { schedule: sched, days };
}

/**
 * Guarda y actualiza la configuración de horario y sus días.
 */
export async function updateBusinessSchedule(
  organizationId: string,
  input: UpdateScheduleInput
) {
  const db = getDb();
  const { schedule } = await getBusinessSchedule(organizationId);

  const updateFields: Partial<typeof schema.businessSchedule.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.timezone !== undefined) updateFields.timezone = input.timezone;
  if (input.isEnabled !== undefined) updateFields.isEnabled = input.isEnabled;
  if (input.outOfHoursAction !== undefined)
    updateFields.outOfHoursAction = input.outOfHoursAction;
  if (input.awayMessage !== undefined) updateFields.awayMessage = input.awayMessage;

  await db
    .update(schema.businessSchedule)
    .set(updateFields)
    .where(eq(schema.businessSchedule.id, schedule.id));

  if (input.days && Array.isArray(input.days)) {
    for (const d of input.days) {
      const existing = await db
        .select()
        .from(schema.businessScheduleDay)
        .where(
          and(
            eq(schema.businessScheduleDay.scheduleId, schedule.id),
            eq(schema.businessScheduleDay.dayOfWeek, d.dayOfWeek)
          )
        )
        .limit(1);

      if (existing[0]) {
        await db
          .update(schema.businessScheduleDay)
          .set({
            isOpen: d.isOpen,
            openTime1: d.openTime1,
            closeTime1: d.closeTime1,
            openTime2: d.openTime2 ?? null,
            closeTime2: d.closeTime2 ?? null,
          })
          .where(eq(schema.businessScheduleDay.id, existing[0].id));
      } else {
        await db.insert(schema.businessScheduleDay).values({
          id: newId("businessScheduleDay"),
          scheduleId: schedule.id,
          dayOfWeek: d.dayOfWeek,
          isOpen: d.isOpen,
          openTime1: d.openTime1,
          closeTime1: d.closeTime1,
          openTime2: d.openTime2 ?? null,
          closeTime2: d.closeTime2 ?? null,
        });
      }
    }
  }

  return getBusinessSchedule(organizationId);
}

/**
 * Obtiene el día de la semana (1 = Lun, 7 = Dom) y hora HH:MM según una zona horaria.
 */
function getLocalTimeInfo(date: Date, timezone: string) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

    const parts = formatter.formatToParts(date);
    let weekdayStr = "";
    let hourStr = "00";
    let minuteStr = "00";

    for (const p of parts) {
      if (p.type === "weekday") weekdayStr = p.value;
      if (p.type === "hour") hourStr = p.value;
      if (p.type === "minute") minuteStr = p.value;
    }

    const weekdayMap: Record<string, number> = {
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
      Sun: 7,
    };

    const dayOfWeek = weekdayMap[weekdayStr] || 1;
    // Si la hora es 24 (a veces pasa en Intl en medianoche), normalizar a 00
    if (hourStr === "24") hourStr = "00";
    const timeStr = `${hourStr.padStart(2, "0")}:${minuteStr.padStart(2, "0")}`;

    return { dayOfWeek, timeStr };
  } catch {
    // Fallback si timezone es inválido
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
    const timeStr = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    return { dayOfWeek, timeStr };
  }
}

/**
 * Comprueba si la empresa está actualmente abierta o cerrada.
 */
export async function checkBusinessHoursStatus(
  organizationId: string,
  referenceDate = new Date()
) {
  const { schedule, days } = await getBusinessSchedule(organizationId);

  if (!schedule.isEnabled) {
    return {
      isEnabled: false,
      isOpen: true,
      statusText: "Horario siempre disponible",
      timezone: schedule.timezone,
      currentLocalTime: "",
      nextOpening: null,
      awayMessage: schedule.awayMessage,
      outOfHoursAction: schedule.outOfHoursAction,
    };
  }

  const { dayOfWeek, timeStr } = getLocalTimeInfo(
    referenceDate,
    schedule.timezone
  );

  const currentDayConfig = days.find((d) => d.dayOfWeek === dayOfWeek);

  let isOpen = false;
  let statusText = "Cerrado fuera de horario";

  if (currentDayConfig && currentDayConfig.isOpen) {
    const inShift1 =
      timeStr >= currentDayConfig.openTime1 &&
      timeStr <= currentDayConfig.closeTime1;

    const inShift2 =
      currentDayConfig.openTime2 &&
      currentDayConfig.closeTime2 &&
      timeStr >= currentDayConfig.openTime2 &&
      timeStr <= currentDayConfig.closeTime2;

    if (inShift1 || inShift2) {
      isOpen = true;
      statusText = "Abierto en horario de atención";
    }
  }

  return {
    isEnabled: true,
    isOpen,
    statusText,
    timezone: schedule.timezone,
    currentLocalTime: timeStr,
    currentDayOfWeek: dayOfWeek,
    awayMessage: schedule.awayMessage,
    outOfHoursAction: schedule.outOfHoursAction,
  };
}

/**
 * Gestiona la lógica de mensajes entrantes fuera de horario.
 * Si corresponde, despacha el mensaje de ausencia respetando el límite de 24h.
 */
export async function handleOutOfHoursInbound(
  organizationId: string,
  conversation: typeof schema.conversation.$inferSelect,
  contact: typeof schema.contact.$inferSelect
): Promise<{ preventAi: boolean }> {
  try {
    const status = await checkBusinessHoursStatus(organizationId);

    // Si no está habilitado o estamos en horario comercial abierto, proceder con normalidad
    if (!status.isEnabled || status.isOpen) {
      return { preventAi: false };
    }

    const db = getDb();
    const outOfHoursAction = status.outOfHoursAction;

    // Si la acción incluye enviar mensaje de ausencia
    if (
      (outOfHoursAction === "away_message" || outOfHoursAction === "both") &&
      status.awayMessage
    ) {
      const lastAway = conversation.lastAwayMessageAt;
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Solo enviar si nunca se envió o si pasaron más de 24h
      if (!lastAway || lastAway < oneDayAgo) {
        const firstName = contact.name?.trim().split(" ")[0] || "amigo/a";
        const body = status.awayMessage.replace(/\{\{1\}\}/g, firstName);

        await sendText({
          conversationId: conversation.id,
          organizationId,
          text: body,
          aiGenerated: false,
        });

        await db
          .update(schema.conversation)
          .set({ lastAwayMessageAt: now })
          .where(eq(schema.conversation.id, conversation.id));
      }
    }

    // Si la acción es sólo mensaje de ausencia (sin IA), evitamos que la IA responda
    if (outOfHoursAction === "away_message") {
      return { preventAi: true };
    }

    return { preventAi: false };
  } catch (err) {
    console.error("[business-hours] Error procesando mensaje fuera de horario:", err);
    return { preventAi: false };
  }
}
