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
  assignedName: string;
  assignedEmail: string;
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
 * Encuentra el departamento asociado al nombre de etapa del pipeline.
 */
export function getDepartmentByStageName(stageName: string | null | undefined): DepartmentConfig | null {
  if (!stageName) return null;
  const lower = stageName.trim().toLowerCase();

  for (const dep of DEPARTMENTS) {
    if (
      dep.name.toLowerCase() === lower ||
      dep.shortName.toLowerCase() === lower ||
      lower.includes(dep.id) ||
      lower.includes(dep.shortName.toLowerCase())
    ) {
      return dep;
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
