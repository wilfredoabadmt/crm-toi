/**
 * Utilidades de fecha, hora y contexto temporal para el agente de IA.
 *
 * Permite que el LLM conozca la hora y fecha real del sistema en cada turno
 * para interpretar instrucciones de horario de atención, saludos temporales
 * (buenos días/noches) y reglas fuera de horario.
 */

export interface SystemTimeContext {
  formattedDateTime: string;
  dayOfWeek: string;
  time24: string;
  time12: string;
  dateStr: string;
  timezone: string;
}

export const DEFAULT_TIMEZONE = "America/La_Paz";

/**
 * Obtiene el contexto temporal formateado en español para la zona horaria del negocio.
 */
export function getSystemTimeContext(
  date: Date = new Date(),
  timezone: string = process.env.TIMEZONE || DEFAULT_TIMEZONE
): SystemTimeContext {
  const safeTimezone = isValidTimezone(timezone) ? timezone : DEFAULT_TIMEZONE;

  try {
    const dayOfWeekRaw = new Intl.DateTimeFormat("es-ES", {
      timeZone: safeTimezone,
      weekday: "long",
    }).format(date);
    const dayOfWeek = dayOfWeekRaw.charAt(0).toUpperCase() + dayOfWeekRaw.slice(1);

    const fullDate = new Intl.DateTimeFormat("es-ES", {
      timeZone: safeTimezone,
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);

    const time24 = new Intl.DateTimeFormat("es-ES", {
      timeZone: safeTimezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);

    const time12 = new Intl.DateTimeFormat("es-ES", {
      timeZone: safeTimezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);

    const numericDate = new Intl.DateTimeFormat("es-ES", {
      timeZone: safeTimezone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);

    return {
      formattedDateTime: `${dayOfWeek}, ${fullDate}, ${time24} (${time12})`,
      dayOfWeek,
      time24,
      time12,
      dateStr: numericDate,
      timezone: safeTimezone,
    };
  } catch {
    // Fallback de seguridad en caso de error inesperado con Intl
    return {
      formattedDateTime: date.toISOString(),
      dayOfWeek: "Hoy",
      time24: date.toISOString().slice(11, 16),
      time12: "",
      dateStr: date.toISOString().slice(0, 10),
      timezone: safeTimezone,
    };
  }
}

/**
 * Reemplaza variables tipo {{hora}}, {{hora_actual}}, {{dia_actual}}, etc. en textos de configuración.
 */
export function interpolateTimeVariables(
  text: string,
  timeCtx: SystemTimeContext
): string {
  if (!text) return text;
  return text
    .replace(/\{\{\s*(hora_actual|hora)\s*\}\}/gi, timeCtx.time24)
    .replace(/\{\{\s*(hora_12|hora_ampm)\s*\}\}/gi, timeCtx.time12)
    .replace(/\{\{\s*(dia_actual|dia|dia_semana)\s*\}\}/gi, timeCtx.dayOfWeek)
    .replace(/\{\{\s*(fecha_actual|fecha)\s*\}\}/gi, timeCtx.dateStr)
    .replace(
      /\{\{\s*(fecha_completa|fecha_hora)\s*\}\}/gi,
      timeCtx.formattedDateTime
    )
    .replace(/\{\{\s*zona_horaria\s*\}\}/gi, timeCtx.timezone);
}

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
