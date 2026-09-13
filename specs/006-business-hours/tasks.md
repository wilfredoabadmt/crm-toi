# Tareas: Horarios de Atención (Business Hours)

## Fase 1: Base de Datos y Tipos
- [ ] 1.1 Registrar prefijos `bsched` y `bsday` en `src/lib/db/ids.ts`.
- [ ] 1.2 Agregar `businessSchedule` y `businessScheduleDay` a `src/lib/db/schema.ts`, y `lastAwayMessageAt` a `conversation`.
- [ ] 1.3 Crear migración `drizzle/0008_business_hours.sql` y registrar en `drizzle/meta/_journal.json`.

## Fase 2: Lógica de Negocio y Servicio
- [ ] 2.1 Implementar `src/server/business-hours/service.ts` con cálculo de franjas horarias, estado abierto/cerrado según zona horaria e inicialización por defecto.
- [ ] 2.2 Crear endpoint `src/app/api/business-hours/route.ts` (GET para consultar, PUT para actualizar).
- [ ] 2.3 Crear endpoint `src/app/api/business-hours/status/route.ts` (GET liviano para badge de estado).

## Fase 3: Interfaz de Usuario
- [ ] 3.1 Agregar pestaña en `src/components/settings/settings-nav.tsx`.
- [ ] 3.2 Crear `src/components/settings/business-hours-client.tsx` con cuadrícula de días Lunes-Domingo, switches, selectores de horas (continuo/dividido) y configurador de mensaje de ausencia.
- [ ] 3.3 Crear página de configuración `src/app/(app)/settings/business-hours/page.tsx`.
- [ ] 3.4 Crear componente badge `src/components/inbox/schedule-status-badge.tsx` e integrarlo en la barra del Inbox.

## Fase 4: Mensajes Entrantes y Protección Fuera de Horario
- [ ] 4.1 Integrar evaluación de horario en el flujo de recepción de mensajes entrantes para despacho de mensaje de ausencia con throttle de 24h.

## Fase 5: Validación y Despliegue
- [ ] 5.1 Ejecutar `npm run typecheck` para asegurar cero errores de tipos.
- [ ] 5.2 Commit de la rama `006-business-hours`.
- [ ] 5.3 Merge a `master` y push a GitHub.
- [ ] 5.4 Despliegue a producción vía Coolify y verificación de healthcheck.
