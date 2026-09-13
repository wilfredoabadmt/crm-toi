# Desglose de Tareas: Campañas y Recordatorios de WhatsApp

**Feature**: `003-campaigns-reminders` | **Fecha**: 2026-09-12  
**Estrategia**: Construcción vertical ordenada por dependencias estrictas (Fundación → Servicios → Endpoints → UI → Verificación).

---

## Fase 1: Fundación y Base de Datos (Infraestructura de Datos)

- [ ] **T001**: Definir tablas `campaign` y `campaignRecipient` en [`src/lib/db/schema.ts`](file:///f:/Documentos/GitHub/crm-toi-main/src/lib/db/schema.ts), agregando índices por organización y estado.
- [ ] **T002**: Registrar los prefijos `camp_` y `rcpt_` en el generador de IDs [`src/lib/db/ids.ts`](file:///f:/Documentos/GitHub/crm-toi-main/src/lib/db/ids.ts).
- [ ] **T003**: Generar y ejecutar la migración SQL de Drizzle para crear las tablas en la base de datos PostgreSQL.

---

## Fase 2: Lógica de Negocio y Servicios Backend

- [ ] **T004**: Crear [`src/server/campaigns/campaigns.ts`](file:///f:/Documentos/GitHub/crm-toi-main/src/server/campaigns/campaigns.ts) con funciones para:
  - Listar campañas por organización con métricas agregadas.
  - Calcular audiencia elegible filtrando por etapas del pipeline o todos los contactos.
  - Crear campaña en estado `draft`, `pending_approval` o `scheduled` según el rol del usuario.
  - Acciones de aprobación (`approveCampaign`) y cancelación (`cancelCampaign`).
- [ ] **T005**: Crear [`src/server/campaigns/dispatch.ts`](file:///f:/Documentos/GitHub/crm-toi-main/src/server/campaigns/dispatch.ts) con el motor de despacho:
  - Envío individual de plantilla con cabecera multimedia (imagen/video vía R2) y variables.
  - Lógica de rate-limiting (pausas entre mensajes) para protección antispam.
  - Actualización de contadores (`sentCount`, `failedCount`) en tiempo real.
- [ ] **T006**: Crear rutas API en Next.js:
  - `GET /api/campaigns` & `POST /api/campaigns` en [`src/app/api/campaigns/route.ts`](file:///f:/Documentos/GitHub/crm-toi-main/src/app/api/campaigns/route.ts).
  - `GET /api/campaigns/[id]`, `POST /api/campaigns/[id]/approve`, `POST /api/campaigns/[id]/cancel` en [`src/app/api/campaigns/[id]/route.ts`](file:///f:/Documentos/GitHub/crm-toi-main/src/app/api/campaigns/[id]/route.ts).
  - `POST /api/campaigns/test-send` en [`src/app/api/campaigns/test-send/route.ts`](file:///f:/Documentos/GitHub/crm-toi-main/src/app/api/campaigns/test-send/route.ts) para prueba individual.
  - `POST /api/campaigns/dispatch` en [`src/app/api/campaigns/dispatch/route.ts`](file:///f:/Documentos/GitHub/crm-toi-main/src/app/api/campaigns/dispatch/route.ts) para el procesador de campañas programadas.

---

## Fase 3: Frontend y Flujo de Trabajo en Pantalla

- [ ] **T007**: Agregar el ítem **Campañas** con icono `Megaphone` en la barra lateral [`src/components/app-nav.tsx`](file:///f:/Documentos/GitHub/crm-toi-main/src/components/app-nav.tsx).
- [ ] **T008**: Crear la página principal [`src/app/(app)/campaigns/page.tsx`](file:///f:/Documentos/GitHub/crm-toi-main/src/app/(app)/campaigns/page.tsx) y su cliente [`src/components/campaigns/campaigns-client.tsx`](file:///f:/Documentos/GitHub/crm-toi-main/src/components/campaigns/campaigns-client.tsx):
  - Tarjetas de resumen métrico (Total enviadas, programadas, tasa de entrega).
  - Pestañas para filtrar por estado (Todas, Programadas, Enviadas, Borradores).
  - Listado de tarjetas de campañas con barra de progreso, badges de estado y botones de acción (Aprobar, Cancelar, Ver Detalle).
- [ ] **T009**: Crear el asistente modal interactivo [`src/components/campaigns/campaign-wizard-modal.tsx`](file:///f:/Documentos/GitHub/crm-toi-main/src/components/campaigns/campaign-wizard-modal.tsx):
  - **Paso 1: Contenido y Plantilla:** Selector de plantilla de WhatsApp, subida de imagen/video a Cloudflare R2, campos de variables y previsualizador en móvil.
  - **Paso 2: Audiencia:** Selector múltiple de etapas del Pipeline o Todos los contactos, con cálculo instantáneo del número de destinatarios.
  - **Paso 3: Cronograma y Lanzamiento:** Input de prueba de WhatsApp con respuesta inmediata, selector de fecha y hora local para programar o botón de envío inmediato, con adaptación según rol (solicitar aprobación vs programar directo).

---

## Fase 4: Verificación y Validación de Calidad

- [ ] **T010**: Ejecutar chequeo de tipos (`npm run typecheck`) y linting (`npm run lint`).
- [ ] **T011**: Validar la compilación de producción de Next.js (`npm run build`).
- [ ] **T012**: Comprobar en el navegador el flujo completo: creación, previsualización con imagen/video, cálculo de audiencia, programación de fecha y visualización en el listado.
