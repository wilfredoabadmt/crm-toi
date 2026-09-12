/**
 * Configuración y utilidades de departamentos para el CRM y el Agente IA.
 *
 * Mapea los 4 departamentos oficiales de la empresa con sus responsables físicos:
 * - Gerencia: Wilfredo Abad
 * - Departamento administrativo: Janneth
 * - Departamento técnico: Alvaro
 * - Departamento comercial: Andrea
 */

export interface DepartmentConfig {
  id: string;
  name: string;
  shortName: string;
  assignedName: string; // Responsable principal
  assignedEmail: string; // Correo del responsable principal
  memberEmails?: string[]; // Todos los correos de miembros habilitados en este departamento
  members?: { name: string; email: string }[];
  badgeColor: string;
  icon: "building" | "credit-card" | "wrench" | "shopping-bag";
  description: string;
  keywords: string[];
}

export const DEPARTMENTS: DepartmentConfig[] = [
  {
    id: "tecnico",
    name: "Departamento técnico",
    shortName: "Técnico",
    assignedName: "Alvaro",
    assignedEmail: "amamani@toi.bo",
    memberEmails: ["amamani@toi.bo"],
    badgeColor: "#0ea5e9", // Sky blue
    icon: "wrench",
    description: "Soporte técnico, cortes de fibra, caídas de servicio, lentitud, routers y averías.",
    keywords: [
      "soporte",
      "tecnico",
      "técnico",
      "falla",
      "fallas",
      "corte",
      "sin internet",
      "lento",
      "lentitud",
      "router",
      "fibra",
      "caída",
      "avería",
      "problema técnico",
    ],
  },
  {
    id: "administrativo",
    name: "Departamento administrativo",
    shortName: "Administrativo",
    assignedName: "Janneth",
    assignedEmail: "jmamani@toi.bo",
    memberEmails: ["jmamani@toi.bo"],
    badgeColor: "#f59e0b", // Amber
    icon: "credit-card",
    description: "Cobranzas, facturación, estados de cuenta, prórrogas, comprobantes y pagos.",
    keywords: [
      "cobranza",
      "cobranzas",
      "factura",
      "facturas",
      "pago",
      "pagos",
      "deuda",
      "cuota",
      "comprobante",
      "prórroga",
      "cuenta",
      "recibo",
      "banco",
      "qr",
    ],
  },
  {
    id: "comercial",
    name: "Departamento comercial",
    shortName: "Comercial",
    assignedName: "Andrea",
    assignedEmail: "soyingridandrea@gmail.com",
    memberEmails: ["soyingridandrea@gmail.com", "soyalejandrito2024@gmail.com"],
    badgeColor: "#10b981", // Emerald
    icon: "shopping-bag",
    description: "Ventas, nuevos planes de internet, contrataciones, cotizaciones y promociones.",
    keywords: [
      "ventas",
      "venta",
      "comercial",
      "nuevo plan",
      "planes",
      "contratar",
      "cotización",
      "precio",
      "promoción",
      "costo",
      "instalación nueva",
      "requisitos",
    ],
  },
  {
    id: "gerencia",
    name: "Gerencia",
    shortName: "Gerencia",
    assignedName: "Wilfredo Abad",
    assignedEmail: "wilfredoabad@gmail.com",
    memberEmails: ["wilfredoabad@gmail.com"],
    badgeColor: "#8b5cf6", // Purple
    icon: "building",
    description: "Reclamos formales graves, alianzas institucionales, dirección y gerencia general.",
    keywords: [
      "gerencia",
      "director",
      "propietario",
      "dueño",
      "reclamo formal",
      "queja grave",
      "alianza",
      "institucional",
    ],
  },
];

/**
 * Determina si un usuario pertenece a un departamento específico
 * (ya sea como responsable principal o como miembro de apoyo del área).
 */
export function isUserInDepartment(
  userEmail: string | null | undefined,
  department: DepartmentConfig
): boolean {
  if (!userEmail) return false;
  const lower = userEmail.trim().toLowerCase();
  if (department.assignedEmail?.trim().toLowerCase() === lower) {
    return true;
  }
  if (department.memberEmails && Array.isArray(department.memberEmails)) {
    return department.memberEmails.some((e) => e.trim().toLowerCase() === lower);
  }
  return false;
}

export const RECOMMENDED_DEPARTMENT_STAGES: Record<
  string,
  { name: string; kind: "open" | "won" | "lost" }[]
> = {
  comercial: [
    { name: "Nuevo Prospecto", kind: "open" },
    { name: "Validación Cobertura", kind: "open" },
    { name: "Plan Cotizado", kind: "open" },
    { name: "Instalación Programada", kind: "open" },
    { name: "Cliente Activo", kind: "won" },
    { name: "Venta Perdida", kind: "lost" },
  ],
  tecnico: [
    { name: "Reporte Recibido", kind: "open" },
    { name: "Diagnóstico Remoto", kind: "open" },
    { name: "Visita en Terreno", kind: "open" },
    { name: "Caso Resuelto", kind: "won" },
    { name: "Escalado a Red", kind: "lost" },
  ],
  administrativo: [
    { name: "Factura Emitida", kind: "open" },
    { name: "Recordatorio Enviado", kind: "open" },
    { name: "Comprobante por Verificar", kind: "open" },
    { name: "Al Día", kind: "won" },
    { name: "Corte por Mora", kind: "lost" },
  ],
  gerencia: [
    { name: "Caso Recibido", kind: "open" },
    { name: "En Análisis", kind: "open" },
    { name: "Propuesta / Acuerdo", kind: "open" },
    { name: "Cerrado Concluido", kind: "won" },
  ],
};

/**
 * Resuelve el identificador de departamento para una etapa dada.
 */
export function resolveDepartmentIdForStage(stage: {
  name: string;
  departmentId?: string | null;
}): string {
  if (stage.departmentId) return stage.departmentId;
  const lower = stage.name.trim().toLowerCase();

  // 1. Revisar si coincide con alguna etapa recomendada
  for (const [depId, stagesList] of Object.entries(RECOMMENDED_DEPARTMENT_STAGES)) {
    if (stagesList.some((s) => s.name.toLowerCase() === lower)) {
      return depId;
    }
  }

  // 2. Revisar palabras clave específicas
  if (
    lower.includes("tecnico") ||
    lower.includes("técnico") ||
    lower.includes("soporte") ||
    lower.includes("avería") ||
    lower.includes("falla") ||
    lower.includes("diagnóstico") ||
    lower.includes("terreno") ||
    lower.includes("fibra") ||
    lower.includes("router") ||
    (lower.includes("corte") && !lower.includes("mora"))
  ) {
    return "tecnico";
  }
  if (
    lower.includes("administrativo") ||
    lower.includes("cobranza") ||
    lower.includes("factura") ||
    lower.includes("pago") ||
    lower.includes("mora") ||
    lower.includes("comprobante")
  ) {
    return "administrativo";
  }
  if (
    lower.includes("gerencia") ||
    lower.includes("director") ||
    lower.includes("ejecutivo")
  ) {
    return "gerencia";
  }
  return "comercial";
}

/**
 * Encuentra el departamento asociado al nombre de etapa del pipeline.
 */
export function getDepartmentByStageName(
  stageName: string | null | undefined,
  departments: DepartmentConfig[] = DEPARTMENTS,
  departmentId?: string | null
): DepartmentConfig | null {
  if (departmentId) {
    const found = departments.find((d) => d.id === departmentId);
    if (found) return found;
  }
  if (!stageName) return null;
  const lower = stageName.trim().toLowerCase();

  for (const dep of departments) {
    if (
      dep.name.toLowerCase() === lower ||
      dep.shortName.toLowerCase() === lower ||
      lower.includes(dep.id) ||
      lower.includes(dep.shortName.toLowerCase())
    ) {
      return dep;
    }
  }

  // Buscar coincidencia en las etapas recomendadas de cada departamento
  for (const [depId, stagesList] of Object.entries(RECOMMENDED_DEPARTMENT_STAGES)) {
    if (stagesList.some((s) => s.name.toLowerCase() === lower)) {
      return departments.find((d) => d.id === depId) ?? null;
    }
  }

  return null;
}

/**
 * Genera la directiva de sistema para el agente de IA con las reglas de derivación.
 */
export function buildDepartmentRoutingPrompt(
  departments: DepartmentConfig[] = DEPARTMENTS
): string {
  const tecnico = departments.find((d) => d.id === "tecnico") ?? DEPARTMENTS[0]!;
  const admin = departments.find((d) => d.id === "administrativo") ?? DEPARTMENTS[1]!;
  const comercial = departments.find((d) => d.id === "comercial") ?? DEPARTMENTS[2]!;
  const gerencia = departments.find((d) => d.id === "gerencia") ?? DEPARTMENTS[3]!;

  return [
    "REGLAS DE DERIVACIÓN INMEDIATA POR DEPARTAMENTO:",
    "Cuando un cliente manifieste su necesidad, clasifícalo en el departamento correspondiente:",
    `- Falla técnica, corte de internet, lentitud, router o avería → Mueve a etapa: 'Departamento técnico'. Despídete amablemente: 'He transferido tu reporte al Departamento Técnico. ${tecnico.assignedName} de nuestro equipo ya lo tiene en pantalla y te responderá por aquí.' y ejecuta handoff.`,
    `- Facturación, pagos, comprobantes, prórrogas o cobranzas → Mueve a etapa: 'Departamento administrativo'. Despídete: 'He transferido tu solicitud al Departamento Administrativo. ${admin.assignedName} revisará tu estado de cuenta y continuará tu atención.' y ejecuta handoff.`,
    `- Nuevos planes, contratación de servicio, precios o cotizaciones → Mueve a etapa: 'Departamento comercial'. Despídete: 'Excelente. He derivado tu consulta al Departamento Comercial. ${comercial.assignedName} te atenderá para coordinar tu servicio.' y ejecuta handoff.`,
    `- Reclamos formales graves, alianzas o asuntos ejecutivos → Mueve a etapa: 'Gerencia'. Despídete: 'He canalizado tu caso a la Gerencia con ${gerencia.assignedName} para su atención directa.' y ejecuta handoff.`,
  ].join("\n");
}
