/**
 * Catálogo centralizado de secciones del CRM y gestión de permisos RBAC.
 */

export type SectionKey =
  | "dashboard"
  | "inbox"
  | "pipeline"
  | "appointments"
  | "campaigns"
  | "contacts"
  | "todos"
  | "coverage"
  | "agent"
  | "lab"
  | "settings";

export interface SectionDefinition {
  key: SectionKey;
  label: string;
  description: string;
  href: string;
  category: "operaciones" | "gestion" | "sistema";
}

export const ALL_SECTIONS: SectionDefinition[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Métricas generales y analítica de rendimiento",
    href: "/dashboard",
    category: "gestion",
  },
  {
    key: "inbox",
    label: "Bandeja de entrada",
    description: "Atención de chats y mensajes de WhatsApp",
    href: "/inbox",
    category: "operaciones",
  },
  {
    key: "pipeline",
    label: "Pipeline de ventas",
    description: "Embudo comercial y gestión de oportunidades",
    href: "/pipeline",
    category: "operaciones",
  },
  {
    key: "appointments",
    label: "Agenda de citas",
    description: "Visitas técnicas, instalaciones y servicios",
    href: "/appointments",
    category: "operaciones",
  },
  {
    key: "campaigns",
    label: "Campañas WhatsApp",
    description: "Difusiones masivas y plantillas oficiales",
    href: "/campaigns",
    category: "operaciones",
  },
  {
    key: "contacts",
    label: "Directorio de contactos",
    description: "Base de datos de clientes, teléfonos y etiquetas",
    href: "/contacts",
    category: "gestion",
  },
  {
    key: "todos",
    label: "Tareas y pendientes",
    description: "Lista de pendientes operativos y seguimiento",
    href: "/todos",
    category: "operaciones",
  },
  {
    key: "coverage",
    label: "Cobertura NAP",
    description: "Verificación de factibilidad de fibra y cajas NAP",
    href: "/coverage",
    category: "operaciones",
  },
  {
    key: "agent",
    label: "Agente IA",
    description: "Configuración del bot, LLM y base de conocimiento",
    href: "/agent",
    category: "sistema",
  },
  {
    key: "lab",
    label: "Laboratorio IA",
    description: "Pruebas de simulación y ajuste de respuestas",
    href: "/lab",
    category: "sistema",
  },
  {
    key: "settings",
    label: "Configuración",
    description: "Ajustes de sucursales, horarios, respuestas y equipo",
    href: "/settings",
    category: "sistema",
  },
];

export const ALL_SECTION_KEYS: SectionKey[] = ALL_SECTIONS.map((s) => s.key);

export const DEFAULT_MEMBER_PERMISSIONS: SectionKey[] = [
  "inbox",
  "contacts",
  "todos",
];

export const DEFAULT_ADMIN_PERMISSIONS: SectionKey[] = [
  "dashboard",
  "inbox",
  "pipeline",
  "appointments",
  "contacts",
  "todos",
  "coverage",
  "settings",
];

/**
 * Determina si un usuario tiene acceso a una sección dada según su rol y permisos explícitos.
 */
export function hasSectionAccess(
  role: string,
  userPermissions: string[] | null | undefined,
  section: SectionKey
): boolean {
  if (role === "owner") return true;

  if (Array.isArray(userPermissions) && userPermissions.length > 0) {
    return userPermissions.includes(section);
  }

  // Fallback si no tiene permisos explícitos guardados
  if (role === "admin") {
    return DEFAULT_ADMIN_PERMISSIONS.includes(section);
  }

  return DEFAULT_MEMBER_PERMISSIONS.includes(section);
}

/**
 * Retorna la lista efectiva de permisos para un usuario.
 */
export function resolveEffectivePermissions(
  role: string,
  userPermissions: string[] | null | undefined
): SectionKey[] {
  if (role === "owner") {
    return [...ALL_SECTION_KEYS];
  }
  if (Array.isArray(userPermissions) && userPermissions.length > 0) {
    return userPermissions as SectionKey[];
  }
  if (role === "admin") {
    return [...DEFAULT_ADMIN_PERMISSIONS];
  }
  return [...DEFAULT_MEMBER_PERMISSIONS];
}
