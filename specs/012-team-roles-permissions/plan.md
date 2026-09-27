# Plan Técnico: Gestión de Roles y Permisos por Secciones (RBAC Granular)

## 1. Stack y Modelo de Datos

- **Base de Datos**: PostgreSQL + Drizzle ORM.
- **Modificación de Tabla `member` (`src/lib/db/schema.ts`)**:
  - Añadir columna `permissions: jsonb("permissions").$type<string[]>()`.
  - Migración idempotente: `drizzle/0012_member_permissions.sql`.
  - Registro en `drizzle/meta/_journal.json`.

---

## 2. Definición Centralizada de Permisos (`src/lib/permissions.ts`)

Crear un módulo TypeScript reutilizable tanto en cliente como en servidor:
```typescript
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
}

export const ALL_SECTIONS: SectionDefinition[] = [
  { key: "dashboard", label: "Dashboard", description: "Métricas generales y analítica", href: "/dashboard" },
  { key: "inbox", label: "Bandeja de entrada", description: "Mensajes y chats de WhatsApp", href: "/inbox" },
  { key: "pipeline", label: "Pipeline de ventas", description: "Embudo comercial y etapas de leads", href: "/pipeline" },
  { key: "appointments", label: "Agenda de citas", description: "Instalaciones y visitas técnicas", href: "/appointments" },
  { key: "campaigns", label: "Campañas WhatsApp", description: "Envíos masivos y plantillas", href: "/campaigns" },
  { key: "contacts", label: "Contactos", description: "Directorio de clientes y etiquetas", href: "/contacts" },
  { key: "todos", label: "Tareas", description: "Gestión de tareas y pendientes", href: "/todos" },
  { key: "coverage", label: "Cobertura NAP", description: "Factibilidad de fibra y mapas", href: "/coverage" },
  { key: "agent", label: "Agente IA", description: "Comportamiento del bot y conocimiento", href: "/agent" },
  { key: "lab", label: "Laboratorio IA", description: "Simulación y optimización del agente", href: "/lab" },
  { key: "settings", label: "Configuración", description: "Ajustes de perfil, respuestas y áreas", href: "/settings" },
];

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
```

---

## 3. Endpoints de API

1. **`GET /api/settings/team`**:
   - Devuelve la lista de miembros incluyendo `role` y `permissions: string[]`.
2. **`PATCH /api/settings/team`** (o `PUT /api/settings/team/permissions`):
   - Solo permitido para rol `owner`.
   - Body: `{ memberId: string, role?: string, permissions: SectionKey[] }`.
   - No permite degradar al propietario original ni despojarlo de permisos.
   - Actualiza `schema.member.role` y `schema.member.permissions`.
3. **Actualización de Sesión (`src/lib/auth/session.ts`)**:
   - Extender `SessionContext` para incluir `permissions: SectionKey[]`.
   - Si `role === "owner"`, tiene acceso a todas las secciones automáticamente.

---

## 4. Adaptación de la Interfaz

1. **Modal / Panel de Permisos en `src/components/settings/team-client.tsx`**:
   - Botón *"Permisos y Rol"* en cada fila de miembro.
   - Selector de Rol (`owner`, `admin`, `member`).
   - Checkboxes dinámicos por cada sección con descripción.
   - Botones rápidos: *"Seleccionar todo"*, *"Atención al cliente"*, *"Técnico / Instalador"*.
2. **Filtrado en `AppNav` (`src/components/app-nav.tsx`)**:
   - Recibir `permissions: string[]`.
   - Ocultar del menú lateral las opciones que no estén en `permissions` (a menos que el usuario sea `owner`).
3. **Protección en Server Components**:
   - En las páginas protegidas (`/agent`, `/campaigns`, etc.), si el usuario no tiene la sección en sus permisos, redirigir a `/inbox`.
