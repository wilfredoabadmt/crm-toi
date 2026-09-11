import { describe, expect, it } from "vitest";
import {
  getSystemTimeContext,
  interpolateTimeVariables,
} from "@/server/ai/time";

describe("Contexto temporal del agente IA (time.ts)", () => {
  it("obtiene fecha y hora formateada en la zona horaria indicada", () => {
    // 2026-09-10T14:30:00Z -> en America/La_Paz (UTC-4) son las 10:30 del 10/09/2026 (Jueves)
    const testDate = new Date("2026-09-10T14:30:00Z");
    const ctx = getSystemTimeContext(testDate, "America/La_Paz");

    expect(ctx.timezone).toBe("America/La_Paz");
    expect(ctx.time24).toBe("10:30");
    expect(ctx.dayOfWeek.toLowerCase()).toContain("jueves");
    expect(ctx.dateStr).toContain("10/09/2026");
    expect(ctx.formattedDateTime).toContain("10:30");
  });

  it("reemplaza variables dinámicas {{hora}}, {{dia}}, {{fecha}} en prompts", () => {
    const testDate = new Date("2026-09-10T20:00:00Z"); // 16:00 en Bolivia
    const ctx = getSystemTimeContext(testDate, "America/La_Paz");

    const promptTemplate =
      "Hola, son las {{hora}} del día {{dia}}. Atendemos de 08:00 a 18:00.";
    const result = interpolateTimeVariables(promptTemplate, ctx);

    expect(result).toBe(
      `Hola, son las 16:00 del día ${ctx.dayOfWeek}. Atendemos de 08:00 a 18:00.`
    );
  });

  it("maneja zona horaria inválida usando fallback seguro sin romper", () => {
    const ctx = getSystemTimeContext(new Date(), "Zona/Inexistente");
    expect(ctx.timezone).toBe("America/La_Paz");
    expect(ctx.time24).toBeDefined();
  });

  it("buildAgentSystemPrompt incluye el contexto temporal en tiempo real", async () => {
    const { buildAgentSystemPrompt } = await import("@/server/ai/prompts");
    const fixedDate = new Date("2026-09-10T23:30:00Z"); // 19:30 en La Paz

    const prompt = buildAgentSystemPrompt({
      profile: {
        id: "agp_test",
        organizationId: "org_test",
        enabled: true,
        name: "Asistente Virtual",
        tone: "cálido",
        instructions: "Si te escriben fuera de 08:00 a 18:00 (hora actual: {{hora}}), avisa.",
        escalationRules: null,
        greeting: "Hola, buenas tardes",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      kb: [],
      stages: [{ name: "Nuevo" }],
      now: fixedDate,
      timezone: "America/La_Paz",
    });

    expect(prompt).toContain("[CONTEXTO TEMPORAL EN TIEMPO REAL]");
    expect(prompt).toContain("Hora actual (24h): 19:30");
    expect(prompt).toContain("America/La_Paz");
    expect(prompt).toContain("hora actual: 19:30");
  });
});

