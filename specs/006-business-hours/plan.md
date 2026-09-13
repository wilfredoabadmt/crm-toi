# Plan Técnico: Módulo de Horarios de Atención (Business Hours)

## 1. Stack y Arquitectura
- **Framework**: Next.js 15 App Router + React 19 + TypeScript.
- **Base de Datos**: PostgreSQL con Drizzle ORM.
- **Zona Horaria**: Manejo con APIs nativas de `Intl.DateTimeFormat` (evitando dependencias pesadas).
- **Seguridad**: Multi-tenant estricto con `organizationId` obtenido de la sesión Better Auth.

---

## 2. Archivos a crear o modificar

### Base de Datos
- `src/lib/db/ids.ts`: Prefijos de ID `bsched`, `bsday`.
- `src/lib/db/schema.ts`: Tablas `business_schedule`, `business_schedule_day`, columna en `conversation`.
- `drizzle/0008_business_hours.sql`: Migración Drizzle.
- `drizzle/meta/_journal.json`: Registro de migración.

### Lógica de Servidor
- `src/server/business-hours/service.ts`:
  - `getScheduleWithDays(orgId)` (con inicialización automática de valores por defecto).
  - `saveScheduleWithDays(orgId, data)`.
  - `checkBusinessHoursStatus(orgId, now?)`: Retorna `{ isOpen, currentDay, nextOpening, timezone }`.
  - `processOutOfHoursInbound(orgId, conversation, contact)`: Evaluación y envío de mensaje de ausencia (con throttle 24h).

### Rutas API
- `src/app/api/business-hours/route.ts`: `GET` y `PUT`.
- `src/app/api/business-hours/status/route.ts`: `GET` rápido para el badge visual.

### Componentes de Interfaz
- `src/components/settings/settings-nav.tsx`: Enlace a `/settings/business-hours`.
- `src/app/(app)/settings/business-hours/page.tsx`: Server page.
- `src/components/settings/business-hours-client.tsx`: Editor visual interactivo semanal con switches, turnos y mensaje de ausencia.
- `src/components/inbox/schedule-status-badge.tsx`: Indicador visual de estado (Abierto 🟢 / Cerrado 🟡).
- `src/app/(app)/inbox/page.tsx` o `src/components/inbox/conversation-list.tsx`: Inclusión del badge de estado.
