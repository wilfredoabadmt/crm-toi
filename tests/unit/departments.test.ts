import { describe, expect, it } from "vitest";
import {
  DEPARTMENTS,
  getDepartmentByStageName,
  buildDepartmentRoutingPrompt,
} from "@/lib/departments";
import { resolveStage } from "@/server/ai/actions";

describe("Configuración y utilidades de Departamentos", () => {
  it("debe contener exactamente los 4 departamentos oficiales con sus asesores", () => {
    expect(DEPARTMENTS).toHaveLength(4);

    const ids = DEPARTMENTS.map((d) => d.id);
    expect(ids).toEqual(["tecnico", "administrativo", "comercial", "gerencia"]);

    const tecnico = DEPARTMENTS.find((d) => d.id === "tecnico")!;
    expect(tecnico.name).toBe("Departamento técnico");
    expect(tecnico.assignedName).toBe("Alvaro");
    expect(tecnico.assignedEmail).toBe("amamani@toi.bo");

    const admin = DEPARTMENTS.find((d) => d.id === "administrativo")!;
    expect(admin.name).toBe("Departamento administrativo");
    expect(admin.assignedName).toBe("Janneth");
    expect(admin.assignedEmail).toBe("jmamani@toi.bo");

    const comercial = DEPARTMENTS.find((d) => d.id === "comercial")!;
    expect(comercial.name).toBe("Departamento comercial");
    expect(comercial.assignedName).toBe("Andrea");
    expect(comercial.assignedEmail).toBe("soyingridandrea@gmail.com");

    const gerencia = DEPARTMENTS.find((d) => d.id === "gerencia")!;
    expect(gerencia.name).toBe("Gerencia");
    expect(gerencia.assignedName).toBe("Wilfredo Abad");
    expect(gerencia.assignedEmail).toBe("wilfredoabad@gmail.com");
  });

  it("getDepartmentByStageName debe identificar departamentos por nombre completo o corto", () => {
    expect(getDepartmentByStageName("Departamento técnico")?.id).toBe("tecnico");
    expect(getDepartmentByStageName("Técnico")?.id).toBe("tecnico");
    expect(getDepartmentByStageName("departamento tecnico")?.id).toBe("tecnico");

    expect(getDepartmentByStageName("Departamento administrativo")?.id).toBe("administrativo");
    expect(getDepartmentByStageName("Administrativo")?.id).toBe("administrativo");

    expect(getDepartmentByStageName("Departamento comercial")?.id).toBe("comercial");
    expect(getDepartmentByStageName("Comercial")?.id).toBe("comercial");

    expect(getDepartmentByStageName("Gerencia")?.id).toBe("gerencia");
    expect(getDepartmentByStageName("gerencia general")?.id).toBe("gerencia");

    expect(getDepartmentByStageName("Nuevo")).toBeNull();
    expect(getDepartmentByStageName(null)).toBeNull();
    expect(getDepartmentByStageName(undefined)).toBeNull();
  });

  it("buildDepartmentRoutingPrompt debe incluir instrucciones para los 4 asesores físicos", () => {
    const prompt = buildDepartmentRoutingPrompt();
    expect(prompt).toContain("Departamento técnico");
    expect(prompt).toContain("Alvaro");
    expect(prompt).toContain("Departamento administrativo");
    expect(prompt).toContain("Janneth");
    expect(prompt).toContain("Departamento comercial");
    expect(prompt).toContain("Andrea");
    expect(prompt).toContain("Gerencia");
    expect(prompt).toContain("Wilfredo Abad");
  });

  it("resolveStage debe resolver nombres de departamento de forma flexible", () => {
    const stages = [
      { id: "s1", name: "Nuevo" },
      { id: "s2", name: "Departamento técnico" },
      { id: "s3", name: "Departamento administrativo" },
      { id: "s4", name: "Departamento comercial" },
      { id: "s5", name: "Gerencia" },
    ];

    expect(resolveStage("Departamento técnico", stages)?.id).toBe("s2");
    expect(resolveStage("departamento técnico", stages)?.id).toBe("s2");
    expect(resolveStage("técnico", stages)?.id).toBe("s2");
    expect(resolveStage("comercial", stages)?.id).toBe("s4");
    expect(resolveStage("Gerencia", stages)?.id).toBe("s5");
    expect(resolveStage("Etapa inexistente", stages)).toBeNull();
  });

  it("buildDepartmentRoutingPrompt debe reflejar reasignaciones dinámicas de responsables", () => {
    const customDeps = DEPARTMENTS.map((d) => {
      if (d.id === "tecnico") {
        return { ...d, assignedName: "Carlos", assignedEmail: "carlos@toi.bo" };
      }
      return d;
    });

    const prompt = buildDepartmentRoutingPrompt(customDeps);
    expect(prompt).toContain("Carlos");
    expect(prompt).not.toContain("Alvaro");
    expect(prompt).toContain("Janneth");
    expect(prompt).toContain("Andrea");
    expect(prompt).toContain("Wilfredo Abad");
  });
});
