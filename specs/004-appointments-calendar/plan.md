# Plan Técnico de Implementación: Agenda, Citas y Visitas Técnicas

**Feature**: `004-appointments-calendar`  
**Fecha**: 2026-09-12  

---

## 1. Arquitectura y Enfoque de Solución

1. **Persistencia (Drizzle ORM & Postgres 16):**
   - Incorporar la tabla `appointment` en `src/lib/db/schema.ts` vinculada a `organization`, `contact`, `lead` y `user`.
   - Generación de migración SQL sin romper ninguna tabla existente.
2. **Servicio y Capa de API (`/api/appointments`):**
   - `GET /api/appointments`: Consultar citas de la organización por rango de fechas (`start`, `end`), filtros de técnico o estado.
   - `POST /api/appointments`: Crear cita (humano o agente IA) con opción de disparo inmediato de plantilla WhatsApp de confirmación (`sendConfirmation`).
   - `PATCH /api/appointments/[id]`: Reprogramar o actualizar estado (ej. cambiar a `completed`, `confirmed` o `cancelled`).
   - `DELETE /api/appointments/[id]`: Cancelar cita con opción de aviso al cliente.
3. **Módulo de Confirmación WhatsApp:**
   - Reutilización directa de `sendTemplate` y `callGraphSend` (soporta imagen/video de R2 y variables de cliente, fecha, hora y técnico).
4. **Capacitación del Agente de Inteligencia Artificial (IA):**
   - Agregar acción `schedule_appointment` en `src/server/ai/actions.ts`.
   - Modificar `buildAgentSystemPrompt` en `src/server/ai/prompts.ts` para que el agente entienda cuándo agendar citas técnicas tras la factibilidad de cobertura.
5. **Frontend y UX (`src/app/(app)/appointments/page.tsx`):**
   - Nuevo ítem en `AppNav` con ícono `CalendarDays`.
   - Interfaz con dos modos de visualización: **Calendario** (con selector de mes/semana/día) y **Lista Operativa**.
   - Modal ergonómico para crear y editar citas con búsqueda de contactos y previsualización de datos.
