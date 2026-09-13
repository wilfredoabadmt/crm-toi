# Tareas de Implementación: Agenda y Citas

**Feature**: `004-appointments-calendar`  
**Estado**: Planificado  

---

## Tareas

- [ ] **T01 — Schema y Migración de Base de Datos**
  - Agregar tabla `appointment` y tipos de enum en `src/lib/db/schema.ts`.
  - Crear archivo de migración SQL en `drizzle/` para crear la tabla y sus índices org-first.

- [ ] **T02 — Servicio Backend y API de Citas (`src/server/appointments/`)**
  - Implementar funciones CRUD: `getAppointments`, `createAppointment`, `updateAppointment`, `deleteAppointment`.
  - Implementar función `sendAppointmentConfirmation` conectada a WhatsApp Cloud API (plantillas + multimedia R2).
  - Crear rutas API `/api/appointments` y `/api/appointments/[id]`.

- [ ] **T03 — Integración con el Agente Inteligente (IA)**
  - Añadir acción `schedule_appointment` a `src/server/ai/actions.ts`.
  - Enriquecer el prompt del agente en `src/server/ai/prompts.ts` para capturar intención de agendamiento y horarios.
  - Conectar la ejecución de la acción en `src/server/ai/pipeline.ts` para registrar la cita en la tabla `appointment`.

- [ ] **T04 — Frontend: Vista Principal y Calendario (`/appointments`)**
  - Agregar ruta de navegación `/appointments` con ícono `CalendarDays` en `AppNav`.
  - Construir vista con conmutador de **Calendario** (mes/semana/día) y **Lista**.
  - Tarjetas de resumen métrico: Citas de Hoy, Confirmadas, Pendientes, Visitas Técnicas.

- [ ] **T05 — Frontend: Modal de Creación y Edición de Citas**
  - Asistente con búsqueda de contacto/lead, selector de fecha, hora, duración, responsable y tipo.
  - Opción de confirmación inmediata por WhatsApp con selección de plantilla aprobada y subida de archivo/imagen.

- [ ] **T06 — Verificación, Typecheck y Validación**
  - Ejecutar `npm run typecheck`.
  - Validar flujo completo en local y preparar despliegue.
